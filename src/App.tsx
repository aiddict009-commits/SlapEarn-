import { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';

import { sound } from './utils/sound';
import { UserStats, Transaction, EconomyConfig, DEFAULT_ECONOMY_CONFIG } from './types';
import { processTitleUnlocks } from './utils/titles';
import { timeGuard, TimeSecurityStatus } from './utils/timeGuard';
import { proxyGuard, NetworkSecurityStatus } from './utils/proxyGuard';
import {
  initAuth,
  syncUserStatsToFirestore,
  fetchUserStatsFromFirestore,
  addTransactionToFirestore,
  fetchTransactionsFromFirestore,
  addNotificationToFirestore,
  subscribeUserStats,
  subscribeAnnouncementsFromFirestore,
  subscribeEconomyConfigFromFirestore
} from './lib/firebase';

// Import subcomponents
import Home from './components/Home';
import SlapGame from './components/SlapGame';
import EarnView from './components/EarnView';
import Redeem from './components/Redeem';
import ProfileView from './components/ProfileView';
import AuthScreen, { AuthUser } from './components/AuthScreen';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { NotificationsPanel, AppNotification } from './components/NotificationsPanel';
import AdminDashboard from './components/AdminDashboard';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info';
}

const INITIAL_STATS: UserStats = {
  createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // Account created 10 days ago (age >= 7 days)
  coins: 1240, 
  totalEarned: 1240,
  xp: 10, 
  level: 1,
  streak: 0, 
  lastCheckIn: null,
  slapsToday: 70, // 30 starting slaps available (100 - 70 = 30)
  maxSlapsPerDay: 100, // Capped at 100 slaps max
  bestCombo: 18,
  daysActive: 12,
  referrals: 2,
  adsWatchedToday: 0,
  totalAdsWatchedLifetime: 3,
  lastActiveDate: new Date().toDateString(),
  selectedHand: 'wooden',
  unlockedHands: ['wooden'],
  referralsList: [
    { id: 'ref-1', name: 'Alex M.', adsWatched: 20, rewardClaimed: false, joinedAt: 'Yesterday' },
    { id: 'ref-2', name: 'Sarah K.', adsWatched: 14, rewardClaimed: false, joinedAt: '3 days ago' },
    { id: 'ref-3', name: 'David L.', adsWatched: 8, rewardClaimed: false, joinedAt: '5 days ago' }
  ],
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
    id: 'tx-onboarding-welcome',
    type: 'earn',
    amount: 1240,
    title: 'Starter Registration Balance',
    category: 'Daily Check-in',
    timestamp: new Date().toISOString(),
    status: 'completed'
  }
];

export default function App() {
  // Central state loaded from LocalStorage
  const [stats, setStats] = useState<UserStats>(() => {
    const cached = localStorage.getItem('slapearn_stats');
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.maxSlapsPerDay = 100;
      if (!parsed.hasInitializedStarting30Slaps) {
        parsed.slapsToday = 70; // 30 slaps available starting energy (100 - 70 = 30)
        parsed.hasInitializedStarting30Slaps = true;
      }
      if (parsed.slapsToday < 0) {
        parsed.slapsToday = 0; // Ensures slaps available never exceeds 100
      }
      if (!parsed.selectedHand) {
        parsed.selectedHand = 'wooden';
      }
      if (!parsed.unlockedHands) {
        parsed.unlockedHands = ['wooden'];
      }
      if (!parsed.referralsList) {
        parsed.referralsList = INITIAL_STATS.referralsList;
      }
      if (parsed.referralsForCurrentWithdrawal === undefined) {
        parsed.referralsForCurrentWithdrawal = 0;
      }
      if (!parsed.createdAt) {
        parsed.createdAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
      }
      if (parsed.slapsPlayedToday === undefined) parsed.slapsPlayedToday = 0;
      if (parsed.charactersDefeatedToday === undefined) parsed.charactersDefeatedToday = 0;
      if (parsed.spEarnedToday === undefined) parsed.spEarnedToday = 0;
      if (parsed.surveysCompletedToday === undefined) parsed.surveysCompletedToday = 0;
      if (parsed.offersCompletedToday === undefined) parsed.offersCompletedToday = 0;
      if (parsed.totalAdsWatchedLifetime === undefined) parsed.totalAdsWatchedLifetime = 0;
      if (parsed.adsWatchedToday === undefined) parsed.adsWatchedToday = 0;
      if (!parsed.claimedDailyChallenges) parsed.claimedDailyChallenges = [];
      return parsed;
    }
    return INITIAL_STATS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem('slapearn_transactions');
    return cached ? JSON.parse(cached) : INITIAL_TRANSACTIONS;
  });

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const cachedAuth = localStorage.getItem('slapearn_auth_user');
      return cachedAuth ? JSON.parse(cachedAuth) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const cachedAuth = localStorage.getItem('slapearn_auth_user');
    return !!cachedAuth || !!stats.username;
  });

  // Switch navigation tabs to match the screenshot bottom navigator
  const [activeTab, setActiveTab] = useState<'home' | 'earn' | 'slap' | 'wallet' | 'profile'>('slap'); // Default to Slap game as pictured!
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuteStatus());
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [economyConfig, setEconomyConfig] = useState<EconomyConfig>(DEFAULT_ECONOMY_CONFIG);

  // Real-time Firestore subscription to global economyConfig rules
  useEffect(() => {
    const unsubscribe = subscribeEconomyConfigFromFirestore((config) => {
      setEconomyConfig(config);
    });
    return () => unsubscribe();
  }, []);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('slapearn_notifications_history');
      if (saved) {
        const items = JSON.parse(saved);
        return Array.isArray(items) ? items.filter((item: { read?: boolean }) => !item.read).length : 0;
      }
    } catch {
      // ignore
    }
    return 3; // Default unread items
  });

  // Proxy & VPN Security State
  const [proxyStatus, setProxyStatus] = useState<NetworkSecurityStatus>(() => proxyGuard.getStatus());

  useEffect(() => {
    const unsubscribe = proxyGuard.subscribe((status) => {
      setProxyStatus(status);
    });
    return unsubscribe;
  }, []);

  // Time Dilation & Clock Tampering Security State
  const [timeSecurityStatus, setTimeSecurityStatus] = useState<TimeSecurityStatus>(() => timeGuard.getStatus());
  const [isResyncingTime, setIsResyncingTime] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = timeGuard.subscribe((status) => {
      setTimeSecurityStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleResyncTime = async () => {
    sound.playSuccess();
    setIsResyncingTime(true);
    const updated = await timeGuard.verifyNetworkTime();
    setIsResyncingTime(false);

    if (!updated.isTampered) {
      addNotification('Time Integrity Restored!', 'Network atomic time verified successfully. Full access unlocked!', 'success');
    } else {
      addNotification('Time Verification Failed', updated.message, 'info');
    }
  };

  // Handle Login / Sign Up
  const handleLoginSuccess = (user: AuthUser, isNewUser: boolean) => {
    localStorage.setItem('slapearn_auth_user', JSON.stringify(user));
    setAuthUser(user);
    setIsAuthenticated(true);

    if (isNewUser) {
      setStats((prev) => ({
        ...prev,
        username: user.username,
        email: user.email,
        myReferralCode: user.myReferralCode,
        referredByCode: user.referredByCode,
        totalAdsWatchedLifetime: 0,
        referredByRewardClaimed: false,
        createdAt: Date.now()
      }));

      if (user.referredByCode) {
        addNotification(
          '🎉 Welcome & Referral Registered!',
          `Signed up with referral code ${user.referredByCode}! Watch 20 ads to earn +100 SP bonus.`,
          'success'
        );
      } else {
        addNotification('🎉 Welcome to SlapEarn!', `Account created for ${user.username}!`, 'success');
      }
    } else {
      setStats((prev) => ({
        ...prev,
        username: user.username,
        email: user.email,
        myReferralCode: user.myReferralCode || (`SLAP-${user.username.toUpperCase()}`)
      }));
      addNotification('Welcome Back!', `Logged in as ${user.username}`, 'success');
    }
  };

  const handleLogout = () => {
    sound.playSuccess();
    localStorage.removeItem('slapearn_auth_user');
    setAuthUser(null);
    setIsAuthenticated(false);
    addNotification('Logged Out', 'You have logged out. Sign up or log in to continue!', 'info');
  };

  // Firebase Auth & Firestore Sync state
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  // Initialize Firebase Auth & Load initial remote Firestore data
  useEffect(() => {
    initAuth().then(async (user) => {
      setFirebaseUid(user.uid);

      // Load stats from Cloud Firestore
      const remoteStats = await fetchUserStatsFromFirestore(user.uid);
      if (remoteStats && Object.keys(remoteStats).length > 0) {
        setStats((prev) => ({ ...prev, ...remoteStats }));
      } else {
        // Upload initial stats to Firestore
        syncUserStatsToFirestore(user.uid, stats);
      }

      // Load transactions from Cloud Firestore
      const remoteTxs = await fetchTransactionsFromFirestore(user.uid);
      if (remoteTxs && remoteTxs.length > 0) {
        setTransactions(remoteTxs);
      }
    }).catch((err) => {
      console.warn("Firebase authentication note:", err);
    });
  }, []);

  // Cache state triggers & Cloud Firestore synchronization
  useEffect(() => {
    localStorage.setItem('slapearn_stats', JSON.stringify(stats));
    if (firebaseUid) {
      syncUserStatsToFirestore(firebaseUid, stats);
    }
  }, [stats, firebaseUid]);

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

  // Automatic daily reset when the calendar day rolls over
  useEffect(() => {
    const checkDailyReset = () => {
      const todayStr = new Date().toDateString();
      
      setStats((prev) => {
        let updated = { ...prev };
        let changed = false;

        // 1. Daily reset of slaps energy, ads watched & daily challenges
        if (!prev.lastActiveDate || prev.lastActiveDate !== todayStr) {
          updated.slapsToday = 70; // 30 slaps available starting energy (100 - 70 = 30)
          updated.adsWatchedToday = 0;
          updated.slapsPlayedToday = 0;
          updated.charactersDefeatedToday = 0;
          updated.spEarnedToday = 0;
          updated.surveysCompletedToday = 0;
          updated.offersCompletedToday = 0;
          updated.claimedDailyChallenges = [];
          updated.lastActiveDate = todayStr;
          changed = true;
        }

        // 2. Check if streak is broken or completed (7 days)
        if (prev.lastCheckIn) {
          const checkInDate = new Date(prev.lastCheckIn);
          const today = new Date();
          const d1 = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
          const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

          // If user missed checking in for more than 1 day, reset the streak to 0 (Day 1)
          // Or if they completed Day 7 already, reset to 0 (Day 1) for their next cycle
          if (diffDays > 1 || prev.streak >= 7) {
            updated.streak = 0;
            changed = true;
          }
        }

        return changed ? updated : prev;
      });
    };

    // Run check immediately on mount
    checkDailyReset();

    // Check periodically every 15 seconds in case midnight passes
    const interval = setInterval(checkDailyReset, 15000);

    // Check on window focus or visibility change
    window.addEventListener('focus', checkDailyReset);
    document.addEventListener('visibilitychange', checkDailyReset);

    return () => {
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

      return updatedStats;
    });

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
    setStats((prev) => {
      if (prev.coins < amount) return prev;
      success = true;
      return {
        ...prev,
        coins: prev.coins - amount
      };
    });

    if (success) {
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

  const updateStatsDirectly = (newStats: Partial<UserStats>) => {
    setStats((prev) => ({ ...prev, ...newStats }));
  };

  // Compute stats info
  const xpThreshold = stats.level * 650;
  const xpProgressPercent = Math.min(100, (stats.xp / xpThreshold) * 100);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#111317] text-slate-800 flex items-center justify-center font-sans p-0 sm:p-4 selection:bg-[#FFEAF0] selection:text-[#E33D6F]" id="slapearn-main-app">
      
      {/* Smartphone Viewport Card Mockup */}
      <div className="w-full h-full sm:h-[860px] sm:max-w-[420px] sm:rounded-[48px] sm:border-8 sm:border-slate-900 bg-[#FDFBF2] flex flex-col shadow-2xl overflow-hidden relative" id="mobile-viewport">
        
        {/* Notch details for Desktop Mockup view */}
        <div className="hidden sm:flex absolute top-0 left-0 right-0 h-6 bg-slate-900 z-50 items-center justify-center gap-1.5 rounded-t-xl">
          <div className="w-12 h-1 bg-slate-800 rounded-full" />
          <div className="w-2.5 h-2.5 bg-slate-800 rounded-full absolute right-8" />
        </div>

        {!isAuthenticated ? (
          <AuthScreen
            onLoginSuccess={handleLoginSuccess}
            onSkipDemo={() => setIsAuthenticated(true)}
          />
        ) : (
          <>
            {/* Dynamic Mobile Header */}
            <header className="bg-[#FDFBF2] px-4 py-3 flex justify-between items-center select-none" id="slapearn-header">
              {/* Logo Brand Title */}
              <div className="flex flex-col">
                <div 
                  className="flex items-center font-sans font-black text-[28px] italic select-none tracking-[-0.06em] origin-left rotate-[-4deg]"
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

                {/* Time Protection Status Pill */}
                {timeSecurityStatus.isTampered ? (
                  <button
                    onClick={handleResyncTime}
                    className="flex items-center gap-1 bg-rose-500 border-2 border-slate-900 px-2 py-1 rounded-full text-xs font-black text-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] animate-pulse cursor-pointer"
                    title="Clock Tampering / Speedhack Detected! Click to Re-sync."
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-white stroke-[2.5px]" />
                    <span className="font-sans font-black tracking-tight text-[10px]">Tampered!</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-emerald-100 border-2 border-slate-900 px-2 py-1 rounded-full text-xs font-black text-emerald-950 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]" title="Time Integrity Protected">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5px]" />
                    <span className="font-sans font-black tracking-tight text-[10px]">Secured</span>
                  </div>
                )}

                {/* Coins pill */}
                <div className="flex items-center gap-1 bg-[#FFD043] border-2 border-slate-900 px-2.5 py-1 rounded-full text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                  <Coins className="w-3.5 h-3.5 text-slate-950 stroke-[2.5px]" />
                  <span className="font-sans font-black tracking-tight">{stats.coins.toLocaleString()}</span>
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
            {economyConfig.maintenanceMode && !isAdminDashboardOpen && (
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
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 scrollbar-none" id="slapearn-active-view-container">
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
                      onOpenAdminHub={() => setIsAdminDashboardOpen(true)}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Persistent Bottom Tab Bar Navigation matching the screenshot perfectly */}
            <nav className="absolute bottom-0 left-0 right-0 bg-[#FDFBF2] px-2 py-1 pb-3 sm:pb-2.5 flex justify-around items-center z-40 select-none" id="bottom-navigation-bar">
              
              <button
                onClick={() => { sound.playSlap(); setActiveTab('home'); }}
                className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                  activeTab === 'home' ? 'text-[#FF3B77]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <HomeIcon className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-[10px] font-black tracking-tight mt-1">Home</span>
              </button>

              <button
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
                onClick={() => { sound.playSlap(); setActiveTab('wallet'); }}
                className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                  activeTab === 'wallet' ? 'text-[#FF3B77]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Wallet className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-[10px] font-black tracking-tight mt-1">Wallet</span>
              </button>

              <button
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

      {/* Time Dilation & Clock Tampering Security Alert Modal Overlay */}
      <AnimatePresence>
        {timeSecurityStatus.isTampered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 text-white"
            id="time-security-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0F172A] border-4 border-rose-600 rounded-[32px] w-full max-w-[420px] p-6 shadow-[0_0_50px_rgba(225,29,72,0.4)] flex flex-col gap-4 text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

              {/* Warning Shield Header */}
              <div className="mx-auto w-16 h-16 bg-rose-500/20 border-3 border-rose-500 rounded-3xl flex items-center justify-center text-rose-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <ShieldAlert className="w-9 h-9 stroke-[2.5px] animate-bounce" />
              </div>

              <div>
                <span className="bg-rose-500/20 text-rose-300 font-extrabold text-[10px] px-3 py-1 rounded-full border border-rose-500/40 uppercase tracking-widest inline-block mb-1">
                  SECURITY GUARD ACTIVE
                </span>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  Time Integrity Alert
                </h3>
                <p className="text-slate-300 text-xs font-semibold mt-1 leading-relaxed">
                  System clock tampering or speedhack dilation detected. Time-sensitive features (rewards, energy, daily check-ins) are protected!
                </p>
              </div>

              {/* Detected Violation Details Box */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-3.5 text-left flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    Detection Reason
                  </span>
                  <span className="font-mono font-bold text-rose-400 text-[11px] uppercase">
                    {timeSecurityStatus.reason || 'Clock Discrepancy'}
                  </span>
                </div>

                <p className="text-slate-200 font-medium text-xs">
                  {timeSecurityStatus.message}
                </p>

                {timeSecurityStatus.speedRatio !== 1.0 && (
                  <div className="flex justify-between items-center text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    <span>Execution Speed Ratio:</span>
                    <span className="font-mono font-black">{timeSecurityStatus.speedRatio}x</span>
                  </div>
                )}
              </div>

              {/* Explanatory notice */}
              <div className="text-[11px] text-slate-400 font-medium leading-normal bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60 text-left">
                💡 <strong className="text-white">How to resolve:</strong> Please set your device clock to <span className="text-amber-300 font-bold">Automatic Time & Timezone</span> in system settings, or click the button below to verify with Atomic Network Time.
              </div>

              {/* Re-sync Action Button */}
              <button
                onClick={handleResyncTime}
                disabled={isResyncingTime}
                className="w-full py-3.5 rounded-2xl border-3 border-slate-950 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 stroke-[2.5px] ${isResyncingTime ? 'animate-spin' : ''}`} />
                <span>{isResyncingTime ? 'Verifying Network Atomic Time...' : 'Re-sync Network Clock 🔄'}</span>
              </button>

              {/* Dev Override / Testing Dismiss */}
              <button
                onClick={() => timeGuard.resetTamperingState()}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider underline transition-colors"
              >
                Dev Override (Reset Test State)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* PWA Install Prompt Banner */}
      <PWAInstallPrompt />

      {/* Notifications Panel Modal */}
      <NotificationsPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onUnreadCountChange={(count) => setUnreadNotificationsCount(count)}
      />

      {/* Admin Dashboard Hub Overlay */}
      {isAdminDashboardOpen && (
        <AdminDashboard
          stats={stats}
          updateStatsDirectly={updateStatsDirectly}
          addNotification={addNotification}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      )}

    </div>
  );
}
