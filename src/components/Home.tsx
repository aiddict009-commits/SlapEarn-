import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, Hand, Gift, Sword, Sparkles, Coins, Lock, CheckCircle, 
  Star, ArrowUp, Check, X, Tv, Play, CheckSquare, Layers, Award,
  ExternalLink, Zap, Trophy, Clock
} from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction } from '../types';
import { HAND_UPGRADES, HandUpgrade } from '../handsData';
import { HandVisual } from './HandVisual';

interface HomeProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

export default function Home({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification }: HomeProps) {
  const [showClaimsModal, setShowClaimsModal] = useState<boolean>(false);
  const [showAdModal, setShowAdModal] = useState<boolean>(false);
  const [adPlaying, setAdPlaying] = useState<boolean>(false);
  const [adProgress, setAdProgress] = useState<number>(0);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [showHandShopModal, setShowHandShopModal] = useState<boolean>(false);
  const [unlockedHandCelebration, setUnlockedHandCelebration] = useState<HandUpgrade | null>(null);
  const [selectedShopHandId, setSelectedShopHandId] = useState<string>('wooden');
  const [shopViewMode, setShopViewMode] = useState<'inspector' | 'all'>('inspector');

  // Countdown timer to next daily reset (midnight)
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const diffMs = tomorrow.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeLeftStr('00h 00m 00s');
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setTimeLeftStr(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if claimed daily streak today
  const hasClaimedToday = stats.lastCheckIn 
    ? new Date(stats.lastCheckIn).toDateString() === new Date().toDateString() 
    : false;

  const daysOfCheckIn = [
    { day: 1, slaps: 5, coins: 0 },
    { day: 2, slaps: 8, coins: 0 },
    { day: 3, slaps: 10, coins: 0 },
    { day: 4, slaps: 12, coins: 0 },
    { day: 5, slaps: 15, coins: 0 },
    { day: 6, slaps: 20, coins: 0 },
    { day: 7, slaps: 25, coins: 50 }
  ];

  const handleClaimDaily = () => {
    if (hasClaimedToday) {
      sound.playError();
      addNotification('Already Claimed', 'You have already claimed today\'s daily reward. Come back tomorrow!', 'info');
      return;
    }

    const currentStreakIndex = stats.streak >= 7 ? 0 : stats.streak;
    const nextStreak = currentStreakIndex + 1;
    const rewardItem = daysOfCheckIn[currentStreakIndex];
    if (!rewardItem) return;

    const currentSlaps = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
    const maxSlapsLimit = 100;
    const spaceLeft = maxSlapsLimit - currentSlaps;
    const slapsToGive = Math.max(0, Math.min(rewardItem.slaps, spaceLeft));
    const nextSlapsToday = stats.maxSlapsPerDay - (currentSlaps + slapsToGive);

    if (rewardItem.coins > 0) {
      updateCoinsAndXp(rewardItem.coins, 10, 'Daily Check-in', `Day ${nextStreak} Daily Login Reward`);
    } else {
      updateCoinsAndXp(0, 10, 'Daily Check-in', `Day ${nextStreak} Daily Login Reward`);
    }

    updateStatsDirectly({
      streak: nextStreak,
      lastCheckIn: new Date().toISOString(),
      slapsToday: nextSlapsToday
    });

    sound.playSuccess();

    let rewardMsg = `Earned +${slapsToGive} Slaps!`;
    if (rewardItem.coins > 0) {
      rewardMsg = `Earned +${slapsToGive} Slaps & +${rewardItem.coins} SP!`;
    }
    if (slapsToGive < rewardItem.slaps) {
      rewardMsg += ` (Reached the 100 Slaps limit)`;
    }
    
    addNotification('Check-in Claimed!', rewardMsg, 'success');
  };

  const slapsAvailable = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);

  // Unlocked hands state
  const unlockedHandsList = stats.unlockedHands || ['wooden'];
  const currentSelectedHand = stats.selectedHand || 'wooden';
  const lifetimeAdsWatched = stats.totalAdsWatchedLifetime || 0;
  const adsWatchedToday = stats.adsWatchedToday || 0;
  const totalTasksCompleted = stats.totalTasksCompleted || 0;

  // Watch Ad Handler
  const startWatchingAd = () => {
    if (adsWatchedToday >= 20) {
      sound.playError();
      addNotification('Daily Limit Reached', 'You have reached your limit of 20 ads per day. Resetting tomorrow!', 'info');
      return;
    }

    setShowAdModal(true);
    setAdPlaying(true);
    setAdProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setAdProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setAdPlaying(false);
        sound.playSuccess();

        const newAdsToday = adsWatchedToday + 1;
        const newAdsLifetime = lifetimeAdsWatched + 1;

        // Reward player with +3 slaps and +15 SP
        const currentSlaps = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
        const nextSlapsToday = Math.max(0, stats.slapsToday - 3);

        updateStatsDirectly({
          adsWatchedToday: newAdsToday,
          totalAdsWatchedLifetime: newAdsLifetime,
          slapsToday: nextSlapsToday
        });

        updateCoinsAndXp(15, 10, 'Ad', 'Watched Video Ad');

        addNotification(
          '🎉 Ad Completed!',
          `+1 Ad Added to Lifetime Progress (${newAdsLifetime} Total)! +3 Slaps Refilled & +15 SP!`,
          'success'
        );
      }
    }, 1000); // 5 second ad playback
  };

  // Complete Simulated Task
  const handleSimulateTask = () => {
    sound.playSuccess();
    const newTotal = totalTasksCompleted + 1;
    updateStatsDirectly({ totalTasksCompleted: newTotal });
    updateCoinsAndXp(50, 20, 'Offerwall', 'Completed Offerwall Task');
    addNotification('Task Completed!', `🎉 Offerwall Task Completed! Total tasks: ${newTotal}. +50 SP Earned!`, 'success');
  };

  // Unlock Hand using SP
  const handleUnlockWithSP = (hand: HandUpgrade) => {
    const isUnlocked = unlockedHandsList.includes(hand.id);
    if (isUnlocked) return;

    const req = hand.requirements;
    if (lifetimeAdsWatched < req.requiredAds) {
      sound.playError();
      addNotification('Mandatory Ads Required', `You must watch ${req.requiredAds} lifetime ads first! (${lifetimeAdsWatched}/${req.requiredAds} done)`, 'info');
      return;
    }

    if (req.requiredLevel && stats.level < req.requiredLevel) {
      sound.playError();
      addNotification('Level Required', `You must reach Level ${req.requiredLevel} to unlock ${hand.name}!`, 'info');
      return;
    }

    if (stats.coins < req.spPrice) {
      sound.playError();
      addNotification('Insufficient SP', `Need ${req.spPrice.toLocaleString()} SP to unlock ${hand.name}!`, 'info');
      return;
    }

    // Deduct SP & unlock
    const updatedUnlocked = [...unlockedHandsList, hand.id];
    updateStatsDirectly({
      coins: stats.coins - req.spPrice,
      unlockedHands: updatedUnlocked,
      selectedHand: hand.id
    });

    sound.playSuccess();
    setUnlockedHandCelebration(hand);
    addNotification('Hand Unlocked!', `🎉 Unlocked and equipped ${hand.name} using SP!`, 'success');
  };

  // Unlock Hand using Tasks
  const handleUnlockWithTasks = (hand: HandUpgrade) => {
    const isUnlocked = unlockedHandsList.includes(hand.id);
    if (isUnlocked) return;

    const req = hand.requirements;
    if (lifetimeAdsWatched < req.requiredAds) {
      sound.playError();
      addNotification('Mandatory Ads Required', `You must watch ${req.requiredAds} lifetime ads first! (${lifetimeAdsWatched}/${req.requiredAds} done)`, 'info');
      return;
    }

    if (req.requiredLevel && stats.level < req.requiredLevel) {
      sound.playError();
      addNotification('Level Required', `You must reach Level ${req.requiredLevel} to unlock ${hand.name}!`, 'info');
      return;
    }

    if (totalTasksCompleted < req.requiredTasks) {
      sound.playError();
      addNotification('Tasks Incomplete', `Complete ${req.requiredTasks - totalTasksCompleted} more offerwall/survey tasks!`, 'info');
      return;
    }

    // Unlock using Tasks!
    const updatedUnlocked = [...unlockedHandsList, hand.id];
    updateStatsDirectly({
      unlockedHands: updatedUnlocked,
      selectedHand: hand.id
    });

    sound.playSuccess();
    setUnlockedHandCelebration(hand);
    addNotification('Free Hand Unlocked!', `🎉 Unlocked and equipped ${hand.name} via Task Completion!`, 'success');
  };

  // Equip Hand
  const handleEquipHand = (handId: string) => {
    if (currentSelectedHand === handId) return;
    updateStatsDirectly({ selectedHand: handId });
    sound.playSuccess();
    const hand = HAND_UPGRADES.find(h => h.id === handId);
    addNotification('Hand Equipped!', `🥊 ${hand ? hand.name : 'Hand'} is now equipped!`, 'success');
  };

  const selectedHandObj = HAND_UPGRADES.find(h => h.id === currentSelectedHand) || HAND_UPGRADES[0];

  // Claim Daily Challenge
  const claimedChallenges = stats.claimedDailyChallenges || [];

  const handleClaimChallenge = (challengeId: string, rewardSp: number, title: string) => {
    if (claimedChallenges.includes(challengeId)) return;

    const updatedClaimed = [...claimedChallenges, challengeId];
    updateStatsDirectly({
      claimedDailyChallenges: updatedClaimed
    });

    updateCoinsAndXp(rewardSp, 10, 'Daily Check-in', `Completed Daily Challenge: ${title}`);
    sound.playSuccess();
    addNotification('Challenge Completed!', `🎉 Earned +${rewardSp} SP for "${title}"!`, 'success');
  };

  // Calculate standard 8 daily challenges
  const basicChallengesList = [
    {
      id: 'daily_login',
      title: 'Daily Login',
      reward: 5,
      icon: Gift,
      iconBg: 'bg-amber-400 text-slate-950',
      current: hasClaimedToday ? 1 : 0,
      target: 1,
      shortcut: () => { sound.playSuccess(); setShowClaimsModal(true); }
    },
    {
      id: 'watch_5_ads',
      title: 'Watch 5 Ads',
      reward: 15,
      icon: Tv,
      iconBg: 'bg-rose-500 text-white',
      current: Math.min(5, adsWatchedToday),
      target: 5,
      shortcut: () => startWatchingAd()
    },
    {
      id: 'watch_20_ads',
      title: 'Watch 20 Ads',
      reward: 50,
      icon: Tv,
      iconBg: 'bg-purple-600 text-white',
      current: Math.min(20, adsWatchedToday),
      target: 20,
      shortcut: () => startWatchingAd()
    },
    {
      id: 'play_slap_10',
      title: 'Play SlapEarn 10 Times',
      reward: 20,
      icon: Hand,
      iconBg: 'bg-blue-500 text-white',
      current: Math.min(10, stats.slapsPlayedToday || (stats.slapsToday > 0 ? Math.min(10, stats.slapsToday) : 0)),
      target: 10
    },
    {
      id: 'defeat_3_chars',
      title: 'Defeat 3 Characters',
      reward: 30,
      icon: Sword,
      iconBg: 'bg-red-500 text-white',
      current: Math.min(3, stats.charactersDefeatedToday || 0),
      target: 3
    },
    {
      id: 'earn_500_sp',
      title: 'Earn 500 SP Today',
      reward: 25,
      icon: Coins,
      iconBg: 'bg-[#00D09E] text-slate-950',
      current: Math.min(500, stats.spEarnedToday || 0),
      target: 500
    },
    {
      id: 'complete_1_survey',
      title: 'Complete 1 Survey',
      reward: 100,
      icon: CheckSquare,
      iconBg: 'bg-cyan-500 text-slate-950',
      current: Math.min(1, stats.surveysCompletedToday || (stats.surveyProfile?.completedOnce ? 1 : 0)),
      target: 1,
      shortcut: () => { sound.playSuccess(); setShowTaskModal(true); }
    },
    {
      id: 'complete_1_offer',
      title: 'Complete 1 Offerwall Offer',
      reward: 200,
      icon: Zap,
      iconBg: 'bg-amber-400 text-slate-950',
      current: Math.min(1, stats.offersCompletedToday || (totalTasksCompleted > 0 ? 1 : 0)),
      target: 1,
      shortcut: () => { sound.playSuccess(); setShowTaskModal(true); }
    }
  ];

  // 9th challenge: Complete All Daily Tasks
  const basicCompletedCount = basicChallengesList.filter(c => c.current >= c.target).length;
  const allDailyChallengesList = [
    ...basicChallengesList,
    {
      id: 'complete_all_tasks',
      title: 'Complete All Daily Tasks',
      reward: 100,
      icon: Award,
      iconBg: 'bg-gradient-to-r from-amber-400 to-rose-500 text-white font-black',
      current: basicCompletedCount,
      target: 8
    }
  ];

  return (
    <div className="flex flex-col text-slate-900 select-none gap-3" id="home-view">
      
      {/* Welcome Message */}
      <div className="flex flex-col px-1" id="home-welcome-header">
        <h2 className="text-xl font-black text-slate-950 tracking-tight leading-none">
          Welcome back, Slap Champ! 👋
        </h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
          Level {stats.level} • Let's slap, watch ads & unlock hands!
        </p>
      </div>

      {/* Balance Card */}
      <div 
        className="bg-[#00D09E] rounded-[24px] border-4 border-slate-900 p-4 relative shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between min-h-[120px]"
        id="balance-card"
      >
        <div className="flex flex-col">
          <span className="text-slate-950 font-black text-xs tracking-wider uppercase opacity-80">
            YOUR BALANCE
          </span>
          <h3 className="text-3.5xl font-black text-slate-950 tracking-tight mt-1 leading-none">
            {stats.coins.toLocaleString()} SP
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-950 opacity-90 mt-2">
          <span>≈ ${(stats.coins / 10000).toFixed(2)} USD</span>
          <span className="text-[10px] font-bold opacity-80 uppercase tracking-tight">Rate: 5,000 SP = $0.50</span>
        </div>
      </div>

      {/* Daily Ad Limit Banner & Fast Watch Button */}
      <div className="bg-[#1E293B] border-4 border-slate-950 rounded-[24px] p-3.5 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-rose-500 border-2 border-slate-950 rounded-xl flex items-center justify-center text-white">
              <Tv className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white leading-tight">Daily Ad Limit Watcher</h4>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                Max 20 Ads Per Day (Mandatory for Hands)
              </p>
            </div>
          </div>
          <div className="bg-slate-900 border-2 border-slate-800 px-3 py-1 rounded-full text-right">
            <span className="text-xs font-black text-amber-400">{adsWatchedToday} / 20</span>
            <span className="text-[9px] text-slate-400 block font-bold">Today</span>
          </div>
        </div>

        {/* Progress Bar for Daily Limit */}
        <div className="w-full bg-slate-900 h-3 rounded-full border border-slate-800 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-amber-400 to-rose-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (adsWatchedToday / 20) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="text-[10px] font-bold text-slate-300">
            Lifetime Watched: <span className="text-amber-400 font-black">{lifetimeAdsWatched} Ads</span>
          </div>

          <button
            onClick={startWatchingAd}
            disabled={adsWatchedToday >= 20}
            className={`px-3.5 py-1.5 rounded-xl border-2 border-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all ${
              adsWatchedToday >= 20
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-900 shadow-none'
                : 'bg-[#FF3B77] hover:bg-[#E33D6F] text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-white stroke-none" />
            <span>Watch Ad (+1 Ad)</span>
          </button>
        </div>
      </div>

      {/* Daily Bonus Card & Stats Grid */}
      <div 
        onClick={() => {
          sound.playSuccess();
          setShowClaimsModal(true);
        }}
        className="bg-[#FFEED1] hover:bg-[#FFE5BD] cursor-pointer rounded-[24px] border-4 border-slate-900 p-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between transition-all"
        id="daily-bonus-card"
      >
        <div className="flex items-center">
          <div className="w-11 h-11 bg-[#FFD043] border-4 border-slate-900 rounded-[14px] flex items-center justify-center shadow-[1.5px_2px_0px_0px_rgba(15,23,42,1)]">
            <Gift className="w-4.5 h-4.5 text-slate-900 stroke-[2.5px]" />
          </div>
          <div className="flex flex-col ml-2.5 text-left">
            <span className="text-slate-950 font-black text-sm leading-tight">Daily bonus</span>
            <span className="text-slate-500 font-bold text-xs mt-0.5">Claim slaps & SP daily!</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            sound.playSuccess();
            setShowClaimsModal(true);
          }}
          className={`font-black text-xs px-3.5 py-2 rounded-[14px] border-4 border-slate-900 transition-all ${
            hasClaimedToday
              ? 'bg-[#00D09E] text-slate-950 hover:bg-[#00b287] shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] active:scale-95'
              : 'bg-[#FF3B77] hover:bg-[#E33D6F] text-white shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] active:scale-95'
          }`}
        >
          {hasClaimedToday ? 'View Streak' : 'Claim'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3" id="stats-grid">
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-28">
          <Flame className="w-5.5 h-5.5 text-[#FF3B77] stroke-[2.5px]" />
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-950 leading-none">{stats.streak}</span>
            <span className="text-slate-400 font-bold text-[10px] leading-tight mt-1">Current slap streak</span>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-28">
          <Hand className="w-5.5 h-5.5 text-[#4965FF] stroke-[2.5px]" />
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-950 leading-none">{slapsAvailable}</span>
            <span className="text-slate-400 font-bold text-[10px] leading-tight mt-1">Slaps available</span>
          </div>
        </div>
      </div>

      {/* Daily Challenges Section */}
      <div 
        className="bg-[#0F172A] border-4 border-slate-950 rounded-[28px] p-4 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3.5 relative overflow-hidden" 
        id="daily-challenges-section"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#FFD043] border-2 border-slate-950 rounded-xl flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <Trophy className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-tight uppercase">DAILY CHALLENGES</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                Earn bonus SP rewards daily!
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Daily Reset Countdown Timer */}
            <div className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-2xl flex items-center gap-1.5 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-amber-400 stroke-[2.5px] animate-pulse shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase leading-none">Resets in</span>
                <span className="text-[11px] font-mono font-black text-amber-300 leading-tight tracking-tight">{timeLeftStr || '--h --m --s'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl text-right">
              <span className="text-xs font-black text-[#00D09E]">
                {allDailyChallengesList.filter(c => claimedChallenges.includes(c.id)).length} / 9
              </span>
              <span className="text-[9px] text-slate-400 block font-bold leading-none mt-0.5">Claimed</span>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        <div className="flex flex-col gap-2.5">
          {allDailyChallengesList.map((item) => {
            const isClaimed = claimedChallenges.includes(item.id);
            const isCompleted = item.current >= item.target;
            const progressPercent = Math.min(100, Math.floor((item.current / item.target) * 100));
            const IconComponent = item.icon;

            return (
              <div 
                key={item.id}
                className={`p-3 rounded-2xl border-2 border-slate-800 flex items-center justify-between gap-3 transition-all ${
                  isClaimed 
                    ? 'bg-slate-900/50 border-slate-800/60 opacity-70' 
                    : isCompleted 
                      ? 'bg-emerald-950/50 border-emerald-500/50 ring-2 ring-emerald-500/30' 
                      : 'bg-slate-900/90'
                }`}
                id={`daily-challenge-item-${item.id}`}
              >
                {/* Left Icon & Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl border-2 border-slate-950 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${item.iconBg}`}>
                    <IconComponent className="w-4.5 h-4.5 stroke-[2.5px]" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-white truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-black text-amber-400 shrink-0">
                        +{item.reward} SP
                      </span>
                    </div>

                    {/* Progress Bar & Text */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-[#00D09E]' : 'bg-gradient-to-r from-amber-400 to-rose-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                        {item.current.toLocaleString()} / {item.target.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action / Claim Button */}
                <div className="shrink-0">
                  {isClaimed ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] px-2.5 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3px]" />
                      Done
                    </span>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaimChallenge(item.id, item.reward, item.title)}
                      className="bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-xl border-2 border-slate-950 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
                    >
                      Claim +{item.reward} SP 🎉
                    </button>
                  ) : item.shortcut ? (
                    <button
                      onClick={item.shortcut}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] px-2.5 py-1.5 rounded-xl border border-slate-700 uppercase tracking-wider active:scale-95 transition-all"
                    >
                      Go
                    </button>
                  ) : (
                    <span className="bg-slate-950 text-slate-500 border border-slate-800 font-bold text-[9px] px-2.5 py-1 rounded-xl uppercase tracking-wider">
                      {progressPercent}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hand Shop Card - Opens Hand Shop Modal */}
      <div 
        className="bg-[#0F172A] border-4 border-slate-950 rounded-[24px] p-4 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3 relative overflow-hidden"
        id="slapearn-hand-shop-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#FFD043] border-2 border-slate-950 rounded-xl flex items-center justify-center text-slate-950">
              <Sword className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white leading-tight">Hand Shop & Upgrades</h4>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                Equip & Unlock Slap Hands
              </p>
            </div>
          </div>
          <span className="bg-slate-800 border border-slate-700 text-amber-400 font-black text-[10px] px-2.5 py-1 rounded-full">
            {unlockedHandsList.length}/{HAND_UPGRADES.length} Unlocked
          </span>
        </div>

        {/* Currently Equipped Hand Summary */}
        {selectedHandObj && (
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#1E293B] border-2 border-slate-800 rounded-xl p-1 flex items-center justify-center shrink-0">
                <HandVisual id={selectedHandObj.id} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">{selectedHandObj.name}</span>
                  <span className={`px-2 py-0.2 rounded-full font-black text-[8px] uppercase ${selectedHandObj.rarityColor}`}>
                    {selectedHandObj.rarity}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-1">
                  <span>Dmg: <strong className="text-white">{selectedHandObj.minDamage}-{selectedHandObj.maxDamage}</strong></span>
                  <span>•</span>
                  <span>Crit: <strong className="text-yellow-400">{Math.round(selectedHandObj.criticalChance * 100)}%</strong></span>
                  <span>•</span>
                  <span>SP: <strong className="text-[#00D09E]">+{Math.round(selectedHandObj.spBonus * 100)}%</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            sound.playSuccess();
            setSelectedShopHandId(currentSelectedHand);
            setShopViewMode('inspector');
            setShowHandShopModal(true);
          }}
          className="w-full py-3 rounded-xl border-3 border-slate-950 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[2.5px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Hand className="w-4 h-4 stroke-[2.5px]" />
          <span>Open Hand Shop & Inspect Details 🥊</span>
        </button>
      </div>

      {/* Hand Shop Modal Prompt */}
      <AnimatePresence>
        {showHandShopModal && (
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowHandShopModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#0F172A] border-4 border-slate-950 rounded-[28px] w-full max-w-[480px] max-h-[90vh] p-4 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white flex flex-col my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-[#FFD043] border-2 border-slate-950 rounded-xl flex items-center justify-center text-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    <Sword className="w-5 h-5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">HAND SHOP & UPGRADES</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Inspect details & unlock powerful hands
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playSuccess();
                    setShowHandShopModal(false);
                  }}
                  className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-90"
                  title="Close Shop"
                >
                  <X className="w-4 h-4 stroke-[3px]" />
                </button>
              </div>

              {/* Hand Selector Tabs */}
              <div className="flex items-center justify-between gap-1 py-2 border-b border-slate-800/80 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
                  {HAND_UPGRADES.map((h) => {
                    const isTabActive = shopViewMode === 'inspector' && selectedShopHandId === h.id;
                    const isUnlocked = unlockedHandsList.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          sound.playSuccess();
                          setSelectedShopHandId(h.id);
                          setShopViewMode('inspector');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all ${
                          isTabActive
                            ? 'bg-[#FFD043] text-slate-950 border-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{h.name.split(' ')[0]}</span>
                        {isUnlocked ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ) : (
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    sound.playSuccess();
                    setShopViewMode(shopViewMode === 'inspector' ? 'all' : 'inspector');
                  }}
                  className={`px-2 py-1.5 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all ${
                    shopViewMode === 'all'
                      ? 'bg-blue-600 text-white border-slate-950'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {shopViewMode === 'all' ? 'Inspector View' : 'All List'}
                </button>
              </div>

              {/* Scrollable Main Content */}
              <div className="flex flex-col gap-3 overflow-y-auto pr-1 my-2 max-h-[60vh]">
                {shopViewMode === 'inspector' ? (
                  (() => {
                    const hand = HAND_UPGRADES.find(h => h.id === selectedShopHandId) || HAND_UPGRADES[0];
                    const isUnlocked = unlockedHandsList.includes(hand.id);
                    const isSelected = currentSelectedHand === hand.id;
                    const req = hand.requirements;

                    // Calculations
                    const adsMet = lifetimeAdsWatched >= req.requiredAds;
                    const adProgressPercent = req.requiredAds > 0 
                      ? Math.min(100, Math.floor((lifetimeAdsWatched / req.requiredAds) * 100))
                      : 100;
                    const adsRemaining = Math.max(0, req.requiredAds - lifetimeAdsWatched);
                    const estDaysLeft = Math.ceil(adsRemaining / 20);

                    const tasksMet = totalTasksCompleted >= req.requiredTasks;
                    const taskProgressPercent = req.requiredTasks > 0
                      ? Math.min(100, Math.floor((totalTasksCompleted / req.requiredTasks) * 100))
                      : 100;

                    const levelMet = !req.requiredLevel || stats.level >= req.requiredLevel;

                    return (
                      <div className="flex flex-col gap-3">
                        {/* Selected Hand Hero Inspector Card */}
                        <div className={`bg-[#1E293B] border-3 border-slate-950 rounded-[24px] p-4 text-white flex flex-col gap-3 relative overflow-hidden ${hand.shadowColor}`}>
                          
                          {/* Rarity & Status Header */}
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest ${hand.rarityColor}`}>
                              {hand.rarity} HAND
                            </span>
                            {isSelected ? (
                              <span className="bg-[#00D09E] text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                <CheckCircle className="w-3.5 h-3.5 text-slate-950 stroke-[3px]" />
                                Active Hand
                              </span>
                            ) : isUnlocked ? (
                              <span className="bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] px-3 py-1 rounded-full border border-emerald-500/30 uppercase">
                                Unlocked
                              </span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-300 font-extrabold text-[10px] px-3 py-1 rounded-full border border-amber-500/30 uppercase flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </div>

                          {/* Hand Visual Preview Canvas */}
                          <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#0F172A] shadow-inner p-3 flex items-center justify-center relative">
                            <div className={`w-32 h-32 flex items-center justify-center transition-all ${!isUnlocked ? 'brightness-[0.4] filter saturate-50' : ''}`}>
                              <HandVisual id={hand.id} />
                            </div>
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
                                <Lock className="w-8 h-8 text-slate-400 stroke-[2.5px]" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Locked Hand</span>
                              </div>
                            )}
                          </div>

                          {/* Hand Title & Description */}
                          <div>
                            <h4 className="text-2xl font-black text-white tracking-tight flex items-center justify-between">
                              <span>{hand.name}</span>
                            </h4>
                            <p className="text-slate-300 text-xs font-medium mt-1 leading-relaxed">
                              {hand.description}
                            </p>
                          </div>

                          {/* Full Detailed Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                              <Sword className="w-4 h-4 text-rose-500 mb-1 stroke-[2.5px]" />
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Damage</span>
                              <span className="font-mono font-black text-sm text-white mt-0.5">
                                {hand.minDamage}–{hand.maxDamage}
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                              <Sparkles className="w-4 h-4 text-yellow-400 mb-1 stroke-[2.5px]" />
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Crit Rate</span>
                              <span className="font-mono font-black text-sm text-yellow-400 mt-0.5">
                                {Math.round(hand.criticalChance * 100)}%
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                              <Coins className="w-4 h-4 text-[#00D09E] mb-1 stroke-[2.5px]" />
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">SP Bonus</span>
                              <span className="font-mono font-black text-sm text-[#00D09E] mt-0.5">
                                +{Math.round(hand.spBonus * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Unlock Requirements Section */}
                          {!isUnlocked && (
                            <div className="flex flex-col gap-2.5 bg-slate-950/90 p-3 rounded-2xl border border-slate-800 mt-1">
                              
                              {/* STAGE 1: Mandatory Ads Requirement Progress */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                                    <Tv className="w-3.5 h-3.5 text-rose-400" />
                                    <span>1. Mandatory Ads Progress:</span>
                                  </span>
                                  <span className={`font-mono font-black ${adsMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {lifetimeAdsWatched} / {req.requiredAds} Ads
                                  </span>
                                </div>

                                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      adsMet ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-rose-500'
                                    }`}
                                    style={{ width: `${adProgressPercent}%` }}
                                  />
                                </div>

                                <div className="text-[10px] text-slate-400 flex justify-between items-center">
                                  {adsMet ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> Mandatory Ads Requirement Met!
                                    </span>
                                  ) : (
                                    <>
                                      <span>Need {adsRemaining} more ads</span>
                                      <span className="text-slate-500 font-semibold">~{estDaysLeft} days left (Max 20/day)</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* STAGE 2: Choice Options */}
                              <div className="border-t border-slate-800/80 pt-2.5 flex flex-col gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                                  2. Choose Unlock Option (After Ads Completed):
                                </span>

                                {/* Option A: SP Instant Unlock */}
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                  adsMet ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-900 opacity-60'
                                }`}>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                                      <Coins className="w-3.5 h-3.5" /> Option A: Pay SP
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Cost: {req.spPrice.toLocaleString()} SP
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleUnlockWithSP(hand)}
                                    disabled={!adsMet || stats.coins < req.spPrice || !levelMet}
                                    className={`px-3 py-1.5 rounded-xl border-2 border-slate-950 font-black text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all ${
                                      !adsMet || stats.coins < req.spPrice || !levelMet
                                        ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed shadow-none'
                                        : 'bg-[#FFD043] hover:bg-yellow-400 text-slate-950'
                                    }`}
                                  >
                                    Pay {req.spPrice.toLocaleString()} SP
                                  </button>
                                </div>

                                {/* Option B: Offerwall / Survey Tasks Unlock */}
                                <div className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                                  adsMet ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-900 opacity-60'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-cyan-300 flex items-center gap-1">
                                        <CheckSquare className="w-3.5 h-3.5" /> Option B: Free Task Unlock
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Tasks: {totalTasksCompleted} / {req.requiredTasks} Completed
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => handleUnlockWithTasks(hand)}
                                      disabled={!adsMet || !tasksMet || !levelMet}
                                      className={`px-3 py-1.5 rounded-xl border-2 border-slate-950 font-black text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all ${
                                        !adsMet || !tasksMet || !levelMet
                                          ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed shadow-none'
                                          : 'bg-[#00D09E] hover:bg-emerald-400 text-slate-950'
                                      }`}
                                    >
                                      {tasksMet ? 'Claim Free Unlock 🎉' : `${totalTasksCompleted}/${req.requiredTasks} Tasks`}
                                    </button>
                                  </div>

                                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                      className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${taskProgressPercent}%` }}
                                    />
                                  </div>

                                  <div className="flex justify-between items-center text-[10px]">
                                    {req.requiredLevel && (
                                      <span className={levelMet ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                        Level {req.requiredLevel} ({stats.level}/{req.requiredLevel})
                                      </span>
                                    )}
                                    <button
                                      onClick={() => {
                                        setShowHandShopModal(false);
                                        setShowTaskModal(true);
                                      }}
                                      className="text-cyan-400 hover:underline font-bold flex items-center gap-0.5 ml-auto"
                                    >
                                      <span>Complete Tasks</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}

                          {/* Equip Action Button */}
                          {isUnlocked && (
                            <button
                              onClick={() => handleEquipHand(hand.id)}
                              className={`w-full py-3 rounded-xl border-3 border-slate-950 font-black text-xs uppercase tracking-wider shadow-[2px_2.5px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-[1.5px] active:shadow-none cursor-pointer mt-1 ${
                                isSelected
                                  ? 'bg-[#00D09E] text-slate-950 border-slate-950 cursor-default shadow-none'
                                  : 'bg-white text-slate-950 hover:bg-[#FFEED1]'
                              }`}
                            >
                              {isSelected ? '✓ Currently Equipped Active Hand' : 'Equip This Hand 🥊'}
                            </button>
                          )}

                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* All Hands Expanded List */
                  <div className="flex flex-col gap-3">
                    {HAND_UPGRADES.map((hand) => {
                      const isUnlocked = unlockedHandsList.includes(hand.id);
                      const isSelected = currentSelectedHand === hand.id;

                      return (
                        <div
                          key={hand.id}
                          onClick={() => {
                            setSelectedShopHandId(hand.id);
                            setShopViewMode('inspector');
                          }}
                          className={`bg-[#1E293B] border-3 border-slate-950 rounded-2xl p-3 text-white flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition-all ${
                            isSelected ? 'ring-2 ring-yellow-400' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#0F172A] border-2 border-slate-800 rounded-xl p-1 flex items-center justify-center shrink-0">
                              <HandVisual id={hand.id} />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white">{hand.name}</span>
                                <span className={`px-2 py-0.2 rounded-full font-black text-[8px] uppercase ${hand.rarityColor}`}>
                                  {hand.rarity}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                Dmg: <strong className="text-white">{hand.minDamage}-{hand.maxDamage}</strong> • SP: <strong className="text-[#00D09E]">+{Math.round(hand.spBonus * 100)}%</strong>
                              </span>
                            </div>
                          </div>

                          <div>
                            {isSelected ? (
                              <span className="bg-[#00D09E] text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-full uppercase">Active</span>
                            ) : isUnlocked ? (
                              <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[9px] px-2.5 py-1 rounded-full uppercase">Inspect</span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-300 font-bold text-[9px] px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close Shop Button */}
              <button
                onClick={() => {
                  sound.playSuccess();
                  setShowHandShopModal(false);
                }}
                className="mt-2 w-full py-2.5 rounded-xl border-3 border-slate-950 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all cursor-pointer"
              >
                Done / Close Shop
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Ad Player Modal */}
      <AnimatePresence>
        {showAdModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F172A] border-4 border-slate-950 rounded-[28px] w-full max-w-[360px] p-5 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white overflow-hidden flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-rose-500 border-4 border-slate-950 rounded-2xl flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Tv className="w-7 h-7 text-white stroke-[2.5px]" />
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-tight">Watching Video Ad</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Watching ad ({adsWatchedToday + (adProgress >= 100 ? 1 : 0)}/20 today). Ads cannot be skipped!
              </p>

              {/* Video Player Box */}
              <div className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 my-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                {adPlaying ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-3" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-widest animate-pulse">
                      Playing Advertisement... {adProgress}%
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 stroke-[2.5px]" />
                    <span className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                      Ad View Completed!
                    </span>
                  </>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 h-3 rounded-full border border-slate-800 overflow-hidden mb-4">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${adProgress}%` }}
                />
              </div>

              <button
                onClick={() => {
                  if (!adPlaying) setShowAdModal(false);
                }}
                disabled={adPlaying}
                className={`w-full py-3 rounded-2xl border-4 border-slate-950 font-black text-xs uppercase tracking-wider shadow-[2px_2.5px_0px_0px_rgba(255,255,255,1)] transition-all ${
                  adPlaying
                    ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed shadow-none'
                    : 'bg-[#00D09E] text-slate-950 hover:bg-emerald-400 active:scale-95'
                }`}
              >
                {adPlaying ? 'Watching Ad (Mandatory)...' : 'Claim & Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Offerwall Task Simulator Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F172A] border-4 border-slate-950 rounded-[28px] w-full max-w-[360px] p-5 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-cyan-400 stroke-[2.5px]" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Offerwall & Surveys</h3>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="w-7 h-7 rounded-full border-2 border-slate-950 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 font-semibold mb-3">
                Complete offerwalls and surveys to unlock hands without spending SP!
              </p>

              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 mb-4 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300">Total Tasks Completed:</span>
                <span className="text-base font-mono font-black text-cyan-400">{totalTasksCompleted} Tasks</span>
              </div>

              {/* Sample Task Options */}
              <div className="flex flex-col gap-2.5 mb-4">
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-xs text-white">CPX Research Survey</h5>
                    <p className="text-[10px] text-slate-400">Takes 3 mins • +1 Task Count & +50 SP</p>
                  </div>
                  <button
                    onClick={handleSimulateTask}
                    className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-[10px] uppercase rounded-xl border-2 border-slate-950"
                  >
                    Complete
                  </button>
                </div>

                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-xs text-white">TapResearch Quick Quiz</h5>
                    <p className="text-[10px] text-slate-400">Takes 2 mins • +1 Task Count & +50 SP</p>
                  </div>
                  <button
                    onClick={handleSimulateTask}
                    className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-[10px] uppercase rounded-xl border-2 border-slate-950"
                  >
                    Complete
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowTaskModal(false)}
                className="w-full py-3 rounded-2xl border-4 border-slate-950 bg-white text-slate-950 font-black text-xs uppercase tracking-wider"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Claims Modal */}
      <AnimatePresence>
        {showClaimsModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#0F172A] border-4 border-slate-950 rounded-[24px] w-full max-w-[370px] p-4 relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-white overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-4.5 h-4.5 text-[#FFD043] stroke-[2.5px]" />
                  <h3 className="text-sm font-black text-white tracking-tight uppercase">Daily Login Streaks</h3>
                </div>
                <button
                  onClick={() => {
                    sound.playSuccess();
                    setShowClaimsModal(false);
                  }}
                  className="w-7 h-7 rounded-full border-3 border-slate-950 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-90"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              </div>

              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Your Streak</span>
                  <div className="text-base font-black text-[#FFD043] leading-none mt-0.5">Day {stats.streak} / 7</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Status</span>
                  <div className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1 mt-0.5 justify-end">
                    {hasClaimedToday ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3px]" />
                        <span>Claimed Today</span>
                      </>
                    ) : (
                      <span className="text-amber-400 animate-pulse">Pending Claim</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {daysOfCheckIn.map((item) => {
                  const isCompleted = item.day <= stats.streak;
                  const isCurrent = item.day === stats.streak + 1 && !hasClaimedToday;

                  return (
                    <div
                      key={item.day}
                      className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isCurrent
                          ? 'bg-slate-850 border-amber-500 text-white shadow-sm shadow-amber-500/5 animate-pulse'
                          : 'bg-slate-950 border-slate-900 text-slate-500'
                      }`}
                    >
                      <div className="font-semibold text-[8px] tracking-wider uppercase">
                        Day {item.day}
                      </div>
                      
                      <div className="my-1.5">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                            <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs ${
                            isCurrent ? 'bg-amber-500/20 text-amber-500 font-bold' : 'bg-slate-900 text-slate-600'
                          }`}>
                            {item.day === 7 ? '🎁' : '👋'}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className={`font-black text-[10px] leading-tight ${isCurrent ? 'text-amber-500' : 'text-slate-200'}`}>
                          +{item.slaps}
                        </div>
                        {item.coins > 0 ? (
                          <div className="font-black text-[8px] text-amber-400 mt-0.5 flex items-center justify-center gap-0.5">
                            <span>⭐</span>
                            <span>+{item.coins}</span>
                          </div>
                        ) : (
                          <div className="text-[7px] text-slate-500 mt-0.5">Slaps</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-800/80 pt-2.5 mb-3 text-left">
                <h4 className="text-white font-black text-[10px] uppercase tracking-wider mb-1">Rules</h4>
                <ul className="text-slate-400 text-[9px] space-y-1 list-disc list-inside leading-relaxed">
                  <li>One reward per day.</li>
                  <li>Missing a day resets the streak to Day 1.</li>
                  <li>Rewards cap at max 100 Slaps storage.</li>
                </ul>
              </div>

              <button
                onClick={() => handleClaimDaily()}
                disabled={hasClaimedToday}
                className={`w-full py-3 rounded-xl border-4 border-slate-950 font-black text-[11px] uppercase tracking-wider shadow-[2.5px_3px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-[2px] active:shadow-none ${
                  hasClaimedToday
                    ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-75 shadow-none'
                    : 'bg-[#FF3B77] text-white hover:bg-[#E33D6F]'
                }`}
              >
                {hasClaimedToday ? 'Already Claimed Today' : `Claim Day ${stats.streak + 1} Reward`}
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hand Unlock Celebration Modal with Particle Effects */}
      <AnimatePresence>
        {unlockedHandCelebration && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* Particle Burst Effect */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => {
                const angle = (i / 28) * 360 + (i % 2 === 0 ? 10 : -10);
                const rad = (angle * Math.PI) / 180;
                const dist = 100 + (i % 3) * 45;
                const targetX = Math.cos(rad) * dist;
                const targetY = Math.sin(rad) * dist;
                const colors = ['#FFD043', '#00D09E', '#FF3B77', '#38BDF8', '#C084FC', '#FACC15'];
                const color = colors[i % colors.length];

                return (
                  <motion.div
                    key={`particle-${i}`}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                    animate={{
                      x: [0, targetX * 0.6, targetX],
                      y: [0, targetY * 0.6, targetY],
                      scale: [0, 1.2, 0],
                      opacity: [1, 1, 0],
                      rotate: [0, 180, 360]
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      repeatDelay: 0.3,
                      delay: (i % 5) * 0.08,
                      ease: 'easeOut'
                    }}
                    className="absolute w-3.5 h-3.5 rounded-full shadow-lg"
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>

            {/* Glowing Backdrop Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.6, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-cyan-500/30 blur-2xl pointer-events-none"
            />

            {/* Main Modal Card */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 40, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="bg-[#0F172A] border-4 border-amber-400 rounded-[32px] w-full max-w-[350px] p-6 relative shadow-[0_0_40px_rgba(251,191,36,0.3)] text-white overflow-hidden flex flex-col items-center text-center z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  sound.playSuccess();
                  setUnlockedHandCelebration(null);
                }}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Title */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 bg-clip-text text-transparent font-black text-xs uppercase tracking-widest mb-1"
              >
                <Sparkles className="w-4 h-4 text-amber-400 stroke-[2.5px]" />
                <span>NEW HAND UNLOCKED!</span>
                <Sparkles className="w-4 h-4 text-amber-400 stroke-[2.5px]" />
              </motion.div>

              <h2 className="text-2.5xl font-black text-white tracking-tight uppercase leading-tight mb-2">
                {unlockedHandCelebration.name}
              </h2>

              <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest border border-white/20 mb-4 ${unlockedHandCelebration.rarityColor}`}>
                {unlockedHandCelebration.rarity}
              </span>

              {/* Hand Visual Showcase */}
              <motion.div
                initial={{ scale: 0.2, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.2 }}
                className="w-36 h-36 bg-[#1E293B] border-4 border-amber-400/80 rounded-3xl p-2 relative shadow-[0_0_25px_rgba(251,191,36,0.25)] flex items-center justify-center my-1"
              >
                <HandVisual id={unlockedHandCelebration.id} />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-3xl border-2 border-amber-400/40 pointer-events-none"
                />
              </motion.div>

              <p className="text-slate-300 text-xs font-semibold my-2 px-2">
                {unlockedHandCelebration.description}
              </p>

              {/* Stat Highlights */}
              <div className="w-full grid grid-cols-3 gap-1.5 my-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-0.5">
                    <Sword className="w-2.5 h-2.5 text-rose-500" /> Damage
                  </span>
                  <span className="text-sm font-mono font-black text-white">
                    {unlockedHandCelebration.minDamage}–{unlockedHandCelebration.maxDamage}
                  </span>
                </div>

                <div className="flex flex-col items-center border-x border-slate-800 px-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-yellow-400" /> Crit
                  </span>
                  <span className="text-sm font-mono font-black text-yellow-400">
                    {Math.round(unlockedHandCelebration.criticalChance * 100)}%
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-0.5">
                    <Coins className="w-2.5 h-2.5 text-[#00D09E]" /> SP Bonus
                  </span>
                  <span className="text-sm font-mono font-black text-[#00D09E]">
                    +{Math.round(unlockedHandCelebration.spBonus * 100)}%
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  handleEquipHand(unlockedHandCelebration.id);
                  setUnlockedHandCelebration(null);
                }}
                className="w-full py-3.5 rounded-2xl border-4 border-slate-950 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[3px_3.5px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-2 mt-1"
              >
                <span>Equip & Slap Now! 🥊</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
