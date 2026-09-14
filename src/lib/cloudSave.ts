import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserStats } from '../types';

/**
 * Cloud Save System for SlapEarn
 * - Single document per user: users/{uid}
 * - Read ONCE at login / session start
 * - Local state & localStorage caching for instant feedback and offline support
 * - Client-side saves only push allowed profile customizations (skins, audio, bio, displayName, etc.)
 * - Economy fields (coins, xp, streak, slaps) are server-authoritative and synchronized in real-time
 */

// Memory baseline snapshot of what is currently saved in Firestore for this session
let baselineStats: UserStats | null = null;
let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;
let isDirty = false;
let isFlushing = false;

// Allowed profile fields that the client is permitted to update directly in Firestore
const CLIENT_ALLOWED_FIELDS = new Set<string>([
  'displayName',
  'profilePicture',
  'photoURL',
  'country',
  'username',
  'avatar',
  'soundEnabled',
  'hapticsEnabled',
  'fcmToken',
  'selectedHand',
  'unlockedHands',
  'equippedTitle',
  'equippedFrame',
  'bio',
  'updatedAt'
]);

/**
 * Load User Document ONCE from Firestore on sign in / app startup
 */
export async function loadUserData(uid: string, initialFallback: UserStats): Promise<UserStats> {
  if (!uid) return initialFallback;

  const localCacheKey = `slapearn_stats_${uid}`;
  const cachedRaw = localStorage.getItem(localCacheKey);
  const cachedStats: Partial<UserStats> = cachedRaw ? JSON.parse(cachedRaw) : {};

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

  // Merge order: Default -> Remote Firestore -> Local Cache
  const merged: UserStats = {
    ...initialFallback,
    ...(remoteStats || {}),
    ...(cachedStats || {}),
    uid
  };

  // Set baseline snapshot
  baselineStats = JSON.parse(JSON.stringify(merged));
  isDirty = false;

  // Cache locally
  localStorage.setItem(localCacheKey, JSON.stringify(merged));

  return merged;
}

/**
 * Calculate client-permitted update payload comparing currentStats vs baselineStats
 */
export function buildUpdatePayload(current: UserStats, baseline: UserStats | null): Record<string, any> {
  const payload: Record<string, any> = {};

  if (!baseline) {
    for (const key of CLIENT_ALLOWED_FIELDS) {
      if ((current as any)[key] !== undefined) {
        payload[key] = (current as any)[key];
      }
    }
    payload.updatedAt = new Date().toISOString();
    return payload;
  }

  for (const key of CLIENT_ALLOWED_FIELDS) {
    if (key === 'updatedAt') continue;

    const currVal = (current as any)[key];
    const baseVal = (baseline as any)[key];

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
 * Flush pending profile changes to Firestore
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

    console.log('[CloudSave] Synced allowed client profile fields to Firestore:', Object.keys(payload));
    isFlushing = false;
    return true;
  } catch (err) {
    console.warn('[CloudSave] Profile write failed:', err);
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);

    localStorage.setItem(`slapearn_pending_save_${uid}`, JSON.stringify(currentStats));
    localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(currentStats));

    isDirty = true;
    isFlushing = false;
    return false;
  }
}

/**
 * Mark local state as dirty and schedule a debounced background save
 */
export function markDirtyAndScheduleSave(
  uid: string,
  currentStats: UserStats,
  delayMs = 2000
) {
  isDirty = true;
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
 * Save immediately on explicit profile update event triggers
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
