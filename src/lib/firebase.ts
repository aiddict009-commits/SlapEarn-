import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer, 
  onSnapshot, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy, 
  limit, 
  updateDoc 
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';
import { UserStats, Transaction } from '../types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore using standard getFirestore with project databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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

// Validate Connection to Firestore on Boot gracefully
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testFirestoreConnection();

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

  // First check if email or username already exists in Firestore
  const usersRef = collection(db, 'users');
  try {
    const emailQuery = query(usersRef, where('email', '==', emailClean));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const err: any = new Error('This email is already registered. Please log in instead.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const usernameQuery = query(usersRef, where('username', '==', usernameClean));
    const usernameSnap = await getDocs(usernameQuery);
    if (!usernameSnap.empty) {
      const suggestion = `${usernameClean}${Math.floor(100 + Math.random() * 899)}`;
      const err: any = new Error(`This username "${usernameClean}" is already taken. Please choose another username.`);
      err.code = 'auth/username-already-in-use';
      err.suggestedUsername = suggestion;
      throw err;
    }
  } catch (checkErr: any) {
    if (checkErr.code === 'auth/email-already-in-use' || checkErr.code === 'auth/username-already-in-use') {
      throw checkErr;
    }
    console.warn('Firestore pre-check query notice:', checkErr);
  }

  let uid = '';

  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailClean, passwordClean);
    uid = userCred.user.uid;
  } catch (authErr: any) {
    if (
      authErr.code === 'auth/operation-not-allowed' || 
      authErr.code === 'auth/admin-restricted-operation' ||
      authErr.code === 'auth/configuration-not-found'
    ) {
      console.warn('Firebase Email/Password auth method not enabled in console. Using Firestore server authentication account.');
      uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    } else {
      throw authErr;
    }
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
    slapsToday: 70, // 30 slaps starting available (100 max - 70 used = 30)
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
    createdAt: Date.now()
  };

  // Create initial user document on server (Firestore)
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, initialStats, { merge: true });

    // Add initial starter transaction in subcollection
    const txRef = doc(db, 'users', uid, 'transactions', 'tx-starter-welcome');
    await setDoc(txRef, {
      id: 'tx-starter-welcome',
      type: 'earn',
      amount: 100,
      title: 'Starter Signup Balance',
      category: 'Daily Check-in',
      timestamp: new Date().toISOString(),
      status: 'completed'
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Initial Firestore document write notice:', fsErr);
    handleFirestoreError(fsErr, OperationType.WRITE, `users/${uid}`);
  }

  // Persist session locally
  localStorage.setItem('slapearn_active_uid', uid);
  localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(initialStats));

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
    if (
      authErr.code === 'auth/operation-not-allowed' ||
      authErr.code === 'auth/admin-restricted-operation' ||
      authErr.code === 'auth/configuration-not-found' ||
      authErr.code === 'auth/invalid-credential' ||
      authErr.code === 'auth/wrong-password' ||
      authErr.code === 'auth/user-not-found' ||
      authErr.code === 'auth/invalid-email'
    ) {
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
      localStorage.setItem('slapearn_active_uid', uid);
      localStorage.setItem(`slapearn_stats_${uid}`, JSON.stringify(fullStats));
      return { uid, stats: fullStats };
    } else {
      throw authErr;
    }
  }

  throw new Error('Server login failed. Please check your credentials.');
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
    await setDoc(txRef, transaction, { merge: true });
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

    // Also write to active system announcement banner
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



