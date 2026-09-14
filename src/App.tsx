import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  X,
  Bell,
  Home as HomeIcon,
  Coins,
  Hand,
  Wallet,
  User as UserIcon,
  Flame,
  ShieldAlert,
  Clock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WifiOff
} from 'lucide-react';

import { sound } from './utils/sound';
import { UserStats, Transaction, EconomyConfig, DEFAULT_ECONOMY_CONFIG } from './types';
import { processTitleUnlocks } from './utils/titles';
import {
  timeManager,
  TimeSyncState,
  resyncServerTime,
  dismissTimeWarning,
  getServerNow,
  getServerDateString,
  getRemainingTimeToDailyReset,
} from './utils/timeManager';
import { proxyGuard, NetworkSecurityStatus } from './utils/proxyGuard';
import {
  auth,
  db,
  logoutUserInFirebase,
  addTransactionToFirestore,
  fetchTransactionsFromFirestore,
  addNotificationToFirestore,
  subscribeAnnouncementsFromFirestore,
  subscribeEconomyConfigFromFirestore,
  registerOrInitUserApi
} from './lib/firebase';
import {
  loadUserData,
  flushPendingUserStats,
  markDirtyAndScheduleSave,
  saveOnEvent,
  resetCloudSaveState
} from './lib/cloudSave';
import { getRedirectResult, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// Import subcomponents
import Home from './components/Home';
import SlapGame from './components/SlapGame';
import EarnView from './components/EarnView';
import Redeem from './components/Redeem';
import ProfileView from './components/ProfileView';
import BootSplash from './components/BootSplash';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { NotificationsPanel, AppNotification } from './components/NotificationsPanel';
import { AnimatedOdometer } from './components/AnimatedOdometer';
import LiveEarningsPopup from './components/LiveEarningsPopup';
import ProxyAlertOverlay from './components/ProxyAlertOverlay';
import LegalPage from './components/LegalPage';
import {
  bootstrapAutoSession,
  readStoredSessionProfile,
  upgradeSessionToTelegram,
  SessionUser,
} from './lib/autoSession';
import { initTelegramChrome, isTelegramEnvironment } from './lib/telegramSdk';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info';
}

const INITIAL_STATS: UserStats = {
  createdAt: Date.now(),
  coins: 100, // 100 SP automatically after signup
  totalEarned: 100,
  xp: 0, 
  level: 1,
  streak: 0, 
  lastCheckIn: null,
  slapsToday: 70, // 30 slaps starting available (100 max - 70 = 30)
  maxSlapsPerDay: 100, // Capped at 100 slaps max
  bestCombo: 0,
  daysActive: 0,
  referrals: 0,
  adsWatchedToday: 0,
  totalAdsWatchedLifetime: 0,
  hasClaimedStarterPack: true,
  lastActiveDate: getServerDateString(),
  selectedHand: 'wooden',
  unlockedHands: ['wooden'],
  referralsList: [],
  referralsForCurrentWithdrawal: 0,
  slapsPlayedToday: 0,
  charactersDefeatedToday: 0,
  spEarnedToday: 0,
  surveysCompletedToday: 0,
  offersCompletedToday: 0,
  claimedDailyChallenges: []
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-starter-welcome',
    type: 'earn',
    amount: 100,
    title: 'Starter Balance',
    category: 'Daily Check-in',
    timestamp: new Date().toISOString(),
    status: 'completed'
  }
];

export default function App() {
  // Server-based central state (No local storage loading)
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Internet connectivity state (Constant internet connection required)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Always keep statsRef up-to-date for timers & unload events
  const statsRef = useRef<UserStats>(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Auth state driven by Firebase Auth & Cloud Save
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  // Session started without any cloud auth (no Firebase credentials reachable)
  const [isLocalSession, setIsLocalSession] = useState<boolean>(false);
  const [bootError, setBootError] = useState<string | null>(null);

  // True when the app runs inside the Telegram Mini App / Telegram Web frame
  const [inTelegram] = useState<boolean>(() => isTelegramEnvironment());

  // Telegram Mini App chrome (expand viewport, match colours, keep swipes from closing the game)
  useEffect(() => {
    initTelegramChrome();
  }, []);

  // Legal route state for direct URL visits to /terms or /privacy
  const [legalRoute, setLegalRoute] = useState<'terms' | 'privacy' | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/terms' || path.startsWith('/terms')) return 'terms';
      if (path === '/privacy' || path.startsWith('/privacy')) return 'privacy';
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/terms' || path.startsWith('/terms')) {
        setLegalRoute('terms');
      } else if (path === '/privacy' || path.startsWith('/privacy')) {
        setLegalRoute('privacy');
      } else {
        setLegalRoute(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // =========================================================================
  // FORMLESS SESSION BOOTSTRAP
  // -------------------------------------------------------------------------
  // SlapEarn no longer shows a sign-up or login screen. Firebase Auth state is
  // the single source of truth and, when no session exists yet, the app
  // bootstraps one automatically:
  //   Telegram Mini App  -> signed initData verified by the API -> custom token
  //   Plain browser      -> anonymous Firebase session (instant guest)
  //   No server creds    -> server-signed guest token, or a local-only session
  // =========================================================================
  const bootstrapStartedRef = useRef(false);
  const telegramUpgradeAttemptedRef = useRef(false);

  const applyLocalSession = useCallback((sessionUser: SessionUser, warnings: string[]) => {
    const localStatsKey = `slapearn_stats_${sessionUser.uid}`;
    let restored: UserStats = { ...INITIAL_STATS };
    try {
      const raw = localStorage.getItem(localStatsKey);
      if (raw) restored = { ...restored, ...JSON.parse(raw) };
    } catch {
      /* corrupted cache — start from the default profile */
    }

    restored = {
      ...restored,
      uid: sessionUser.uid,
      username: restored.username || sessionUser.username,
    };

    localStorage.setItem('slapearn_active_uid', sessionUser.uid);
    setStats(restored);
    setTransactions([...INITIAL_TRANSACTIONS]);
    setAuthUser({
      ...sessionUser,
      username: restored.username || sessionUser.username,
      myReferralCode: restored.myReferralCode || sessionUser.myReferralCode,
      country: restored.country || sessionUser.country,
    });
    setFirebaseUid(null);
    setIsLocalSession(true);
    setIsAuthenticated(true);
    setIsAuthLoading(false);
    if (warnings.includes('LOCAL_ONLY_SESSION')) {
      addNotification('Offline Session Started', 'Cloud sync is unavailable right now — progress is kept on this device.', 'info');
    }
  }, []);

  const applyFirebaseSession = useCallback(async (firebaseUser: FirebaseUser) => {
    const activeUid = firebaseUser.uid;
    console.log('AUTH STATE:', activeUid);
    localStorage.setItem('slapearn_active_uid', activeUid);
    setFirebaseUid(activeUid);
    setIsAuthenticated(true);
    setIsLocalSession(false);
    setBootError(null);

    try {
      // Server-enforced device registration & multi-account limit check (Fix 5)
      await registerOrInitUserApi();
    } catch (regErr: any) {
      console.warn('[Auth] Server registration/device limit check:', regErr);
      if (regErr?.message?.includes('MAX_ACCOUNTS') || regErr?.message?.includes('Maximum account limit')) {
        addNotification('Device Limit Notice', 'This device already has the maximum number of linked accounts.', 'info');
      }
    }

    // Load user stats ONCE from Cloud Save System (Firestore + Local Cache)
    const sessionProfile = readStoredSessionProfile();
    const loadedStats = await loadUserData(activeUid, INITIAL_STATS);
    const mergedStats: UserStats = {
      ...loadedStats,
      uid: activeUid,
      username: loadedStats.username || sessionProfile?.username || firebaseUser.displayName || 'Slapper',
      country: loadedStats.country || sessionProfile?.country || 'South Africa 🇿🇦',
      myReferralCode: loadedStats.myReferralCode || sessionProfile?.myReferralCode || `SLAP-${activeUid.slice(0, 6).toUpperCase()}`,
    };
    setStats(mergedStats);
    if (!loadedStats.username) {
      markDirtyAndScheduleSave(activeUid, mergedStats);
    }

    setAuthUser({
      uid: activeUid,
      username: mergedStats.username || 'Slapper',
      email: mergedStats.email || firebaseUser.email || '',
      myReferralCode: mergedStats.myReferralCode || `SLAP-${activeUid.slice(0, 6).toUpperCase()}`,
      handle: sessionProfile?.handle,
      avatarUrl: sessionProfile?.avatarUrl || (firebaseUser as any).photoURL || '',
      country: mergedStats.country,
      provider: sessionProfile?.provider || 'guest',
      verified: sessionProfile?.verified ?? false,
      telegramId: sessionProfile?.telegramId,
      startParam: sessionProfile?.startParam ?? null,
    });

    // Fetch transactions from server & cache
    const remoteTxs = await fetchTransactionsFromFirestore(activeUid);
    const cachedTxsRaw = localStorage.getItem(`slapearn_txs_${activeUid}`);
    const cachedTxs = cachedTxsRaw ? JSON.parse(cachedTxsRaw) : [];

    if (remoteTxs && remoteTxs.length > 0) {
      setTransactions(remoteTxs);
    } else if (cachedTxs.length > 0) {
      setTransactions(cachedTxs);
    }
    setIsAuthLoading(false);

    // Opened inside Telegram with a pre-existing (guest) session? Link the two so
    // the player keeps their progress under their Telegram account.
    if (!telegramUpgradeAttemptedRef.current && (inTelegram || (typeof window !== 'undefined' && window.location.search.includes('hash=')))) {
      telegramUpgradeAttemptedRef.current = true;
      const upgrade = await upgradeSessionToTelegram(firebaseUser);
      if (upgrade.status === 'linked') {
        addNotification('Telegram Linked', 'Your Telegram account is now linked to this session.', 'success');
        setAuthUser((prev) => (prev && upgrade.user ? { ...prev, ...upgrade.user } : prev));
      } else if (upgrade.status === 'failed') {
        console.warn('[Auth] Telegram linking skipped:', upgrade.message);
      }
    }
  }, [inTelegram]);

  const runAutoBootstrap = useCallback(async () => {
    try {
      const result = await bootstrapAutoSession();
      result.warnings.forEach((warning) => console.warn('[AutoSession]', warning));

      if (result.mode === 'firebase' && auth.currentUser) {
        return; // the auth listener below takes over and loads the profile
      }
      applyLocalSession(result.user, result.warnings);
    } catch (err: any) {
      console.error('[AutoSession] Session bootstrap failed:', err);
      setBootError('Could not start a session on this device. Check your connection and try again.');
      setIsAuthLoading(false);
    }
  }, [applyLocalSession]);

  // Listen to real-time Firebase Auth status — this is what starts the app now
  useEffect(() => {
    // Handle a pending Google redirect result (legacy accounts only)
    getRedirectResult(auth)
      .then((r) => {
        if (r) console.log('redirect ok', r.user.uid);
      })
      .catch((e) => console.error('redirect error', e));

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await applyFirebaseSession(user);
        return;
      }

      // No (usable) persisted session -> bootstrap one, exactly once.
      if (bootstrapStartedRef.current) return;
      bootstrapStartedRef.current = true;
      console.log('[Auth] No session found — starting formless bootstrap (Telegram / guest).');
      await runAutoBootstrap();
    });

    return () => unsub();
  }, [applyFirebaseSession, runAutoBootstrap]);

  // Local-only sessions keep their progress on this device
  useEffect(() => {
    if (!isLocalSession || !authUser?.uid) return;
    const storageKey = `slapearn_stats_${authUser.uid}`;
    const persist = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(statsRef.current));
      } catch {
        /* storage full / private mode */
      }
    };
    const interval = setInterval(persist, 5000);
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', persist);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', persist);
      document.removeEventListener('visibilitychange', persist);
      persist();
    };
  }, [isLocalSession, authUser?.uid]);

  // Hilltop Push Notification Script - Loaded once only after user authentication (NOT on landing page)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (document.getElementById('hilltop-push-loader')) return;
    const s = document.createElement('script');
    s.id = 'hilltop-push-loader';
    s.src = 'https://juvenilechoice.com/brXbVFstd.Gyld0LYxWZcQ/pewmY9/u-ZvUDlYkLPYT/cLz/MjztMp3cMYD/EOtvN/zCMOz-MBzRc/wsNRQX';
    s.async = true;
    s.referrerPolicy = 'no-referrer-when-downgrade';
    document.body.appendChild(s);
  }, [isAuthenticated]);

  // Real-time Firestore document sync for users/{uid} (captures server-side reward & balance changes live)
  useEffect(() => {
    if (!firebaseUid) return;
    try {
      const userRef = doc(db, 'users', firebaseUid);
      const unsubscribe = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<UserStats>;
          setStats((prev) => ({
            ...prev,
            ...remoteData,
          }));
        }
      }, (err) => {
        console.warn('[Firestore] Realtime user stats sync notice:', err);
      });
      return () => unsubscribe();
    } catch {
      return () => {};
    }
  }, [firebaseUid]);

  // Real-time Firestore sync for users/{uid}/transactions
  useEffect(() => {
    if (!firebaseUid) return;
    try {
      const txColl = collection(db, 'users', firebaseUid, 'transactions');
      const q = query(txColl, orderBy('timestamp', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snap) => {
        const txs: Transaction[] = [];
        snap.forEach((d) => {
          txs.push({ id: d.id, ...d.data() } as Transaction);
        });
        if (txs.length > 0) {
          setTransactions(txs);
        }
      }, () => {});
      return () => unsubscribe();
    } catch {
      return () => {};
    }
  }, [firebaseUid]);

  // Background auto-save interval (every 30 seconds), tab hide / unload, and online reconnection listener
  useEffect(() => {
    if (!firebaseUid) return;

    // 1. Periodic 30-second background save if dirty
    const autoSaveInterval = setInterval(() => {
      flushPendingUserStats(firebaseUid, statsRef.current);
    }, 30000);

    // 2. Unload / visibility change save
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingUserStats(firebaseUid, statsRef.current, true);
      }
    };

    const handleBeforeUnload = () => {
      flushPendingUserStats(firebaseUid, statsRef.current, true);
    };

    // 3. Online reconnection handler to flush any pending offline save
    const handleOnlineSync = () => {
      flushPendingUserStats(firebaseUid, statsRef.current, true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnlineSync);

    return () => {
      clearInterval(autoSaveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnlineSync);
    };
  }, [firebaseUid]);

  // Switch navigation tabs
  const [activeTab, setActiveTab] = useState<'home' | 'earn' | 'slap' | 'wallet' | 'profile'>('slap');
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuteStatus());
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState<boolean>(false);
  const [economyConfig, setEconomyConfig] = useState<EconomyConfig>(DEFAULT_ECONOMY_CONFIG);

  // Real-time Firestore subscription to global economyConfig rules
  useEffect(() => {
    const unsubscribe = subscribeEconomyConfigFromFirestore((config) => {
      setEconomyConfig(config);
    });
    return () => unsubscribe();
  }, []);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(3);

  // Proxy & VPN Security State
  const [proxyStatus, setProxyStatus] = useState<NetworkSecurityStatus>(() => proxyGuard.getStatus());

  useEffect(() => {
    const unsubscribe = proxyGuard.subscribe((status) => {
      setProxyStatus(status);
    });
    return unsubscribe;
  }, []);

  // Central Authoritative Server Time Synchronization State
  const [timeSyncState, setTimeSyncState] = useState<TimeSyncState>(() => timeManager.getState());
  const [isResyncingTime, setIsResyncingTime] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = timeManager.subscribe((state) => {
      setTimeSyncState(state);
    });
    return unsubscribe;
  }, []);

  const handleResyncTime = async () => {
    sound.playSlap();
    setIsResyncingTime(true);
    try {
      await resyncServerTime();
      sound.playSuccess();
      addNotification('Server Time Synced', 'Authoritative server clock synchronized successfully.', 'success');
    } catch {
      addNotification('Offline Notice', 'Operating on offline monotonic baseline.', 'info');
    } finally {
      setIsResyncingTime(false);
    }
  };

  // Sessions are managed automatically: Telegram, instant guest or local.
  // The old e-mail/password handlers were removed together with AuthScreen.
  const handleLogout = async () => {
    sound.playSuccess();

    // Telegram & guest sessions are automatic — signing out would simply create
    // a brand new empty account, so the action is intentionally neutralised.
    if (authUser && authUser.provider !== 'local' && !authUser.email) {
      addNotification('Sign-out Disabled', 'Your session is linked automatically. Progress stays safe on this account.', 'info');
      return;
    }

    if (firebaseUid && statsRef.current) {
      try {
        await saveOnEvent(firebaseUid, statsRef.current, 'sign_out');
        localStorage.setItem(`slapearn_txs_${firebaseUid}`, JSON.stringify(transactions));
      } catch (err) {
        console.warn('Sync on logout failed:', err);
      }
    }
    resetCloudSaveState();
    if (firebaseUid) {
      await logoutUserInFirebase();
    }
    localStorage.removeItem('slapearn_active_uid');
    window.location.reload();
  };

  // Real-time listener for announcements broadcasted from Admin Dashboard
  useEffect(() => {
    const unsubscribe = subscribeAnnouncementsFromFirestore((announcements) => {
      if (!announcements || announcements.length === 0) return;
      const latest = announcements[0];
      const lastSeenId = localStorage.getItem('slapearn_last_seen_announcement_id');
      if (latest && latest.id !== lastSeenId) {
        localStorage.setItem('slapearn_last_seen_announcement_id', latest.id);
        addNotification(
          latest.title || '📢 Official Announcement',
          latest.message,
          (latest.type as any) || 'info'
        );
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('slapearn_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Automatic daily reset when the server calendar day rolls over (at 00:00:00 UTC)
  useEffect(() => {
    const checkDailyReset = () => {
      const todayStr = getServerDateString();
      const serverNow = getServerNow();
      
      setStats((prev) => {
        let updated = { ...prev };
        let changed = false;

        // 1. Daily reset of ads watched & daily challenges at 00:00 (slaps do NOT reset, preserving user's slaps balance from previous day)
        if (!prev.lastActiveDate || prev.lastActiveDate !== todayStr) {
          updated.adsWatchedToday = 0;
          updated.slapsPlayedToday = 0;
          updated.charactersDefeatedToday = 0;
          updated.spEarnedToday = 0;
          updated.surveysCompletedToday = 0;
          updated.offersCompletedToday = 0;
          updated.whackAMolePlayedToday = 0;
          updated.totalDamageDealtToday = 0;
          updated.claimedDailyChallenges = [];
          updated.lastActiveDate = todayStr;
          changed = true;
        }

        // 2. Check if streak is broken (missed calendar days)
        if (prev.lastCheckIn) {
          const checkInMs = new Date(prev.lastCheckIn).getTime();
          if (!isNaN(checkInMs)) {
            const checkInDateStr = getServerDateString(checkInMs);
            if (checkInDateStr !== todayStr) {
              const checkInParts = checkInDateStr.split('-').map(Number);
              const todayParts = todayStr.split('-').map(Number);
              const checkInUtcDays = Date.UTC(checkInParts[0], checkInParts[1] - 1, checkInParts[2]) / (1000 * 60 * 60 * 24);
              const todayUtcDays = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]) / (1000 * 60 * 60 * 24);
              const dayDiff = todayUtcDays - checkInUtcDays;

              // If more than 1 day has passed without checking in (e.g. yesterday was skipped), reset streak to 0
              if (dayDiff > 1 && (updated.streak || 0) > 0) {
                updated.streak = 0;
                changed = true;
              }
            }
          }
        }

        return changed ? updated : prev;
      });
    };

    // Run check immediately on mount
    checkDailyReset();

    // Set precise timeout for the exact next 00:00:00 UTC rollover
    let midnightTimeout: NodeJS.Timeout | null = null;
    const scheduleNextMidnight = () => {
      const remaining = getRemainingTimeToDailyReset();
      // Add a small 100ms cushion to guarantee crossing 00:00:00.000
      const delay = Math.max(100, remaining.totalMs + 100);
      midnightTimeout = setTimeout(() => {
        checkDailyReset();
        scheduleNextMidnight();
      }, delay);
    };
    scheduleNextMidnight();

    // Check periodically every 5 seconds in case of backgrounding/sleep
    const interval = setInterval(checkDailyReset, 5000);

    // Check on window focus or visibility change
    window.addEventListener('focus', checkDailyReset);
    document.addEventListener('visibilitychange', checkDailyReset);

    return () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      clearInterval(interval);
      window.removeEventListener('focus', checkDailyReset);
      document.removeEventListener('visibilitychange', checkDailyReset);
    };
  }, []);

  // Title Unlocks and Rewards check on Level changes or app init
  useEffect(() => {
    const { updatedStats, newNotifications } = processTitleUnlocks(stats);
    
    // Check if stats changed
    const claimedChanged = (updatedStats.claimedTitleRewards?.length || 0) !== (stats.claimedTitleRewards?.length || 0);
    const titleChanged = updatedStats.equippedTitle !== stats.equippedTitle;
    const frameChanged = updatedStats.equippedFrame !== stats.equippedFrame;

    if (claimedChanged || titleChanged || frameChanged) {
      setStats(updatedStats);
      for (const note of newNotifications) {
        addNotification(note.title, note.message, 'success');
      }
    }
  }, [stats.level]);

  // Helper to add notification toasts
  const addNotification = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setNotifications((prev) => [...prev, { id, title, message, type }]);

    // Also persist into Notifications Panel history
    try {
      const existing: AppNotification[] = JSON.parse(
        localStorage.getItem('slapearn_notifications_history') || '[]'
      );
      const newPanelItem: AppNotification = {
        id: `note-${Date.now()}`,
        title,
        message,
        category: type === 'success' ? 'reward' : 'system',
        timestamp: 'Just now',
        read: false,
        type
      };
      const updated = [newPanelItem, ...existing].slice(0, 30); // keep up to 30 items
      localStorage.setItem('slapearn_notifications_history', JSON.stringify(updated));

      if (firebaseUid) {
        addNotificationToFirestore(firebaseUid, {
          id: newPanelItem.id,
          title,
          message,
          type,
          timestamp: new Date().toISOString(),
          read: false
        });
      }
    } catch {
      // ignore storage errors
    }

    // Auto dismiss toast after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
    addNotification(
      nextMute ? 'SFX Audio Muted' : 'SFX Audio Enabled',
      nextMute ? 'Sound feedback disabled.' : 'Enjoy interactive slapping chimes!',
      'info'
    );
  };

  // Central reward trigger
  const updateCoinsAndXp = (
    coinReward: number,
    xpReward: number,
    category: Transaction['category'],
    title: string
  ) => {
    if (stats.isRestricted || stats.status === 'Restricted' || stats.status === 'Frozen') {
      sound.playError();
      addNotification(
        'Account Restricted',
        'Your account is currently restricted by admin. Earning rewards is disabled.',
        'info'
      );
      return;
    }

    let nextStatsState: UserStats | null = null;

    setStats((prev) => {
      let nextXp = prev.xp + xpReward;
      let nextLevel = prev.level;
      let leveledUp = false;

      // Experience threshold formula (e.g. 650 XP per level)
      const xpThreshold = nextLevel * 650;
      if (nextXp >= xpThreshold) {
        nextXp -= xpThreshold;
        nextLevel += 1;
        leveledUp = true;
      }

      const nextCoins = prev.coins + coinReward;
      const nextTotal = prev.totalEarned + coinReward;

      if (leveledUp) {
        setTimeout(() => {
          sound.playLevelUp();
          addNotification(
            '🎉 LEVEL COMPLETED!',
            `Awesome job! You reached Level ${nextLevel}! Claimed +300 Coins level bonus.`,
            'success'
          );
          updateCoinsAndXp(300, 0, 'Level Up', `Reached Player Level ${nextLevel}`);
        }, 300);
      }

      const baseStats = {
        ...prev,
        coins: nextCoins,
        totalEarned: nextTotal,
        spEarnedToday: (prev.spEarnedToday || 0) + Math.max(0, coinReward),
        xp: nextXp,
        level: nextLevel,
        maxSlapsPerDay: 100
      };

      const { updatedStats, newNotifications } = processTitleUnlocks(baseStats);

      if (newNotifications.length > 0) {
        setTimeout(() => {
          for (const note of newNotifications) {
            addNotification(note.title, note.message, 'success');
          }
        }, 400);
      }

      nextStatsState = updatedStats;
      return updatedStats;
    });

    if (firebaseUid && nextStatsState) {
      const isHighValueEvent = ['Ad', 'Survey', 'Offerwall', 'Level Up', 'Daily Check-in'].includes(category);
      if (isHighValueEvent) {
        saveOnEvent(firebaseUid, nextStatsState, category);
      } else {
        markDirtyAndScheduleSave(firebaseUid, nextStatsState);
      }
    }

    // Record Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'earn',
      amount: coinReward,
      title,
      category,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    setTransactions((prev) => [newTx, ...prev]);
    if (firebaseUid) {
      addTransactionToFirestore(firebaseUid, newTx);
    }
  };

  // Central coin deduction trigger
  const deductCoins = (
    amount: number,
    title: string,
    category: Transaction['category']
  ): boolean => {
    if (stats.isRestricted || stats.status === 'Restricted' || stats.status === 'Frozen') {
      sound.playError();
      addNotification(
        'Account Restricted',
        'Your account is currently restricted by admin. Redeeming points is disabled.',
        'info'
      );
      return false;
    }

    let success = false;
    let newTx: Transaction | null = null;
    let nextStatsState: UserStats | null = null;

    setStats((prev) => {
      if (prev.coins < amount) return prev;
      success = true;
      nextStatsState = {
        ...prev,
        coins: prev.coins - amount
      };
      return nextStatsState;
    });

    if (success) {
      if (firebaseUid && nextStatsState) {
        saveOnEvent(firebaseUid, nextStatsState, 'withdrawal_requested');
      }

      newTx = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'redeem',
        amount,
        title,
        category,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      setTransactions((prev) => [newTx!, ...prev]);
      if (firebaseUid && newTx) {
        addTransactionToFirestore(firebaseUid, newTx);
      }
    }

    return success;
  };

  const updateStatsDirectly = (newStats: Partial<UserStats>, eventName?: string) => {
    setStats((prev) => {
      const updated = { ...prev, ...newStats };
      if (firebaseUid) {
        if (eventName) {
          saveOnEvent(firebaseUid, updated, eventName);
        } else {
          markDirtyAndScheduleSave(firebaseUid, updated);
        }
      }
      return updated;
    });
  };

  // Compute stats info
  const xpThreshold = stats.level * 650;
  const xpProgressPercent = Math.min(100, (stats.xp / xpThreshold) * 100);

  // If user navigated directly to /terms or /privacy
  if (legalRoute) {
    return (
      <LegalPage
        initialTab={legalRoute}
        onNavigateHome={() => {
          sound.playSlap();
          setLegalRoute(null);
          window.history.pushState(null, '', '/');
        }}
      />
    );
  }

  return (
    <div
      className={`h-[100dvh] w-screen overflow-hidden bg-[#FDFBF2] text-slate-800 flex items-center justify-center font-sans selection:bg-[#FFEAF0] selection:text-[#E33D6F] ${
        inTelegram ? 'p-0' : 'p-0 sm:p-4 sm:bg-[#111317]'
      }`}
      id="slapearn-main-app"
    >
      {/* Global Fullscreen Proxy / VPN Security Red Alert Overlay */}
      <ProxyAlertOverlay status={proxyStatus} />
      
      {/* Smartphone Viewport Card Mockup (Telegram Mini App renders edge-to-edge instead) */}
      <div
        className={`w-full h-[100dvh] bg-[#FDFBF2] flex flex-col overflow-hidden relative ${
          inTelegram
            ? 'max-w-none shadow-none'
            : 'sm:h-[860px] sm:max-w-[420px] sm:rounded-[48px] sm:border-8 sm:border-slate-900 shadow-2xl'
        }`}
        id="mobile-viewport"
      >
        
        {/* Notch details for Desktop Mockup view (never shown inside Telegram) */}
        {!inTelegram && (
          <div className="hidden sm:flex absolute top-0 left-0 right-0 h-6 bg-slate-900 z-50 items-center justify-center gap-1.5 rounded-t-xl">
            <div className="w-12 h-1 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full absolute right-8" />
          </div>
        )}

        {!isOnline && (
          <div 
            className="sticky top-0 z-[999] bg-amber-500 text-slate-950 px-3 py-1.5 text-center font-black text-xs flex items-center justify-center gap-2 border-b-2 border-slate-950 shadow-sm"
            id="internet-offline-banner"
          >
            <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span>Offline mode: Live rewards will sync automatically once connection is restored.</span>
          </div>
        )}

        {timeSyncState.isWarningVisible && !timeSyncState.isSynced && (
          <div 
            className="sticky top-0 z-[998] bg-yellow-400 text-slate-950 px-3 py-1 text-center font-black text-[11px] flex items-center justify-between gap-2 border-b border-slate-950"
            id="time-sync-soft-banner"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Using cached server time. Accurate countdowns maintained.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResyncTime}
                disabled={isResyncingTime}
                className="underline hover:text-slate-800 cursor-pointer"
              >
                {isResyncingTime ? 'Syncing...' : 'Sync'}
              </button>
              <button
                onClick={() => dismissTimeWarning()}
                className="p-0.5 hover:bg-slate-950/10 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {!isAuthenticated ? (
          <BootSplash
            label={inTelegram ? 'Verifying your Telegram account…' : 'Setting up your game session…'}
            error={bootError}
            hint={bootError ? 'SlapEarn needs Firebase to store your rewards. Retry, or contact support if this persists.' : null}
            onRetry={() => {
              sound.playSlap();
              setBootError(null);
              setIsAuthLoading(true);
              bootstrapStartedRef.current = false;
              void runAutoBootstrap();
            }}
          />
        ) : (
          <>
            {/* Dynamic Mobile Header */}
            <header className="bg-[#FDFBF2] px-4 py-2.5 flex justify-between items-center select-none shrink-0" id="slapearn-header">
              {/* Logo Brand Title */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <div 
                    className="flex items-center font-sans font-black text-[25px] italic select-none tracking-[-0.06em] origin-left rotate-[-3deg]"
                    style={{
                      textShadow: "2.5px 2.5px 0px #0F172A, -1.5px -1.5px 0px #0F172A, 1.5px -1.5px 0px #0F172A, -1.5px 1.5px 0px #0F172A"
                    }}
                  >
                    <span className="text-white">Slap</span>
                    <span className="text-[#FF2B6D] -ml-0.5">Earn</span>
                  </div>
                  {stats.username && (
                    <span className="text-[10px] font-extrabold text-slate-500 -mt-1 truncate max-w-[90px]">
                      @{stats.username}
                    </span>
                  )}
                </div>
              </div>

              {/* Header Stats Pills as in user's screenshot */}
              <div className="flex items-center gap-1.5">
                {/* Proxy / VPN Security Pill */}
                {proxyStatus.isProxyDetected && (
                  <button
                    onClick={() => {
                      setActiveTab('earn');
                      addNotification('VPN / Proxy Detected', 'Offerwalls & surveys are paused until connection is verified clean.', 'info');
                    }}
                    className="flex items-center gap-1 bg-rose-500 border-2 border-slate-900 px-2 py-1 rounded-full text-xs font-black text-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] animate-pulse cursor-pointer"
                    title="Public Proxy / VPN Detected - Offerwalls & Surveys Paused!"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-white stroke-[2.5px]" />
                    <span className="font-sans font-black tracking-tight text-[10px]">VPN Active</span>
                  </button>
                )}

                {/* Coins pill */}
                <div className="flex items-center gap-1 bg-[#FFD043] border-2 border-slate-900 px-2.5 py-1 rounded-full text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                  <Coins className="w-3.5 h-3.5 text-slate-950 stroke-[2.5px]" />
                  <AnimatedOdometer value={stats.coins} className="font-sans font-black tracking-tight" />
                </div>

                {/* Notifications Bell Icon Button */}
                <button
                  onClick={() => { sound.playSlap(); setIsNotificationPanelOpen(true); }}
                  className="relative flex items-center justify-center w-7 h-7 bg-white border-2 border-slate-900 rounded-full shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-transform cursor-pointer"
                  title="Notifications & Activity"
                  id="header-notification-bell-btn"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-950 stroke-[2.5px]" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#00D09E] text-slate-950 font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-950 animate-pulse">
                      !
                    </span>
                  )}
                </button>
              </div>
            </header>

            {/* Maintenance Mode & Double SP Event Header Banners */}
            {economyConfig.maintenanceMode && (
              <div className="bg-rose-600 text-white border-b-2 border-slate-900 px-3 py-1.5 font-black text-xs text-center flex items-center justify-center gap-2 shadow-sm z-30 shrink-0" id="maintenance-mode-banner">
                <ShieldAlert className="w-4 h-4 animate-bounce" />
                <span>MAINTENANCE MODE ACTIVE - Admin system changes in progress</span>
              </div>
            )}

            {economyConfig.doubleSpEventActive && !economyConfig.maintenanceMode && (
              <div className="bg-[#FF3B77] text-white border-b-2 border-slate-900 px-3 py-1 font-black text-xs text-center flex items-center justify-center gap-2 shadow-sm z-30 shrink-0" id="double-sp-event-banner">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>⚡ 2x SP WEEKEND EVENT IS LIVE! Double earnings across all slaps & ads!</span>
              </div>
            )}

            {/* Dynamic View Scrollport */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-4 scrollbar-none" id="slapearn-active-view-container">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="min-h-full"
                >
                  {activeTab === 'home' && (
                    <Home
                      stats={stats}
                      updateCoinsAndXp={updateCoinsAndXp}
                      updateStatsDirectly={updateStatsDirectly}
                      addNotification={addNotification}
                      economyConfig={economyConfig}
                    />
                  )}

                  {activeTab === 'earn' && (
                    <EarnView
                      stats={stats}
                      updateCoinsAndXp={updateCoinsAndXp}
                      updateStatsDirectly={updateStatsDirectly}
                      addNotification={addNotification}
                      economyConfig={economyConfig}
                    />
                  )}

                  {activeTab === 'slap' && (
                    <SlapGame
                      stats={stats}
                      updateCoinsAndXp={updateCoinsAndXp}
                      updateStatsDirectly={updateStatsDirectly}
                      addNotification={addNotification}
                      setActiveTab={setActiveTab}
                      economyConfig={economyConfig}
                    />
                  )}

                  {activeTab === 'wallet' && (
                    <Redeem
                      stats={stats}
                      deductCoins={deductCoins}
                      addNotification={addNotification}
                      transactions={transactions}
                      updateStatsDirectly={updateStatsDirectly}
                      economyConfig={economyConfig}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <ProfileView
                      stats={stats}
                      xpProgressPercent={xpProgressPercent}
                      xpThreshold={xpThreshold}
                      transactions={transactions}
                      isMuted={isMuted}
                      onToggleMute={handleToggleMute}
                      onLogout={handleLogout}
                      addNotification={addNotification}
                      updateStatsDirectly={updateStatsDirectly}
                      updateCoinsAndXp={updateCoinsAndXp}
                      onOpenNotifications={() => setIsNotificationPanelOpen(true)}
                      authUser={authUser}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                      onOpenLegal={(tab) => {
                        sound.playSlap();
                        setLegalRoute(tab);
                        window.history.pushState(null, '', tab === 'terms' ? '/terms' : '/privacy');
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Fixed Non-Scrolling Bottom Navigation Bar */}
            <nav className="shrink-0 bg-[#FDFBF2] border-t-2 border-slate-900/10 px-2 py-1.5 pb-3 sm:pb-2.5 flex justify-around items-center z-40 select-none shadow-[0_-4px_10px_rgba(15,23,42,0.05)]" id="bottom-navigation-bar">
              
              <button
                id="nav-home-btn"
                onClick={() => { sound.playSlap(); setActiveTab('home'); }}
                className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                  activeTab === 'home' ? 'text-[#FF3B77]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <HomeIcon className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-[10px] font-black tracking-tight mt-1">Home</span>
              </button>

              <button
                id="nav-earn-btn"
                onClick={() => { sound.playSlap(); setActiveTab('earn'); }}
                className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                  activeTab === 'earn' ? 'text-[#FF3B77]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Coins className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-[10px] font-black tracking-tight mt-1">Earn</span>
              </button>

              {/* Highlighted Slapping blob action button */}
              <div className="relative -top-1 flex flex-col items-center justify-center px-1">
                <button
                  id="nav-slap-btn"
                  onClick={() => { sound.playSlap(); setActiveTab('slap'); }}
                  className={`w-14 h-14 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-[2px_3px_0px_0px_rgba(15,23,42,1)] transition-transform hover:scale-105 active:scale-95 bg-[#FFD043]`}
                >
                  <Hand className="w-6 h-6 text-slate-950 stroke-[2.5px]" />
                </button>
                <span className={`text-[10px] font-black tracking-tight mt-1 ${
                  activeTab === 'slap' ? 'text-[#FF3B77]' : 'text-slate-400'
                }`}>Slap</span>
              </div>

              <button
                id="nav-wallet-btn"
                onClick={() => { sound.playSlap(); setActiveTab('wallet'); }}
                className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                  activeTab === 'wallet' ? 'text-[#FF3B77]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Wallet className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-[10px] font-black tracking-tight mt-1">Wallet</span>
              </button>

              <button
                id="nav-profile-btn"
                onClick={() => { sound.playSlap(); setActiveTab('profile'); }}
                className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                  activeTab === 'profile' ? 'text-[#FF3B77]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserIcon className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-[10px] font-black tracking-tight mt-1">Profile</span>
              </button>
            </nav>
          </>
        )}

      </div>

      {/* Floater Toast layer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none" id="notifications-hud-layer">
        <AnimatePresence>
          {notifications.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              className="pointer-events-auto bg-slate-900 border-2 border-slate-950 rounded-2xl p-3.5 shadow-xl flex items-start gap-3 relative overflow-hidden text-white"
              id={`toast-${toast.id}`}
            >
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                toast.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'
              }`} />

              <div className="flex-1 pr-4">
                <h4 className="font-sans font-black text-[11px] uppercase tracking-wider leading-none text-white">{toast.title}</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">{toast.message}</p>
              </div>

              <button
                onClick={() => setNotifications((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Real-Time Live Earnings Popup */}
      <LiveEarningsPopup />

      {/* PWA Install Prompt Banner — hidden inside Telegram, where installing is not possible/needed */}
      {!inTelegram && <PWAInstallPrompt />}

      {/* Notifications Panel Modal */}
      <NotificationsPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onUnreadCountChange={(count) => setUnreadNotificationsCount(count)}
      />

    </div>
  );
}
