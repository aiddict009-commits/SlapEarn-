import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { calculateExternalUserSP } from './externalRewards';

// Safely read firebase config
function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Notice: Could not read firebase-applet-config.json via fs:', err);
  }
  return {
    projectId: 'slapearn',
    firestoreDatabaseId: '(default)',
  };
}

// Lazy init Firebase Admin SDK
function getAdminDb() {
  try {
    const config = getFirebaseConfig();
    const app = getAdminApps().length === 0
      ? initAdminApp({
          projectId: config.projectId,
        })
      : getAdminApp();

    return getAdminFirestore(app, config.firestoreDatabaseId || '(default)');
  } catch (err) {
    console.warn('Firebase Admin SDK init notice:', err);
    return null;
  }
}

export interface NetworkProviderConfig {
  name: string;
  secretEnvVar: string;
}

// Supported external networks mapping
export const NETWORK_PROVIDERS: Record<string, NetworkProviderConfig> = {
  cpx: { name: 'CPX Research', secretEnvVar: 'CPX_RESEARCH_SECRET' },
  torox: { name: 'Torox', secretEnvVar: 'TOROX_SECRET_KEY' },
  monlix: { name: 'Monlix', secretEnvVar: 'MONLIX_SECRET_KEY' },
  mylead: { name: 'MyLead', secretEnvVar: 'MYLEAD_SECRET_TOKEN' },
  bitlabs: { name: 'BitLabs', secretEnvVar: 'BITLABS_SECRET_KEY' },
  generic: { name: 'Generic Network', secretEnvVar: 'GENERIC_POSTBACK_SECRET' },
};

export interface GenericPostbackPayload {
  userId?: string;
  uid?: string;
  subid?: string;
  user_id?: string;
  networkPayoutUSD?: number | string;
  payout?: number | string;
  payout_usd?: number | string;
  amount?: number | string;
  eventId?: string;
  transactionId?: string;
  transaction_id?: string;
  event_id?: string;
  tx_id?: string;
  provider?: string;
  network?: string;
  title?: string;
  offer_name?: string;
  signature?: string;
  sig?: string;
  secretToken?: string;
  secret?: string;
  token?: string;
  [key: string]: any;
}

export interface GenericPostbackResult {
  statusCode: number;
  responseBody: {
    success: boolean;
    message: string;
    eventId?: string;
    userId?: string;
    networkPayoutUSD?: number;
    spCredited?: number;
    status?: string;
    provider?: string;
    error?: string;
  };
}

/**
 * Validates request authentication / signature.
 * CRITICAL SECURITY REQUIREMENT:
 * Unauthenticated public requests MUST NEVER award SP.
 * Until a real network is configured and its verification credentials are added
 * to the environment, all crediting requests must be rejected.
 */
function verifyPostbackAuth(
  providerKey: string,
  providedSecret: string,
  providedSignature: string,
  payload: GenericPostbackPayload
): { verified: boolean; reason?: string } {
  const providerConfig = NETWORK_PROVIDERS[providerKey] || NETWORK_PROVIDERS.generic;
  const configuredSecret = process.env[providerConfig.secretEnvVar]?.trim();

  // If no secret key is configured in the environment, the network is NOT configured yet
  if (!configuredSecret || configuredSecret.length === 0 || configuredSecret.includes('placeholder') || configuredSecret.includes('your_')) {
    return {
      verified: false,
      reason: `Network "${providerConfig.name}" is not yet configured with verification credentials. Postback rejected.`,
    };
  }

  // Check secret token matching
  if (providedSecret && providedSecret === configuredSecret) {
    return { verified: true };
  }

  // Check HMAC signature if signature was provided
  if (providedSignature) {
    try {
      const rawPayloadString = `${payload.userId || ''}:${payload.eventId || ''}:${payload.networkPayoutUSD || ''}`;
      const expectedHmac = crypto.createHmac('sha256', configuredSecret).update(rawPayloadString).digest('hex');
      const expectedMd5 = crypto.createHash('md5').update(`${payload.eventId || ''}:${configuredSecret}`).digest('hex');

      if (
        crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedHmac)) ||
        crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedMd5))
      ) {
        return { verified: true };
      }
    } catch {
      // Signature length or string mismatch
    }
  }

  return {
    verified: false,
    reason: 'Invalid authentication secret or signature provided.',
  };
}

/**
 * Generic External Reward Postback Processor
 */
export async function processGenericPostback(
  payload: GenericPostbackPayload,
  authHeader?: string
): Promise<GenericPostbackResult> {
  // 1. Map flexible fields for provider compatibility
  const userId = (
    payload.userId ||
    payload.uid ||
    payload.subid ||
    payload.user_id ||
    ''
  ).toString().trim();

  const eventId = (
    payload.eventId ||
    payload.transactionId ||
    payload.transaction_id ||
    payload.event_id ||
    payload.tx_id ||
    ''
  ).toString().trim();

  const rawPayout = payload.networkPayoutUSD ?? payload.payout ?? payload.payout_usd ?? payload.amount ?? 0;
  const numericPayoutUSD = typeof rawPayout === 'number' ? rawPayout : parseFloat(rawPayout.toString() || '0');

  const rawProvider = (payload.provider || payload.network || 'generic').toString().toLowerCase().trim();
  const providerKey = NETWORK_PROVIDERS[rawProvider] ? rawProvider : 'generic';
  const providerName = NETWORK_PROVIDERS[providerKey].name;

  const offerTitle = (payload.title || payload.offer_name || `${providerName} Reward`).toString().trim();

  const providedSecret = (payload.secretToken || payload.secret || payload.token || '').toString().trim() ||
    (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '');
  const providedSignature = (payload.signature || payload.sig || '').toString().trim();

  // 2. Validate required values
  if (!userId) {
    return {
      statusCode: 400,
      responseBody: {
        success: false,
        message: 'Missing required field: userId',
        error: 'INVALID_USER_ID',
      },
    };
  }

  if (!eventId) {
    return {
      statusCode: 400,
      responseBody: {
        success: false,
        message: 'Missing required field: eventId / transactionId',
        error: 'INVALID_EVENT_ID',
      },
    };
  }

  if (isNaN(numericPayoutUSD) || numericPayoutUSD <= 0) {
    return {
      statusCode: 400,
      responseBody: {
        success: false,
        message: 'Invalid network payout amount (must be > 0 USD)',
        error: 'INVALID_PAYOUT_AMOUNT',
      },
    };
  }

  // 3. ENFORCE SECURITY: Verify authentication/signature
  const authResult = verifyPostbackAuth(providerKey, providedSecret, providedSignature, payload);
  if (!authResult.verified) {
    console.warn(`[ExternalPostback] Security check failed for provider "${providerName}":`, authResult.reason);
    return {
      statusCode: 401,
      responseBody: {
        success: false,
        message: authResult.reason || 'Unauthorized postback request.',
        error: 'UNAUTHENTICATED_POSTBACK',
      },
    };
  }

  // 4. Calculate SP credit using approved calculateExternalUserSP function (enforces 40% conversion & 3000 SP cap)
  const creditedSP = calculateExternalUserSP(numericPayoutUSD);

  if (creditedSP <= 0) {
    return {
      statusCode: 400,
      responseBody: {
        success: false,
        message: 'Calculated SP reward is zero.',
        error: 'ZERO_SP_REWARD',
      },
    };
  }

  const timestampIso = new Date().toISOString();

  // 5. Execute Atomic Firestore Credit & Deduplication
  const adminDb = getAdminDb();
  if (!adminDb) {
    return {
      statusCode: 500,
      responseBody: {
        success: false,
        message: 'Database service unavailable.',
        error: 'DATABASE_ERROR',
      },
    };
  }

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      // Global audit document to prevent duplicate event credits
      const postbackAuditRef = adminDb.collection('external_postbacks').doc(`${providerKey}_${eventId}`);
      const userRef = adminDb.collection('users').doc(userId);
      const userTxRef = userRef.collection('transactions').doc(`${providerKey}_${eventId}`);

      const auditDoc = await transaction.get(postbackAuditRef);
      if (auditDoc.exists) {
        return { isDuplicate: true };
      }

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        return { userNotFound: true };
      }

      // Record audit log
      transaction.set(postbackAuditRef, {
        eventId,
        userId,
        provider: providerName,
        providerKey,
        networkPayoutUSD: numericPayoutUSD,
        spCredited: creditedSP,
        offerTitle,
        processedAt: timestampIso,
      });

      // Atomically update user balance
      transaction.update(userRef, {
        coins: AdminFieldValue.increment(creditedSP),
        totalEarned: AdminFieldValue.increment(creditedSP),
        offersCompletedToday: AdminFieldValue.increment(1),
        totalTasksCompleted: AdminFieldValue.increment(1),
        updatedAt: timestampIso,
      });

      // Create single Firestore transaction record for auditing and Live Earnings Popup system
      transaction.set(userTxRef, {
        id: `${providerKey}_${eventId}`,
        userId,
        type: 'earn',
        amount: creditedSP,
        title: offerTitle,
        category: 'Offerwall',
        network: providerName,
        timestamp: timestampIso,
        status: 'completed',
      });

      return { isDuplicate: false, userNotFound: false };
    });

    if (result.isDuplicate) {
      return {
        statusCode: 200,
        responseBody: {
          success: true,
          message: 'Duplicate event ID ignored (already credited).',
          eventId,
          userId,
          status: 'duplicate_ignored',
        },
      };
    }

    if (result.userNotFound) {
      return {
        statusCode: 404,
        responseBody: {
          success: false,
          message: `User with ID "${userId}" not found.`,
          error: 'USER_NOT_FOUND',
        },
      };
    }

    return {
      statusCode: 200,
      responseBody: {
        success: true,
        message: 'External reward postback processed and SP credited successfully.',
        eventId,
        userId,
        networkPayoutUSD: numericPayoutUSD,
        spCredited: creditedSP,
        provider: providerName,
        status: 'completed',
      },
    };
  } catch (err: any) {
    console.error('[ExternalPostback] Transaction error:', err);
    return {
      statusCode: 500,
      responseBody: {
        success: false,
        message: 'Failed to process postback transaction.',
        error: 'TRANSACTION_FAILED',
      },
    };
  }
}
