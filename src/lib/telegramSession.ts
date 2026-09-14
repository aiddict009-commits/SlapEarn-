import crypto from 'crypto';
import {
  getAdminAuthInstance,
  getAdminDbInstance,
  hasAdminCredentials,
  AdminFieldValue,
  logSecurityIncident,
} from './serverFirebaseAdmin.js';
import {
  allowUnverifiedTelegramPayloads,
  deriveTelegramUsername,
  getTelegramBotToken,
  TelegramUserProfile,
  verifyTelegramInitData,
  verifyTelegramLoginWidget,
} from './telegramAuth.js';

/**
 * SERVER ONLY — turns a Telegram payload (Mini App initData or Login Widget
 * payload) into a real Firebase session, so the player never sees a sign-up or
 * login form.
 *
 * Result of a successful bootstrap:
 *   - the player is mapped to a stable Firebase uid
 *     (`telegram_links/{telegramId}` -> uid, falling back to `tg_<telegramId>`)
 *   - their `users/{uid}` profile document is created if it does not exist yet
 *   - a Firebase custom token is returned, which the client exchanges for an
 *     ID token with `signInWithCustomToken`
 *
 * The same idea powers anonymous "instant guest" play in a normal browser
 * (`createGuestSession`), so every entry point into SlapEarn is formless.
 */

const TELEGRAM_LINK_COLLECTION = 'telegram_links';

/**
 * Firebase Admin credentials are required to create users and sign sessions.
 * When they are missing we return a clean 503 so the client can fall back to an
 * anonymous/guest session instead of the process dying inside the Admin SDK.
 */
function missingCredentialsFailure(): SessionFailure {
  return {
    ok: false,
    status: 503,
    error: 'TOKEN_SIGNING_UNAVAILABLE',
    message:
      'Server is not configured with Firebase Admin credentials (set GOOGLE_APPLICATION_CREDENTIALS or run on Cloud Run/Functions).',
  };
}
const STARTER_COINS = 100;

export interface SessionProfilePayload {
  provider: 'telegram' | 'telegram_widget' | 'guest';
  telegramId?: string;
  username: string;
  handle?: string;
  avatarUrl?: string;
  verified: boolean;
  startParam?: string | null;
  languageCode?: string;
}

export interface SessionSuccess {
  ok: true;
  uid: string;
  customToken: string;
  isNewUser: boolean;
  profile: SessionProfilePayload;
  /** Soft warnings (unverified payload, degraded Firestore access...) */
  warnings: string[];
  /** Only returned by the guest flow, so the client can persist it locally */
  guestId?: string;
}

export interface SessionFailure {
  ok: false;
  status: number;
  error: string;
  message: string;
}

export type SessionResult = SessionSuccess | SessionFailure;

async function getVerifiedViewerUid(idToken?: string | null): Promise<string | null> {
  if (!idToken) return null;
  try {
    const decoded = await getAdminAuthInstance().verifyIdToken(idToken);
    return decoded?.uid || null;
  } catch {
    return null;
  }
}

async function mintCustomToken(uid: string, claims: Record<string, unknown>): Promise<string | null> {
  try {
    return await getAdminAuthInstance().createCustomToken(uid, claims);
  } catch (err: any) {
    console.error(
      '[SessionAuth] Could not mint a Firebase custom token:',
      err?.message || err,
      '| Ensure the API service runs with Firebase Admin credentials (Cloud Run service account or GOOGLE_APPLICATION_CREDENTIALS).'
    );
    return null;
  }
}

function slugifyForCode(value: string): string {
  return (value || 'SLAPPER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12) || 'SLAPPER';
}

async function doesUserDocumentExist(uid: string): Promise<boolean | null> {
  try {
    const snap = await getAdminDbInstance().collection('users').doc(uid).get();
    return snap.exists;
  } catch (err: any) {
    console.warn('[SessionAuth] Firestore unavailable, continuing without profile bootstrap:', err?.message || err);
    return null;
  }
}

/**
 * Creates `users/{uid}` for a brand new Telegram/guest player and refreshes the
 * (non-economy) Telegram display fields for returning players.
 */
async function ensureUserDocument(params: {
  uid: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  telegramId?: string;
  telegramUsername?: string;
  telegramVerified?: boolean;
  referralCode?: string | null;
}): Promise<void> {
  const adminDb = getAdminDbInstance();
  const userRef = adminDb.collection('users').doc(params.uid);
  const existingExists = await doesUserDocumentExist(params.uid);

  if (existingExists === null) return; // Firestore unreachable — client cache handles the rest

  const now = AdminFieldValue.serverTimestamp();

  if (existingExists) {
    const snap = await userRef.get().catch(() => null);
    const data = (snap?.data() || {}) as Record<string, any>;
    const update: Record<string, any> = {
      displayName: data.displayName || params.displayName,
      photoURL: params.photoUrl || data.photoURL || '',
      updatedAt: now,
    };
    if (!data.username) update.username = params.username;
    if (params.telegramId) {
      update.telegramId = params.telegramId;
      update.telegramUsername = params.telegramUsername || '';
      update.telegramVerified = Boolean(params.telegramVerified);
    }
    await userRef.set(update, { merge: true }).catch((err) =>
      console.warn('[SessionAuth] Could not refresh user document:', err?.message || err)
    );
    return;
  }

  const generatedMyCode = `SLAP-${slugifyForCode(params.username)}`;

  await userRef
    .set({
      uid: params.uid,
      email: '',
      displayName: params.displayName,
      username: params.username,
      photoURL: params.photoUrl || '',
      myReferralCode: generatedMyCode,
      referredByCode: params.referralCode || null,
      telegramId: params.telegramId || null,
      telegramUsername: params.telegramUsername || '',
      telegramVerified: Boolean(params.telegramVerified),
      country: 'Telegram 🌍',
      coins: STARTER_COINS,
      totalEarned: STARTER_COINS,
      xp: 0,
      level: 1,
      streak: 0,
      slapsToday: 70,
      maxSlapsPerDay: 100,
      bestCombo: 0,
      daysActive: 0,
      referrals: 0,
      adsWatchedToday: 0,
      totalAdsWatchedLifetime: 0,
      hasClaimedStarterPack: true,
      selectedHand: 'wooden',
      unlockedHands: ['wooden'],
      createdAt: now,
      updatedAt: now,
    })
    .catch((err) => console.warn('[SessionAuth] Could not create user document:', err?.message || err));
}

async function lookupLinkedUid(telegramId: string): Promise<string | null> {
  try {
    const snap = await getAdminDbInstance().collection(TELEGRAM_LINK_COLLECTION).doc(telegramId).get();
    if (snap.exists) {
      const uid = (snap.data() as any)?.uid;
      if (typeof uid === 'string' && uid.trim()) return uid.trim();
    }
  } catch (err: any) {
    console.warn('[SessionAuth] Telegram link lookup failed:', err?.message || err);
  }
  return null;
}

async function bindTelegramAccount(params: {
  telegramId: string;
  uid: string;
  profile: TelegramUserProfile;
  verified: boolean;
  languageCode?: string;
}): Promise<void> {
  try {
    await getAdminDbInstance()
      .collection(TELEGRAM_LINK_COLLECTION)
      .doc(params.telegramId)
      .set(
        {
          uid: params.uid,
          telegramId: params.telegramId,
          username: params.profile.username || '',
          firstName: params.profile.firstName || '',
          lastName: params.profile.lastName || '',
          photoUrl: params.profile.photoUrl || '',
          languageCode: params.languageCode || params.profile.languageCode || '',
          verified: params.verified,
          lastLoginAt: AdminFieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (err: any) {
    console.warn('[SessionAuth] Could not persist Telegram link:', err?.message || err);
  }
}

/**
 * Mini App / Login Widget -> Firebase session.
 */
export async function createTelegramSession(params: {
  initData?: string | null;
  widgetData?: Record<string, unknown> | null;
  idToken?: string | null;
  ip?: string;
}): Promise<SessionResult> {
  if (!hasAdminCredentials()) {
    console.warn('[SessionAuth] Firebase Admin credentials missing — Telegram sessions are unavailable, client will fall back to a guest session.');
    return missingCredentialsFailure();
  }

  const initData = (params.initData || '').trim();
  const widgetData = params.widgetData && Object.keys(params.widgetData).length > 0 ? params.widgetData : null;

  if (!initData && !widgetData) {
    return {
      ok: false,
      status: 400,
      error: 'MISSING_TELEGRAM_DATA',
      message: 'No Telegram initData or login payload was supplied.',
    };
  }

  const usingWidget = !initData && !!widgetData;
  const verification = usingWidget
    ? verifyTelegramLoginWidget(widgetData as Record<string, unknown>)
    : verifyTelegramInitData(initData);

  const warnings: string[] = [];
  let verified = verification.verified;
  let profile = verification.profile;

  if (!verified) {
    const softAllowed = allowUnverifiedTelegramPayloads();
    const hasToken = getTelegramBotToken() !== null;

    if (!softAllowed || (hasToken && verification.reason !== 'TELEGRAM_NOT_CONFIGURED')) {
      await logSecurityIncident({
        type: 'TELEGRAM_AUTH_REJECTED',
        severity: 'medium',
        details: `Telegram authentication rejected (${verification.reason}): ${verification.message || ''}`,
        ipAddress: params.ip,
        provider: usingWidget ? 'telegram_widget' : 'telegram_miniapp',
      });
      return {
        ok: false,
        status: 401,
        error: verification.reason || 'TELEGRAM_VERIFICATION_FAILED',
        message: verification.message || 'Telegram identity could not be verified.',
      };
    }

    // Soft mode: the bot token is missing, so we accept the (unsigned) identity
    // to keep the game playable while the bot is being set up.
    console.warn(
      '[SessionAuth] ⚠️  UNSIGNED Telegram identity accepted because TELEGRAM_BOT_TOKEN is not set.',
      'Add the BotFather token before going live.',
      `(${verification.reason})`
    );
    warnings.push('TELEGRAM_UNVERIFIED_MODE');
  }

  if (!profile) {
    return {
      ok: false,
      status: 401,
      error: 'MISSING_TELEGRAM_USER',
      message: 'Telegram payload did not include a user id.',
    };
  }

  const telegramId = profile.id;
  const viewerUid = await getVerifiedViewerUid(params.idToken);

  let uid = (await lookupLinkedUid(telegramId)) || '';
  let isNewUser = false;

  if (!uid) {
    // First time this Telegram account is seen: adopt the current session when
    // one exists (so a browser guest keeps their progress after opening the
    // Mini App), otherwise derive a deterministic Telegram uid.
    uid = viewerUid || `tg_${telegramId}`;
    isNewUser = true;
    await bindTelegramAccount({ telegramId, uid, profile, verified, languageCode: profile.languageCode });
  }

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() ||
    profile.username ||
    'Slapper';
  const username = deriveTelegramUsername(profile);
  const startParam = (verification.startParam || '').trim() || null;
  const referralCode = startParam ? startParam.toUpperCase().slice(0, 32) : null;

  await ensureUserDocument({
    uid,
    username,
    displayName,
    photoUrl: profile.photoUrl,
    telegramId,
    telegramUsername: profile.username,
    telegramVerified: verified,
    referralCode,
  });

  const customToken = await mintCustomToken(uid, {
    provider: usingWidget ? 'telegram_widget' : 'telegram',
    telegramId,
    telegramVerified: verified,
  });

  if (!customToken) {
    return {
      ok: false,
      status: 503,
      error: 'TOKEN_SIGNING_UNAVAILABLE',
      message: 'Server could not sign a Firebase session. Check Firebase Admin credentials.',
    };
  }

  // Security trail for account linking (read-only in the admin hub).
  await logSecurityIncident({
    type: 'TELEGRAM_AUTH_SUCCESS',
    severity: 'low',
    userId: uid,
    username,
    details: `Telegram ${usingWidget ? 'widget' : 'mini app'} login (verified: ${verified})`,
    ipAddress: params.ip,
    provider: 'telegram',
    metadata: { telegramId, isNewUser, adoptedSession: Boolean(viewerUid && isNewUser) },
  });

  return {
    ok: true,
    uid,
    customToken,
    isNewUser,
    profile: {
      provider: usingWidget ? 'telegram_widget' : 'telegram',
      telegramId,
      username,
      handle: profile.username,
      avatarUrl: profile.photoUrl,
      verified,
      startParam,
      languageCode: profile.languageCode,
    },
    warnings,
  };
}

const GUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Browser fallback: a formless "instant guest" account.
 * The client stores a random 32-char id locally, which becomes `guest_<id>`,
 * so the same device keeps the same account between visits.
 */
export async function createGuestSession(params: {
  guestId?: string | null;
  idToken?: string | null;
}): Promise<SessionResult> {
  if (!hasAdminCredentials()) {
    console.warn('[SessionAuth] Firebase Admin credentials missing — guest tokens are unavailable, client will fall back to an anonymous/local session.');
    return missingCredentialsFailure();
  }

  const viewerUid = await getVerifiedViewerUid(params.idToken);

  const providedId = (params.guestId || '').trim();
  const guestId = GUEST_ID_PATTERN.test(providedId) ? providedId : crypto.randomBytes(16).toString('hex');
  const uid = viewerUid || `guest_${guestId}`;
  const isNewUser = (await doesUserDocumentExist(uid)) === false;
  const username = `Slapper${guestId.slice(-4).toUpperCase()}`;

  if (!viewerUid) {
    await ensureUserDocument({ uid, username, displayName: username, referralCode: null });
  }

  const customToken = await mintCustomToken(uid, { provider: 'guest' });
  if (!customToken) {
    return {
      ok: false,
      status: 503,
      error: 'TOKEN_SIGNING_UNAVAILABLE',
      message: 'Server could not sign a Firebase session. Check Firebase Admin credentials.',
    };
  }

  return {
    ok: true,
    uid,
    customToken,
    isNewUser,
    profile: {
      provider: 'guest',
      username,
      verified: true,
    },
    warnings: viewerUid ? [] : ['GUEST_ACCOUNT'],
    guestId,
  };
}
