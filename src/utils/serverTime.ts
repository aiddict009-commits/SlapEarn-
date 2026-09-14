// Server-based Date & Time Utility & Authoritative Server Verification Helpers
import {
  timeManager,
  getServerNow,
  getServerDate,
  getServerDateString,
  getRemainingTimeToDailyReset,
  resyncServerTime,
  dismissTimeWarning,
  TimeSyncState,
} from './timeManager';
import { getFreshAuthToken } from '../lib/firebase';

export {
  timeManager,
  getServerNow,
  getServerDate,
  getServerDateString,
  getRemainingTimeToDailyReset,
  resyncServerTime,
  dismissTimeWarning,
};

export type { TimeSyncState };

/**
 * Backward compatible syncServerTime
 */
export async function syncServerTime(): Promise<number> {
  return timeManager.syncServerTime(true);
}

export function isServerTimeSynced(): boolean {
  return timeManager.getState().isSynced;
}

export interface ServerVerificationResult {
  isEligible: boolean;
  accountAgeDays: number;
  daysRemaining: number;
  serverTime: number;
  verifiedByServer: boolean;
}

export interface DailyCheckInVerificationResult {
  success: boolean;
  isEligible: boolean;
  serverTime: number;
  nextStreak: number;
  slapsToGive: number;
  coinsToGive: number;
  message?: string;
  verifiedByServer: boolean;
}

export interface WheelSpinVerificationResult {
  success: boolean;
  isEligible: boolean;
  remainingMs: number;
  serverTime: number;
  verifiedByServer: boolean;
}

/**
 * Verifies account withdrawal eligibility against backend server (Fix 4)
 */
export async function verifyWithdrawalServer(createdAt?: number): Promise<ServerVerificationResult> {
  try {
    const token = await getFreshAuthToken();
    if (!token) {
      return {
        isEligible: false,
        accountAgeDays: 0,
        daysRemaining: 7,
        serverTime: getServerNow(),
        verifiedByServer: false,
      };
    }

    const res = await fetch('/api/verify-withdrawal-eligibility', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        isEligible: !!data.eligible,
        accountAgeDays: Math.floor((data.accountAgeHours || 0) / 24),
        daysRemaining: data.eligible ? 0 : 1,
        serverTime: data.serverTime ?? getServerNow(),
        verifiedByServer: true,
      };
    }
  } catch (err) {
    console.warn('[ServerTime] Withdrawal verification notice:', err);
  }

  // Authoritative fallback using monotonic server time
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

/**
 * Verifies daily check-in eligibility on the backend server (Fix 4)
 */
export async function verifyDailyCheckInServer(
  lastCheckIn?: string | null,
  currentStreak: number = 0,
  currentSlapsToday: number = 70,
  maxSlapsPerDay: number = 100
): Promise<DailyCheckInVerificationResult> {
  try {
    const token = await getFreshAuthToken();
    if (!token) {
      return {
        success: false,
        isEligible: false,
        serverTime: getServerNow(),
        nextStreak: 1,
        slapsToGive: 0,
        coinsToGive: 0,
        message: 'Authentication required',
        verifiedByServer: false,
      };
    }

    const res = await fetch('/api/rewards/verify-daily-checkin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: !!data.eligible,
        isEligible: !!data.eligible,
        serverTime: data.serverTime ?? getServerNow(),
        nextStreak: data.nextStreak ?? ((currentStreak >= 7 ? 0 : currentStreak) + 1),
        slapsToGive: data.slapsToGive ?? 0,
        coinsToGive: data.coinsToGive ?? 0,
        message: data.eligible ? 'Eligible' : 'Already claimed today',
        verifiedByServer: true,
      };
    }
  } catch (err) {
    console.warn('[ServerTime] Daily check-in verification notice:', err);
  }

  // Fallback calculation with monotonic server time
  const now = getServerNow();
  const todayStr = getServerDateString(now);
  const lastCheckInDateStr = lastCheckIn ? getServerDateString(new Date(lastCheckIn).getTime()) : null;
  const isEligible = lastCheckInDateStr !== todayStr;

  const daysOfCheckIn = [
    { day: 1, slaps: 1, coins: 10 },
    { day: 2, slaps: 1, coins: 20 },
    { day: 3, slaps: 2, coins: 30 },
    { day: 4, slaps: 2, coins: 40 },
    { day: 5, slaps: 3, coins: 50 },
    { day: 6, slaps: 3, coins: 75 },
    { day: 7, slaps: 5, coins: 150 }
  ];

  const currentStreakIndex = currentStreak >= 7 ? 0 : currentStreak;
  const rewardItem = daysOfCheckIn[currentStreakIndex] || daysOfCheckIn[0];
  const currentSlaps = Math.max(0, maxSlapsPerDay - currentSlapsToday);
  const spaceLeft = 100 - currentSlaps;
  const slapsToGive = Math.max(0, Math.min(rewardItem.slaps, spaceLeft));

  return {
    success: isEligible,
    isEligible,
    serverTime: now,
    nextStreak: currentStreakIndex + 1,
    slapsToGive,
    coinsToGive: rewardItem.coins,
    message: isEligible ? 'Eligible' : 'Already claimed today',
    verifiedByServer: false,
  };
}

/**
 * Verifies wheel spin cooldown eligibility on the backend server (Fix 4)
 */
export async function verifyWheelSpinServer(
  lastWheelSpin?: string | null,
  freeSpins: number = 0
): Promise<WheelSpinVerificationResult> {
  try {
    const token = await getFreshAuthToken();
    if (!token) {
      return {
        success: false,
        isEligible: false,
        remainingMs: 0,
        serverTime: getServerNow(),
        verifiedByServer: false,
      };
    }

    const res = await fetch('/api/rewards/verify-wheel-spin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: !!data.eligible,
        isEligible: !!data.eligible,
        remainingMs: data.eligible ? 0 : 5 * 60 * 60 * 1000,
        serverTime: data.serverTime ?? getServerNow(),
        verifiedByServer: true,
      };
    }
  } catch (err) {
    console.warn('[ServerTime] Wheel spin verification notice:', err);
  }

  // Fallback calculation using monotonic server time
  const now = getServerNow();
  const COOLDOWN_MS = 5 * 60 * 60 * 1000;
  const lastSpinTime = lastWheelSpin ? new Date(lastWheelSpin).getTime() : 0;
  const elapsed = Math.max(0, now - lastSpinTime);
  const hasFreeSpins = freeSpins > 0;
  const isEligible = hasFreeSpins || elapsed >= COOLDOWN_MS;
  const remainingMs = isEligible ? 0 : Math.max(0, COOLDOWN_MS - elapsed);

  return {
    success: isEligible,
    isEligible,
    remainingMs,
    serverTime: now,
    verifiedByServer: false,
  };
}
