// Persistent Device Identifier & Account Limiter
import { collection, query, where, getDocs, Firestore } from 'firebase/firestore';

const DEVICE_ID_STORAGE_KEY = 'slapearn_device_fingerprint_id';
const DEVICE_ACCOUNTS_STORAGE_KEY = 'slapearn_device_registered_uids';

/**
 * Gets or creates a persistent device ID stored across browser storage mechanisms.
 */
export async function getPersistentDeviceId(): Promise<string> {
  // 1. Check LocalStorage
  try {
    const existingId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existingId && existingId.startsWith('dev_')) {
      return existingId;
    }
  } catch {}

  // 2. Generate fingerprint signature
  let canvasFP = '';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('SlapEarnFP,456', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('SlapEarnFP,456', 4, 17);
      canvasFP = canvas.toDataURL().slice(-20).replace(/[^a-zA-Z0-9]/g, '');
    }
  } catch {}

  const screenDim = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'desktop';
  const concurrency = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const randomSeed = Math.random().toString(36).substring(2, 8);

  const newDeviceId = `dev_${screenDim}_c${concurrency}_${canvasFP}_${randomSeed}`;

  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, newDeviceId);
  } catch {}

  return newDeviceId;
}

/**
 * Checks if the current device has reached the 2-account registration limit.
 * Queries Firestore for registered accounts linked to this device ID.
 */
export async function checkDeviceAccountLimit(dbInstance?: Firestore): Promise<{ allowed: boolean; count: number; deviceId: string }> {
  const deviceId = await getPersistentDeviceId();

  // Primary Server-Side Firestore Check
  let count = 0;
  if (dbInstance) {
    try {
      const usersRef = collection(dbInstance, 'users');
      const q = query(usersRef, where('deviceId', '==', deviceId));
      const snap = await getDocs(q);
      count = snap.size;
    } catch (fsErr) {
      console.warn('Firestore device limit query notice:', fsErr);
    }
  }

  // Secondary Local Storage Cache Check
  try {
    const localUids: string[] = JSON.parse(localStorage.getItem(DEVICE_ACCOUNTS_STORAGE_KEY) || '[]');
    count = Math.max(count, localUids.length);
  } catch {}

  return {
    allowed: count < 2,
    count,
    deviceId
  };
}

/**
 * Records a newly registered user account to this device locally.
 */
export function recordAccountOnDevice(uid: string) {
  try {
    const localUids: string[] = JSON.parse(localStorage.getItem(DEVICE_ACCOUNTS_STORAGE_KEY) || '[]');
    if (!localUids.includes(uid)) {
      localUids.push(uid);
      localStorage.setItem(DEVICE_ACCOUNTS_STORAGE_KEY, JSON.stringify(localUids));
    }
  } catch {}
}
