import { doc, setDoc, getDoc, increment, DocumentData } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserStats } from '../types';

/**
 * Cloud Save System for SlapEarn
 * - Single document per user: users/{uid}
 * - Read ONCE at login / session start
 * - Local state & localStorage caching for instant feedback and offline support
 * - Batched delta updates using Firestore atomic increment() for counters
 * - Flushes only on dirty state, explicit event triggers, periodic interval, or disconnect
 */

// Memory baseline snapshot of what is currently saved in Firestore for this session
let baselineStats: UserStats | null = null;
let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;
let isDirty = false;
let isFlushing = false;

// Numeric fields that should use atomic increment()
const COUNTER_FIELDS: (keyof UserStats)[] = [
  'coins',
  'totalEarned',
  'spEarnedToday',
  'xp',
  'slapsToday',
  'maxSlapsPerDay',
  'slapsPlayedToday',
  'bestCombo',
  'daysActive',
  'referrals',
  'adsWatchedToday',
  'totalAdsWatchedLifetime',
  'referralsForCurrentWithdrawal',
  'totalTasksCompleted',
  'whackAMolePlayedToday',
  'totalDamageDealtToday',
  'charactersDefeatedToday',
  'surveysCompletedToday',
  'offersCompletedToday',
  'freeSpins'
];

/**
 * Load User Document ONCE from Firestore on sign in / app startup
 */
export async function loadUserData(uid: string, initialFallback: UserStats): Promise<UserStats> {
  if (!uid) return initialFallback;

  const localCacheKey = `slapearn_stats_${uid}`;
  const cachedRaw = localStorage.getItem(localCacheKey);
  const cachedStats: Partial<UserStats> = cachedRaw ? JSON.parse(cachedRaw) : {};

  // Check if there are unsaved pending changes from a previous offline session
  const pendingRaw = localStorage.getItem(`slapearn_pending_save_${uid}`);
  const pendingStats: Partial<UserStats> = pendingRaw ? JSON.parse(pendingRaw) : {};

  let remoteStats: Partial<UserStats> | null = null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      remoteStats = snap.data() as Partial<UserStats>;
    }
  } catch (err) {
    console.warn('[CloudSave] Failed to fetch remote user doc, falling back to local cache:', err);
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  // Merge order: Default -> Remote Firestore -> Local Cache -> Pending unsaved offline changes
  const merged: UserStats = {
    ...initialFallback,
    ...(remoteStats || {}),
    ...(cachedStats || {}),
    ...(pendingStats || {}),
    uid
  };

  // Set baseline snapshot
  baselineStats = JSON.parse(JSON.stringify(merged));
  isDirty = Object.keys(pendingStats).length > 0;

  // Cache locally
  localStorage.setItem(localCacheKey, JSON.stringify(merged));

  // If there were pending offline changes, schedule a flush
  if (isDirty) {
    scheduleAutoSave(uid, merged, 2000);
  }

  return merged;
}

/**
 * Calculate atomic delta update payload comparing currentStats vs baselineStats
 */

export function buildUpdatePayload(current: UserStats, baseline: UserStats | null): Record<string, any> {
  if (!baseline) {
    // If no baseline exists, return full object
    return { ...current, updatedAt: new Date().toISOString() };
  }

  const payload: Record<string, any> = {};

  // 1. Process Numeric Counter Fields with atomic increment(delta)
  for (const field of COUNTER_FIELDS) {
    const currVal = typeof current[field] === 'number' ? (current[field] as number) : 0;
    const baseVal = typeof baseline[field] === 'number' ? (baseline[field] as number) : 0;
    const delta = currVal - baseVal;

    if (delta !== 0) {
      payload[field] = increment(delta);
    }
  }

  // 2. Process non-counter / complex fields (arrays, strings, booleans)
  const allKeys = new Set([
    ...Object.keys(current),
    ...Object.keys(baseline)
  ]) as Set<keyof UserStats>;

  for (const key of allKeys) {
    if (COUNTER_FIELDS.includes(key) || key === 'uid') continue;

    const currVal = current[key];
    const baseVal = baseline[key];

    // Deep JSON compare for objects/arrays or strict compare for primitives
    const isDifferent = typeof currVal === 'object' || typeof baseVal === 'object'
      ? JSON.stringify(currVal) !== JSON.stringify(baseVal)
      : currVal !== baseVal;

    if (isDifferent && currVal !== undefined) {
      payload[key] = currVal;
    }
  }

  if (Object.keys(payload).length > 0) {
    payload.updatedAt = new Date().toISOString();
  }

  return payload;
}

/**
 * Flush pending changes to Firestore
 */
export async function flushPendingUserStats(
  uid: string,
  currentStats: UserStats,
  force = false
): Promise<boolean> {
  if (!uid) return false;
  if (!force && !isDirty) return true;
  if (isFlushing) return false;

  const payload = buildUpdatePayload(currentStats, baselineStats);
  if (Object.keys(payload).length === 0) {
    isDirty = false;
    localStorage.removeItem(`slapearn_pending_save_${uid}`);
    return true;
  }

  isFlushing = true;

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, payload, { merge: true });

    // Successfully saved! Update baseline snapshot
    baselineStats = JSON.parse(JSON.stringify(currentStats));
    isDirty = false;

    // Clear pending cache and update local storage cache
    localStorage.removeItem(`slapearn_pending_save_${uid}`);
    localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(currentStats));

    console.log('[CloudSave] Successfully synced dirty fields to Firestore:', Object.keys(payload));
    isFlushing = false;
    return true;
  } catch (err) {
    console.warn('[CloudSave] Write failed (offline or network error). Storing pending changes locally:', err);
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);

    // Persist pending changes locally so data is not lost
    localStorage.setItem(`slapearn_pending_save_${uid}`, JSON.stringify(currentStats));
    localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(currentStats));

    isDirty = true;
    isFlushing = false;
    return false;
  }
}

/**
 * Mark local state as dirty and schedule a debounced/timed background save
 */
export function markDirtyAndScheduleSave(
  uid: string,
  currentStats: UserStats,
  delayMs = 30000
) {
  isDirty = true;
  // Always update local cache immediately
  if (uid) {
    localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(currentStats));
    localStorage.setItem(`slapearn_pending_save_${uid}`, JSON.stringify(currentStats));
  }

  if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(() => {
    flushPendingUserStats(uid, currentStats);
  }, delayMs);
}

/**
 * Schedule save helper
 */
export function scheduleAutoSave(
  uid: string,
  currentStats: UserStats,
  delayMs = 1000
) {
  if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(() => {
    flushPendingUserStats(uid, currentStats);
  }, delayMs);
}

/**
 * Save immediately on explicit high-value event triggers:
 * - ad_reward_completed
 * - minigame_completed
 * - task_completed
 * - daily_reward_claimed
 * - streak_updated
 * - withdrawal_requested
 * - sign_out
 */
export async function saveOnEvent(
  uid: string,
  currentStats: UserStats,
  eventName: string
): Promise<boolean> {
  if (!uid) return false;
  console.log(`[CloudSave] Triggering immediate cloud save for event: "${eventName}"`);
  isDirty = true;
  if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
  return await flushPendingUserStats(uid, currentStats, true);
}

/**
 * Clear local session baseline (on logout)
 */
export function resetCloudSaveState() {
  baselineStats = null;
  isDirty = false;
  isFlushing = false;
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
  }
}
