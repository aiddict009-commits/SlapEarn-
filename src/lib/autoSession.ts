import { auth } from './firebase';
import { signInAnonymously, signInWithCustomToken, User as FirebaseUser } from 'firebase/auth';
import {
  getTelegramDisplayName,
  getTelegramInitData,
  getTelegramLoginWidgetPayload,
  getTelegramStartParam,
  getTelegramUnsafeUser,
  isTelegramEnvironment,
} from './telegramSdk';

/**
 * Formless session bootstrap for SlapEarn.
 *
 * There is no sign-up / login screen any more. Opening the app always lands the
 * player inside the game:
 *
 *   1. Inside Telegram  -> signed `initData` is verified by the API, which mints
 *                          a Firebase custom token for the Telegram account.
 *   2. Plain browser    -> anonymous Firebase session ("instant guest").
 *   3. No server creds  -> server-minted guest custom token.
 *   4. Nothing works    -> local-only session so the game is still playable.
 *
 * Steps are attempted in order and every failure degrades instead of blocking.
 */

export type SessionProvider = 'telegram' | 'telegram_widget' | 'guest' | 'local';

export interface SessionUser {
  uid: string;
  username: string;
  email: string;
  myReferralCode: string;
  handle?: string;
  avatarUrl?: string;
  country?: string;
  provider: SessionProvider;
  verified: boolean;
  telegramId?: string;
  startParam?: string | null;
}

export interface AutoSessionResult {
  mode: 'firebase' | 'local';
  user: SessionUser;
  warnings: string[];
}

const SESSION_PROFILE_KEY = 'slapearn_session_profile';
const GUEST_ID_KEY = 'slapearn_guest_id';
const REQUEST_TIMEOUT_MS = 12000;

export function readStoredSessionProfile(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.uid) return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

function writeStoredSessionProfile(user: SessionUser): void {
  try {
    localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(user));
  } catch {
    /* private mode — sessions simply won't be remembered */
  }
}

export function clearStoredSessionProfile(): void {
  try {
    localStorage.removeItem(SESSION_PROFILE_KEY);
  } catch {
    /* noop */
  }
}

function randomId(bytes = 16): string {
  try {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`.slice(0, bytes * 2);
  }
}

export function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing && existing.length >= 16) return existing;
    const created = randomId();
    localStorage.setItem(GUEST_ID_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

async function postJson<T = any>(url: string, body: Record<string, unknown>): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function currentIdToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}

function providerFromTelegramPayload(widget: boolean): SessionProvider {
  return widget ? 'telegram_widget' : 'telegram';
}

/** Local display identity taken from Telegram's *unsafe* payload (cosmetic only). */
function telegramDisplayFallback(): { username: string; handle?: string; avatarUrl?: string; telegramId?: string } {
  const user = getTelegramUnsafeUser();
  if (!user) return { username: `Slapper${randomId(2).toUpperCase()}` };
  const display = getTelegramDisplayName() || `Slapper${String(user.id).slice(-4)}`;
  return {
    username: display.slice(0, 24),
    handle: user.username,
    avatarUrl: user.photo_url,
    telegramId: user.id ? String(user.id) : undefined,
  };
}

function buildUser(params: {
  uid: string;
  username: string;
  provider: SessionProvider;
  verified: boolean;
  handle?: string;
  avatarUrl?: string;
  telegramId?: string;
  startParam?: string | null;
}): SessionUser {
  return {
    uid: params.uid,
    username: params.username,
    email: '',
    myReferralCode: `SLAP-${(params.username || 'SLAPPER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'SLAPPER'}`,
    handle: params.handle,
    avatarUrl: params.avatarUrl,
    country: 'Telegram 🌍',
    provider: params.provider,
    verified: params.verified,
    telegramId: params.telegramId,
    startParam: params.startParam ?? null,
  };
}

interface ServerSessionResponse {
  ok?: boolean;
  uid?: string;
  customToken?: string;
  isNewUser?: boolean;
  guestId?: string;
  error?: string;
  message?: string;
  warnings?: string[];
  profile?: {
    provider?: SessionProvider;
    username?: string;
    handle?: string;
    avatarUrl?: string;
    verified?: boolean;
    telegramId?: string;
    startParam?: string | null;
  };
}

/**
 * Telegram -> Firebase session (used both for the initial bootstrap and for
 * upgrading an anonymous browser session into the Telegram account).
 */
async function requestTelegramSession(idToken: string | null): Promise<ServerSessionResponse | null> {
  return postJson<ServerSessionResponse>('/api/auth/telegram', {
    initData: getTelegramInitData(),
    widget: getTelegramLoginWidgetPayload(),
    startParam: getTelegramStartParam(),
    idToken,
  });
}

function userFromServerSession(response: ServerSessionResponse, fallbackProvider: SessionProvider): SessionUser {
  const display = telegramDisplayFallback();
  const profile = response.profile || {};
  const username = profile.username || display.username;
  return buildUser({
    uid: response.uid!,
    username,
    provider: profile.provider || fallbackProvider,
    verified: profile.verified ?? false,
    handle: profile.handle ?? display.handle,
    avatarUrl: profile.avatarUrl ?? display.avatarUrl,
    telegramId: profile.telegramId ?? display.telegramId,
    startParam: profile.startParam ?? getTelegramStartParam(),
  });
}

/**
 * Runs once per app load. Always resolves — the game must open without a form.
 */
export async function bootstrapAutoSession(): Promise<AutoSessionResult> {
  const warnings: string[] = [];
  const inTelegram = isTelegramEnvironment();
  const loginWidgetPayload = getTelegramLoginWidgetPayload();
  const hasTelegramPayload = Boolean(getTelegramInitData()) || Boolean(loginWidgetPayload);

  // --- 1. Telegram identity -------------------------------------------------
  if (hasTelegramPayload) {
    const response = await requestTelegramSession(await currentIdToken());
    if (response?.ok && response.customToken && response.uid) {
      try {
        await signInWithCustomToken(auth, response.customToken);
        const user = userFromServerSession(response, providerFromTelegramPayload(Boolean(loginWidgetPayload)));
        writeStoredSessionProfile(user);
        return { mode: 'firebase', user, warnings: [...warnings, ...(response.warnings || [])] };
      } catch (err: any) {
        console.warn('[AutoSession] Telegram custom token sign-in failed:', err?.message || err);
        warnings.push('TELEGRAM_SIGN_IN_FAILED');
      }
    } else if (response && !response.ok && response.error) {
      console.warn('[AutoSession] Telegram verification rejected:', response.error, response.message);
      warnings.push(response.error);
    } else {
      // Server unreachable (or Admin credentials missing) — keep playing.
      warnings.push('TELEGRAM_SERVER_UNAVAILABLE');
    }

    // Degraded Telegram mode: keep the Telegram name/photo for display and fall
    // through to the guest session below.
    const display = telegramDisplayFallback();
    const guestResult = await bootstrapGuestSession(warnings);
    if (guestResult) {
      const user: SessionUser = {
        ...guestResult.user,
        username: display.username || guestResult.user.username,
        handle: display.handle || guestResult.user.handle,
        avatarUrl: display.avatarUrl,
        telegramId: display.telegramId,
        provider: guestResult.user.provider,
      };
      writeStoredSessionProfile(user);
      return { mode: guestResult.mode, user, warnings };
    }
  }

  // --- 2. Instant guest (plain browser) ------------------------------------
  const guestResult = await bootstrapGuestSession(warnings);
  if (guestResult) {
    writeStoredSessionProfile(guestResult.user);
    return { mode: guestResult.mode, user: guestResult.user, warnings };
  }

  // --- 3. Local-only session (nothing else worked) --------------------------
  const localId = getOrCreateGuestId();
  const username = telegramDisplayFallback().username || `Slapper${localId.slice(-4).toUpperCase()}`;
  const localUser = buildUser({
    uid: `local_${localId}`,
    username: inTelegram ? username : `Slapper${localId.slice(-4).toUpperCase()}`,
    provider: 'local',
    verified: false,
  });
  warnings.push('LOCAL_ONLY_SESSION');
  writeStoredSessionProfile(localUser);
  return { mode: 'local', user: localUser, warnings };
}

/**
 * Anonymous Firebase auth first (no server credentials needed), then a
 * server-signed guest token, then nothing.
 */
async function bootstrapGuestSession(warnings: string[]): Promise<AutoSessionResult | null> {
  // 2a. Anonymous Firebase session — the Firebase-managed guest account.
  try {
    const credential = await signInAnonymously(auth);
    const uid = credential.user.uid;
    const stored = readStoredSessionProfile();
    const username = stored?.username || `Slapper${uid.slice(-4).toUpperCase()}`;
    // Keep a degraded Telegram provider if we already carried it over
    const carriedProvider: SessionProvider =
      !stored || stored.provider === 'local' ? 'guest' : stored.provider;

    return {
      mode: 'firebase',
      user: buildUser({
        uid,
        username,
        provider: carriedProvider,
        verified: stored?.verified ?? false,
        handle: stored?.handle,
        avatarUrl: stored?.avatarUrl,
        telegramId: stored?.telegramId,
        startParam: getTelegramStartParam(),
      }),
      warnings,
    };
  } catch (err: any) {
    console.warn('[AutoSession] Anonymous sign-in unavailable:', err?.code || err?.message || err);
    warnings.push('ANONYMOUS_AUTH_UNAVAILABLE');
  }

  // 2b. Server-signed guest token (stable `guest_<id>` account per device).
  const guestId = getOrCreateGuestId();
  const response = await postJson<ServerSessionResponse>('/api/auth/guest-token', {
    guestId,
    idToken: await currentIdToken(),
  });

  if (response?.ok && response.customToken && response.uid) {
    try {
      await signInWithCustomToken(auth, response.customToken);
      if (response.guestId) {
        try {
          localStorage.setItem(GUEST_ID_KEY, response.guestId);
        } catch {
          /* noop */
        }
      }
      const display = telegramDisplayFallback();
      const user = buildUser({
        uid: response.uid,
        username: response.profile?.username || display.username,
        provider: 'guest',
        verified: true,
        handle: display.handle,
        avatarUrl: display.avatarUrl,
        telegramId: display.telegramId,
      });
      return { mode: 'firebase', user, warnings };
    } catch (err: any) {
      console.warn('[AutoSession] Guest custom token sign-in failed:', err?.message || err);
      warnings.push('GUEST_SIGN_IN_FAILED');
    }
  } else if (response && !response.ok) {
    warnings.push(response.error || 'GUEST_SESSION_UNAVAILABLE');
  }

  return null;
}

/**
 * Called when a Firebase session already exists but the player has opened the
 * app inside Telegram: links that account to the Telegram identity so progress
 * is not lost, and switches sessions when the Telegram account is already bound
 * elsewhere.
 */
export async function upgradeSessionToTelegram(currentUser: FirebaseUser): Promise<{
  status: 'linked' | 'switched' | 'skipped' | 'failed';
  user?: SessionUser;
  message?: string;
}> {
  if (!isTelegramEnvironment() && !getTelegramLoginWidgetPayload()) {
    return { status: 'skipped' };
  }

  const stored = readStoredSessionProfile();
  if (stored?.provider === 'telegram' || stored?.provider === 'telegram_widget') {
    return { status: 'skipped' }; // already a Telegram session
  }

  let idToken: string | null = null;
  try {
    idToken = await currentUser.getIdToken();
  } catch {
    idToken = null;
  }

  const response = await requestTelegramSession(idToken);
  if (!response?.ok || !response.customToken || !response.uid) {
    return { status: 'failed', message: response?.message || response?.error };
  }

  const user = userFromServerSession(response, providerFromTelegramPayload(Boolean(getTelegramLoginWidgetPayload())));
  writeStoredSessionProfile(user);

  if (response.uid === currentUser.uid) {
    return { status: 'linked', user };
  }

  try {
    await signInWithCustomToken(auth, response.customToken);
    return { status: 'switched', user };
  } catch (err: any) {
    console.warn('[AutoSession] Could not switch to the linked Telegram account:', err?.message || err);
    return { status: 'failed', message: err?.message };
  }
}
