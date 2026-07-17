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
  User,
  Flame
} from 'lucide-react';

import { sound } from './utils/sound';
import { UserStats, Transaction } from './types';

// Import subcomponents
import Home from './components/Home';
import SlapGame from './components/SlapGame';
import EarnView from './components/EarnView';
import Redeem from './components/Redeem';
import ProfileView from './components/ProfileView';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info';
}

const INITIAL_STATS: UserStats = {
  coins: 1240, 
  totalEarned: 1240,
  xp: 10, 
  level: 1,
  streak: 0, 
  lastCheckIn: null,
  slapsToday: 25,
  maxSlapsPerDay: 50,
  bestCombo: 18,
  daysActive: 12,
  referrals: 3,
  adsWatchedToday: 0,
  lastActiveDate: new Date().toDateString(),
  selectedHand: 'wooden',
  unlockedHands: ['wooden']
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
      if (parsed.maxSlapsPerDay > 60) {
        parsed.maxSlapsPerDay = 60;
      }
      if (!parsed.selectedHand) {
        parsed.selectedHand = 'wooden';
      }
      if (!parsed.unlockedHands) {
        parsed.unlockedHands = ['wooden'];
      }
      return parsed;
    }
    return INITIAL_STATS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem('slapearn_transactions');
    return cached ? JSON.parse(cached) : INITIAL_TRANSACTIONS;
  });

  // Switch navigation tabs to match the screenshot bottom navigator
  const [activeTab, setActiveTab] = useState<'home' | 'earn' | 'slap' | 'wallet' | 'profile'>('slap'); // Default to Slap game as pictured!
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuteStatus());
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);

  // Cache state triggers
  useEffect(() => {
    localStorage.setItem('slapearn_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('slapearn_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Automatic daily reset when the calendar day rolls over
  useEffect(() => {
    const todayStr = new Date().toDateString();
    if (!stats.lastActiveDate || stats.lastActiveDate !== todayStr) {
      setStats((prev) => ({
        ...prev,
        slapsToday: 0,
        adsWatchedToday: 0,
        lastActiveDate: todayStr
      }));
    }
  }, []);

  // Helper to add notification toasts
  const addNotification = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setNotifications((prev) => [...prev, { id, title, message, type }]);

    // Auto dismiss after 4 seconds
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

      return {
        ...prev,
        coins: nextCoins,
        totalEarned: nextTotal,
        xp: nextXp,
        level: nextLevel,
        maxSlapsPerDay: Math.min(60, 50 + (nextLevel - 1) * 10)
      };
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
  };

  // Central coin deduction trigger
  const deductCoins = (
    amount: number,
    title: string,
    category: Transaction['category']
  ): boolean => {
    let success = false;
    setStats((prev) => {
      if (prev.coins < amount) return prev;
      success = true;
      return {
        ...prev,
        coins: prev.coins - amount
      };
    });

    if (success) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'redeem',
        amount,
        title,
        category,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      setTransactions((prev) => [newTx, ...prev]);
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

        {/* Dynamic Mobile Header */}
        <header className="bg-[#FDFBF2] px-4 py-3 flex justify-between items-center select-none" id="slapearn-header">
          {/* Logo Brand Title */}
          <div className="flex flex-col">
            <div 
              className="flex items-center font-sans font-black text-[31px] italic select-none tracking-[-0.06em] origin-left rotate-[-4deg]"
              style={{
                textShadow: "2.5px 2.5px 0px #0F172A, -1.5px -1.5px 0px #0F172A, 1.5px -1.5px 0px #0F172A, -1.5px 1.5px 0px #0F172A"
              }}
            >
              <span className="text-white">Slap</span>
              <span className="text-[#FF2B6D] -ml-0.5">Earn</span>
            </div>
          </div>

          {/* Header Stats Pills as in user's screenshot */}
          <div className="flex items-center gap-2">
            {/* Coins pill */}
            <div className="flex items-center gap-1.5 bg-[#FFD043] border-3 border-slate-900 px-3.5 py-1.5 rounded-full text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <Coins className="w-4 h-4 text-slate-950 stroke-[2.5px]" />
              <span className="font-sans font-black tracking-tight">{stats.coins.toLocaleString()}</span>
            </div>

            {/* Streak flame pill / Combo counter as in the video */}
            <div className="flex items-center gap-1.5 bg-[#FFEAF0] border-3 border-slate-900 px-3.5 py-1.5 rounded-full text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]" title="Current Combo">
              <Flame className="w-4 h-4 text-[#FF3B77] fill-[#FF3B77] stroke-[2px]" />
              <span className="font-sans font-black tracking-tight">{stats.currentCombo || 0}</span>
            </div>
          </div>
        </header>

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
                />
              )}

              {activeTab === 'earn' && (
                <EarnView
                  stats={stats}
                  updateCoinsAndXp={updateCoinsAndXp}
                  updateStatsDirectly={updateStatsDirectly}
                  addNotification={addNotification}
                />
              )}

              {activeTab === 'slap' && (
                <SlapGame
                  stats={stats}
                  updateCoinsAndXp={updateCoinsAndXp}
                  updateStatsDirectly={updateStatsDirectly}
                  addNotification={addNotification}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'wallet' && (
                <Redeem
                  stats={stats}
                  deductCoins={deductCoins}
                  addNotification={addNotification}
                  transactions={transactions}
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
                  addNotification={addNotification}
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
            <User className="w-5 h-5 stroke-[2.5px]" />
            <span className="text-[10px] font-black tracking-tight mt-1">Profile</span>
          </button>
        </nav>

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

    </div>
  );
}
