// Server-based Date & Time Utility to prevent local client clock tampering

let serverTimeOffsetMs = 0; // Difference: (Server Time) - (Client Local Time)
let isSyncedWithServer = false;
let lastSyncTimestamp = 0;

/**
 * Syncs client clock offset with server clock endpoint /api/time
 */
export async function syncServerTime(): Promise<number> {
  try {
    const fetchStart = Date.now();
    const res = await fetch('/api/time');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.serverTime === 'number') {
        const fetchEnd = Date.now();
        const roundTripLatency = Math.floor((fetchEnd - fetchStart) / 2);
        const trustedServerTime = data.serverTime + roundTripLatency;
        serverTimeOffsetMs = trustedServerTime - fetchEnd;
        isSyncedWithServer = true;
        lastSyncTimestamp = Date.now();
        return trustedServerTime;
      }
    }
  } catch (err) {
    console.warn('[ServerTime] Could not sync with /api/time, using local clock fallback:', err);
  }
  return Date.now() + serverTimeOffsetMs;
}

/**
 * Returns current trusted server time (adjusting local clock by offset)
 */
export function getServerNow(): number {
  return Date.now() + serverTimeOffsetMs;
}

export function isServerTimeSynced(): boolean {
  return isSyncedWithServer;
}

export interface ServerVerificationResult {
  isEligible: boolean;
  accountAgeDays: number;
  daysRemaining: number;
  serverTime: number;
  verifiedByServer: boolean;
}

/**
 * Verifies account withdrawal eligibility against backend server
 */
export async function verifyWithdrawalServer(createdAt?: number): Promise<ServerVerificationResult> {
  try {
    const res = await fetch('/api/verify-withdrawal-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createdAt }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.serverTime === 'number') {
        serverTimeOffsetMs = data.serverTime - Date.now();
        isSyncedWithServer = true;
      }
      return {
        isEligible: !!data.isEligible,
        accountAgeDays: data.accountAgeDays ?? 0,
        daysRemaining: data.daysRemaining ?? 0,
        serverTime: data.serverTime ?? getServerNow(),
        verifiedByServer: true,
      };
    }
  } catch (err) {
    console.warn('[ServerTime] Verification request failed:', err);
  }

  // Local calculation with server-offset as fallback
  const now = getServerNow();
  const userCreatedAt = typeof createdAt === 'number' 
    ? createdAt 
    : (now - 10 * 24 * 60 * 60 * 1000);
  const ageMs = Math.max(0, now - userCreatedAt);
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const isEligible = ageDays >= 7;
  const daysRemaining = isEligible 
    ? 0 
    : Math.max(1, Math.ceil((7 * 24 * 60 * 60 * 1000 - ageMs) / (1000 * 60 * 60 * 24)));

  return {
    isEligible,
    accountAgeDays: ageDays,
    daysRemaining,
    serverTime: now,
    verifiedByServer: false,
  };
}
