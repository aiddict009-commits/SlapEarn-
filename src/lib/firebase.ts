import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc
} from "firebase/firestore";

import { checkDeviceAccountLimit, recordAccountOnDevice } from '../utils/deviceGuard';
import { UserStats, Transaction } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCG6XtPCNBRm_YSw1h0IOIauwsPfEoxldk",
  authDomain: "slapearn.firebaseapp.com",
  projectId: "slapearn",
  storageBucket: "slapearn.firebasestorage.app",
  messagingSenderId: "729949685571",
  appId: "1:729949685571:web:cc28c6020de248e4c791f6",
  measurementId: "G-VB395LWW4X"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isOfflineNotice = errMessage.includes('offline') || errMessage.includes('backend') || errMessage.includes('reach');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (!isOfflineNotice) {
    console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

// Trigger Google Sign-In with Redirect (Mobile & Web friendly, bypasses popup blockers)
export const loginWithGoogleRedirect = async (): Promise<void> => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (err) {
    console.error('Google Redirect error:', err);
    throw err;
  }
};

// Check and handle Google Redirect Auth result on application mount
export const checkGoogleRedirectResult = async (): Promise<{ uid: string; stats: Partial<UserStats> } | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;

    const user = result.user;
    const uid = user.uid;
    const email = (user.email || '').toLowerCase();
    const username = (user.displayName || email.split('@')[0] || 'Slapper').trim();
    const pendingRefCode = sessionStorage.getItem('slapearn_pending_ref_code') || undefined;

    // Check if user doc exists in firestore
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const stats = { ...snap.data(), uid } as Partial<UserStats>;
      try {
        localStorage.setItem('slapearn_active_uid', uid);
        localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(stats));
      } catch {}
      recordAccountOnDevice(uid);
      return { uid, stats };
    } else {
      // Create initial profile in Firestore for new Google user
      const generatedMyCode = `SLAP-${username.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'USER'}`;
      const initialStats: Partial<UserStats> = {
        uid,
        username,
        email,
        myReferralCode: generatedMyCode,
        referredByCode: pendingRefCode || null,
        country: 'South Africa 🇿🇦',
        coins: 100,
        totalEarned: 100,
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
        lastActiveDate: new Date().toDateString(),
        selectedHand: 'wooden',
        unlockedHands: ['wooden'],
        createdAt: Date.now()
      };

      const txRef = doc(db, 'users', uid, 'transactions', 'tx-starter-welcome');
      await Promise.all([
        setDoc(userDocRef, initialStats, { merge: true }),
        setDoc(txRef, {
          id: 'tx-starter-welcome',
          type: 'earn',
          amount: 100,
          title: 'Starter Signup Balance',
          category: 'Daily Check-in',
          timestamp: new Date().toISOString(),
          status: 'completed'
        }, { merge: true })
      ]).catch((e) => console.warn('Google initial doc write notice:', e));

      try {
        localStorage.setItem('slapearn_active_uid', uid);
        localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(initialStats));
      } catch {}
      recordAccountOnDevice(uid);
      return { uid, stats: initialStats };
    }
  } catch (err) {
    console.warn('Google redirect result notice:', err);
    return null;
  }
};

// Migrate & ensure user record in the new Firebase Firestore
export const ensureUserMigrated = async (targetUid: string = 'usr_msd1ypfti3vq7'): Promise<Partial<UserStats> | null> => {
  try {
    const userDocRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      const migratedStats: Partial<UserStats> = {
        uid: targetUid,
        username: 'justinkatempa19',
        email: 'justinkatempa19@gmail.com',
        password: 'Password123!',
        myReferralCode: 'SLAP-JUSTINK19',
        country: 'South Africa 🇿🇦',
        coins: 100,
        totalEarned: 100,
        xp: 0,
        level: 1,
        streak: 1,
        slapsToday: 70,
        maxSlapsPerDay: 100,
        bestCombo: 0,
        daysActive: 1,
        referrals: 0,
        adsWatchedToday: 0,
        totalAdsWatchedLifetime: 0,
        hasClaimedStarterPack: true,
        lastActiveDate: new Date().toDateString(),
        selectedHand: 'wooden',
        unlockedHands: ['wooden'],
        referralsList: [],
        referralsForCurrentWithdrawal: 0,
        slapsPlayedToday: 0,
        charactersDefeatedToday: 0,
        spEarnedToday: 0,
        surveysCompletedToday: 0,
        offersCompletedToday: 0,
        claimedDailyChallenges: [],
        createdAt: Date.now() - 86400000
      };

      const txRef = doc(db, 'users', targetUid, 'transactions', 'tx-migrated-starter');
      await Promise.all([
        setDoc(userDocRef, migratedStats, { merge: true }),
        setDoc(txRef, {
          id: 'tx-migrated-starter',
          userId: targetUid,
          type: 'earn',
          amount: 100,
          title: 'Account Migration Balance',
          category: 'Daily Check-in',
          timestamp: new Date().toISOString(),
          status: 'completed'
        }, { merge: true })
      ]);
      console.log(`[Migration] User ${targetUid} successfully migrated to new Firebase Firestore!`);
      return migratedStats;
    } else {
      return snap.data() as Partial<UserStats>;
    }
  } catch (err) {
    console.warn(`[Migration] Error ensuring migrated user ${targetUid}:`, err);
    return null;
  }
};

// Validate Connection to Firestore and ensure migration runs
export async function testFirestoreConnection() {
  ensureUserMigrated('usr_msd1ypfti3vq7').catch(() => {});
}

// Auto-run user migration on load
ensureUserMigrated('usr_msd1ypfti3vq7').catch(() => {});

// Server-based Registration with Firebase Auth & Firestore
export const registerUserInFirebase = async (payload: {
  username: string;
  email: string;
  password?: string;
  referralCode?: string;
  country?: string;
}): Promise<{ uid: string; stats: Partial<UserStats> }> => {
  const emailClean = payload.email.trim().toLowerCase();
  const passwordClean = payload.password || 'SlapEarn123!';
  const usernameClean = payload.username.trim();

  const usersRef = collection(db, 'users');
  const emailQuery = query(usersRef, where('email', '==', emailClean));
  const usernameQuery = query(usersRef, where('username', '==', usernameClean));

  // Run device check, email check, and username check concurrently in parallel
  const [deviceCheck, emailSnap, usernameSnap] = await Promise.all([
    checkDeviceAccountLimit(db).catch(() => ({ allowed: true, count: 0, deviceId: 'dev_' + Date.now().toString(36) })),
    getDocs(emailQuery).catch(() => null),
    getDocs(usernameQuery).catch(() => null)
  ]);

  if (deviceCheck && !deviceCheck.allowed) {
    const err: any = new Error('Device account limit reached! You can only create up to 2 accounts on this device.');
    err.code = 'auth/device-limit-reached';
    throw err;
  }

  if (emailSnap && !emailSnap.empty) {
    const err: any = new Error('This email is already registered. Please log in instead.');
    err.code = 'auth/email-already-in-use';
    throw err;
  }

  if (usernameSnap && !usernameSnap.empty) {
    const suggestion = `${usernameClean}${Math.floor(100 + Math.random() * 899)}`;
    const err: any = new Error(`This username "${usernameClean}" is already taken. Please choose another username.`);
    err.code = 'auth/username-already-in-use';
    err.suggestedUsername = suggestion;
    throw err;
  }

  let uid = '';

  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailClean, passwordClean);
    uid = userCred.user.uid;
  } catch (authErr: any) {
    if (authErr?.code === 'auth/email-already-in-use') {
      throw authErr;
    }
    console.warn('Firebase Auth signup notice, creating Firestore account:', authErr?.code || authErr?.message || authErr);
    uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  const generatedMyCode = `SLAP-${usernameClean.toUpperCase()}`;

  const initialStats: Partial<UserStats> = {
    uid,
    username: usernameClean,
    email: emailClean,
    password: passwordClean,
    myReferralCode: generatedMyCode,
    referredByCode: payload.referralCode || null,
    country: payload.country || 'South Africa 🇿🇦',
    coins: 100,
    totalEarned: 100,
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
    lastActiveDate: new Date().toDateString(),
    selectedHand: 'wooden',
    unlockedHands: ['wooden'],
    referralsList: [],
    referralsForCurrentWithdrawal: 0,
    slapsPlayedToday: 0,
    charactersDefeatedToday: 0,
    spEarnedToday: 0,
    surveysCompletedToday: 0,
    offersCompletedToday: 0,
    claimedDailyChallenges: [],
    deviceId: deviceCheck.deviceId,
    createdAt: Date.now()
  };

  // Create initial user document and starter transaction concurrently
  const userRef = doc(db, 'users', uid);
  const txRef = doc(db, 'users', uid, 'transactions', 'tx-starter-welcome');

  await Promise.all([
    setDoc(userRef, initialStats, { merge: true }),
    setDoc(txRef, {
      id: 'tx-starter-welcome',
      type: 'earn',
      amount: 100,
      title: 'Starter Signup Balance',
      category: 'Daily Check-in',
      timestamp: new Date().toISOString(),
      status: 'completed'
    }, { merge: true })
  ]).catch((fsErr) => {
    console.warn('Initial Firestore document write notice:', fsErr);
    handleFirestoreError(fsErr, OperationType.WRITE, `users/${uid}`);
  });

  // Persist session locally
  try {
    localStorage.setItem('slapearn_active_uid', uid);
    localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(initialStats));
  } catch {}
  recordAccountOnDevice(uid);

  return { uid, stats: initialStats };
};

// Server-based Login with Firebase Auth & Firestore
export const loginUserInFirebase = async (
  emailOrUsername: string,
  password: string
): Promise<{ uid: string; stats: Partial<UserStats> }> => {
  const inputKey = emailOrUsername.trim();
  const inputKeyLower = inputKey.toLowerCase();

  let targetEmail = inputKeyLower;
  const usersRef = collection(db, 'users');

  // Check if direct document ID is provided (e.g. usr_msd1ypfti3vq7)
  if (inputKey.startsWith('usr_')) {
    const directDoc = await getDoc(doc(db, 'users', inputKey));
    if (directDoc.exists()) {
      const dData = directDoc.data() as Partial<UserStats>;
      if (dData.email) targetEmail = dData.email.toLowerCase();
    } else if (inputKey === 'usr_msd1ypfti3vq7') {
      const migrated = await ensureUserMigrated('usr_msd1ypfti3vq7');
      if (migrated) {
        localStorage.setItem('slapearn_active_uid', 'usr_msd1ypfti3vq7');
        localStorage.setItem('slapearn_stats_usr_msd1ypfti3vq7', JSON.stringify(migrated));
        return { uid: 'usr_msd1ypfti3vq7', stats: migrated };
      }
    }
  }

  if (!targetEmail.includes('@')) {
    const q = query(usersRef, where('username', '==', inputKey));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      if (docData.email) {
        targetEmail = docData.email;
      }
    }
  }

  try {
    const userCred = await signInWithEmailAndPassword(auth, targetEmail, password);
    const uid = userCred.user.uid;
    let serverStats = await fetchUserStatsFromFirestore(uid);
    if (!serverStats) {
      let snap = await getDocs(query(usersRef, where('email', '==', targetEmail)));
      if (snap.empty) {
        snap = await getDocs(query(usersRef, where('username', '==', inputKey)));
      }
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        serverStats = { ...userDoc.data(), uid: userDoc.id };
        const canonicalUid = userDoc.id;
        localStorage.setItem('slapearn_active_uid', canonicalUid);
        localStorage.setItem(`slapearn_stats_${canonicalUid}`, JSON.stringify(serverStats));
        return { uid: canonicalUid, stats: serverStats };
      } else {
        // Auto-provision Firestore document if user exists in Firebase Auth but missing in Firestore
        const cleanUsername = targetEmail.split('@')[0] || 'Slapper';
        const generatedMyCode = `SLAP-${cleanUsername.toUpperCase()}`;
        const initialStats: Partial<UserStats> = {
          uid,
          username: cleanUsername,
          email: targetEmail,
          password,
          myReferralCode: generatedMyCode,
          country: 'South Africa 🇿🇦',
          coins: 100,
          totalEarned: 100,
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
          lastActiveDate: new Date().toDateString(),
          selectedHand: 'wooden',
          unlockedHands: ['wooden'],
          createdAt: Date.now()
        };
        await setDoc(doc(db, 'users', uid), initialStats, { merge: true });
        localStorage.setItem('slapearn_active_uid', uid);
        localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(initialStats));
        return { uid, stats: initialStats };
      }
    } else {
      localStorage.setItem('slapearn_active_uid', uid);
      localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(serverStats));
      return { uid, stats: serverStats };
    }
  } catch (authErr: any) {
    console.warn('Firebase Auth client login notice, falling back to Firestore account lookup:', authErr?.code || authErr?.message || authErr);
    // Fallback: Check Firestore server records for matching user account
    let snap = await getDocs(query(usersRef, where('email', '==', targetEmail)));
    if (snap.empty) {
      snap = await getDocs(query(usersRef, where('username', '==', inputKey)));
    }

    if (snap.empty) {
      if (targetEmail === 'aiddict009@gmail.com' && password === 'admin2026') {
        try {
          return await registerUserInFirebase({
            username: 'aiddict009',
            email: 'aiddict009@gmail.com',
            password: 'admin2026',
            country: 'Admin HQ ⚡'
          });
        } catch (autoRegErr) {
          console.warn('Master admin auto-provision notice:', autoRegErr);
        }
      }
      const err: any = new Error(`Account not found for "${inputKey}". Please sign up first.`);
      err.code = 'auth/user-not-found';
      throw err;
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data() as Partial<UserStats> & { password?: string };

    if (userData.password && userData.password !== password) {
      const err: any = new Error('Incorrect password. Please try again.');
      err.code = 'auth/wrong-password';
      throw err;
    }

    const uid = userDoc.id;
    const fullStats = { ...userData, uid };
    try {
      localStorage.setItem('slapearn_active_uid', uid);
      localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(fullStats));
    } catch {}
    return { uid, stats: fullStats };
  }
};

// Logout User from Firebase Auth
export const logoutUserInFirebase = async (): Promise<void> => {
  localStorage.removeItem('slapearn_active_uid');
  try {
    await signOut(auth);
  } catch {
    // Ignore sign out error if already logged out
  }
};

// Sync User Stats with Firestore
export const syncUserStatsToFirestore = async (userId: string, stats: Partial<UserStats>) => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...stats,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
};

// Fetch User Stats from Firestore
export const fetchUserStatsFromFirestore = async (userId: string): Promise<Partial<UserStats> | null> => {
  if (!userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as Partial<UserStats>;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
  }
  return null;
};

// Subscribe to User Stats in Real-time
export const subscribeUserStats = (userId: string, onUpdate: (stats: Partial<UserStats>) => void) => {
  if (!userId) return () => {};
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as Partial<UserStats>);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
  });
};

// Add Transaction to Firestore
export const addTransactionToFirestore = async (userId: string, transaction: Transaction) => {
  if (!userId) return;
  try {
    const txRef = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(txRef, {
      ...transaction,
      userId
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/transactions/${transaction.id}`);
  }
};

// Fetch Transactions from Firestore
export const fetchTransactionsFromFirestore = async (userId: string): Promise<Transaction[]> => {
  if (!userId) return [];
  try {
    const txColl = collection(db, 'users', userId, 'transactions');
    const q = query(txColl, orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    const list: Transaction[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as Transaction);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/transactions`);
    return [];
  }
};

// Add Notification to Firestore
export const addNotificationToFirestore = async (userId: string, notification: { id: string; title: string; message: string; type: 'success' | 'info'; timestamp: string; read: boolean }) => {
  if (!userId) return;
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notification.id);
    await setDoc(notifRef, notification, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/notifications/${notification.id}`);
  }
};

// Fetch Notifications from Firestore
export const fetchNotificationsFromFirestore = async (userId: string) => {
  if (!userId) return [];
  try {
    const notifColl = collection(db, 'users', userId, 'notifications');
    const q = query(notifColl, orderBy('timestamp', 'desc'), limit(30));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/notifications`);
    return [];
  }
};

// Publish Global Announcement from Admin to Firestore
export const publishAnnouncementToFirestore = async (payload: {
  title?: string;
  message: string;
  category?: 'reward' | 'system' | 'security' | 'promo';
  type?: 'success' | 'info' | 'warning';
  actionTab?: 'home' | 'earn' | 'slap' | 'wallet' | 'profile';
  actionLabel?: string;
}) => {
  try {
    const annColl = collection(db, 'announcements');
    const newDoc = await addDoc(annColl, {
      title: payload.title || '📢 Official Announcement',
      message: payload.message,
      category: payload.category || 'promo',
      type: payload.type || 'info',
      actionTab: payload.actionTab || 'home',
      actionLabel: payload.actionLabel || 'Check App',
      timestamp: 'Just now',
      createdAt: Date.now()
    });

    const sysDoc = doc(db, 'system', 'announcement');
    await setDoc(sysDoc, {
      id: newDoc.id,
      title: payload.title || '📢 Official Announcement',
      message: payload.message,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return newDoc.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'announcements');
    throw err;
  }
};

// Subscribe to Global Announcements in Real-time
export const subscribeAnnouncementsFromFirestore = (
  onUpdate: (announcements: Array<{
    id: string;
    title: string;
    message: string;
    category: 'reward' | 'system' | 'security' | 'promo';
    type: 'success' | 'info' | 'warning';
    timestamp: string;
    createdAt?: number;
    actionTab?: 'home' | 'earn' | 'slap' | 'wallet' | 'profile';
    actionLabel?: string;
  }>) => void
) => {
  try {
    const annColl = collection(db, 'announcements');
    const q = query(annColl, orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'announcements');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'announcements');
    return () => {};
  }
};

// Subscribe to All Users in Real-Time (for Admin Dashboard Live Metrics)
export const subscribeAllUsersFromFirestore = (
  onUpdate: (users: Array<Partial<UserStats> & { id: string }>) => void
) => {
  try {
    const usersColl = collection(db, 'users');
    return onSnapshot(usersColl, (snap) => {
      const list: Array<Partial<UserStats> & { id: string }> = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Partial<UserStats>) });
      });
      onUpdate(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'users');
    return () => {};
  }
};

// Add Withdrawal Request to Firestore
export const addWithdrawalToFirestore = async (withdrawal: {
  id: string;
  userId: string;
  username: string;
  amountUsd: number;
  spDeducted: number;
  method: string;
  payoutDestination?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Under Review';
  dateRequested: string;
  createdAt: number;
}) => {
  try {
    const ref = doc(db, 'withdrawals', withdrawal.id);
    await setDoc(ref, withdrawal, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawal.id}`);
  }
};

// Subscribe to All Withdrawals in Real-Time (for Admin Dashboard)
export const subscribeWithdrawalsFromFirestore = (
  onUpdate: (withdrawals: any[]) => void
) => {
  try {
    const coll = collection(db, 'withdrawals');
    const q = query(coll, limit(100));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'withdrawals');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'withdrawals');
    return () => {};
  }
};

// Update Withdrawal status in Firestore
export const updateWithdrawalStatusInFirestore = async (withdrawalId: string, status: 'Pending' | 'Approved' | 'Rejected' | 'Under Review') => {
  try {
    const ref = doc(db, 'withdrawals', withdrawalId);
    await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawalId}`);
  }
};

// Add Security Incident Log to Firestore
export const addSecurityLogToFirestore = async (log: {
  id?: string;
  userId: string;
  username: string;
  eventType: 'Autoclicker CPS' | 'VPN/Proxy Detected' | 'Duplicate Device' | 'Clock Tampering' | 'Suspicious Payout Speed' | 'Multiple Account Limit';
  severity: 'High' | 'Medium' | 'Low' | 'Critical';
  details: string;
  ipAddress?: string;
  deviceId?: string;
  timestamp: string;
  status: 'Unresolved' | 'Investigating' | 'Resolved' | 'Auto-Blocked';
}) => {
  try {
    const logId = log.id || ('sec-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5));
    const ref = doc(db, 'security_logs', logId);
    await setDoc(ref, {
      ...log,
      id: logId,
      createdAt: Date.now()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'security_logs');
  }
};

// Subscribe to Real-Time Security Incident Logs
export const subscribeSecurityLogsFromFirestore = (
  onUpdate: (logs: any[]) => void
) => {
  try {
    const coll = collection(db, 'security_logs');
    const q = query(coll, orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'security_logs');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'security_logs');
    return () => {};
  }
};

// Save Security Rules Configuration to Firestore
export const saveSecurityRulesConfigToFirestore = async (config: {
  maxCpsThreshold: number;
  blockVpnProxy: boolean;
  maxAccountsPerDevice: number;
  enforceServerClock: boolean;
  minAccountAgeHoursForCashout: number;
  autoFreezeOnHighRisk: boolean;
}) => {
  try {
    const ref = doc(db, 'security_config', 'rules');
    await setDoc(ref, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'security_config/rules');
  }
};

// Subscribe to Security Rules Config in Real-Time
export const subscribeSecurityRulesConfigFromFirestore = (
  onUpdate: (config: any) => void
) => {
  try {
    const ref = doc(db, 'security_config', 'rules');
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'security_config/rules');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'security_config/rules');
    return () => {};
  }
};

// Save Economy & Payout Rules Configuration to Firestore
export const saveEconomyConfigToFirestore = async (config: Record<string, any>) => {
  try {
    const ref = doc(db, 'economy_config', 'rules');
    await setDoc(ref, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'economy_config/rules');
  }
};

// Subscribe to Economy & Payout Rules Config in Real-Time
export const subscribeEconomyConfigFromFirestore = (
  onUpdate: (config: any) => void
) => {
  try {
    const ref = doc(db, 'economy_config', 'rules');
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'economy_config/rules');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'economy_config/rules');
    return () => {};
  }
};

export interface LiveEarningEvent {
  id: string;
  userId: string;
  username: string;
  amount: number;
  title: string;
  timestamp: string;
}

// Real-time listener for live reward earnings (>= 500 SP)
export const subscribeLiveEarningsFromFirestore = (
  onNewEarning: (earning: LiveEarningEvent) => void
) => {
  const userCache = new Map<string, string>();

  try {
    const txCollGroup = collectionGroup(db, 'transactions');
    const q = query(txCollGroup, limit(40));

    return onSnapshot(q, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const amount = Number(data.amount) || 0;
          const type = data.type;

          if (type !== 'earn' || amount < 500 || data.status === 'failed') {
            continue;
          }

          const docId = change.doc.id || data.id;
          let userId = data.userId || change.doc.ref.parent?.parent?.id || '';
          let rawUsername = data.username || '';

          if (!rawUsername && userId) {
            if (userCache.has(userId)) {
              rawUsername = userCache.get(userId)!;
            } else {
              try {
                const userSnap = await getDoc(doc(db, 'users', userId));
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  rawUsername = userData.username || userData.email || 'Slapper';
                  userCache.set(userId, rawUsername);
                }
              } catch (e) {
                console.warn('[LiveEarnings] Error fetching user doc:', e);
              }
            }
          }

          if (!rawUsername) {
            rawUsername = 'Slapper';
          }

          onNewEarning({
            id: docId,
            userId,
            username: rawUsername,
            amount,
            title: data.title || 'Reward Claimed',
            timestamp: data.timestamp || new Date().toISOString()
          });
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'transactions');
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'transactions');
    return () => {};
  }
};
