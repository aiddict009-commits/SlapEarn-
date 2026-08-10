import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, Hand, Gift, Sword, Sparkles, Coins, Lock, CheckCircle, 
  Star, ArrowUp, Check, X, Tv, Play, CheckSquare, Layers, Award,
  ExternalLink, Zap, Trophy, Clock, Hammer
} from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction, EconomyConfig } from '../types';
import { HAND_UPGRADES, HandUpgrade } from '../handsData';
import { HandVisual } from './HandVisual';
import { AnimatedOdometer } from './AnimatedOdometer';
import { AdsterraBanner, triggerRewardedAdScript, RewardedAdScript } from './AdsterraAds';

interface HomeProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  economyConfig?: EconomyConfig;
}

export default function Home({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification, economyConfig }: HomeProps) {
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
    { day: 1, slaps: 1, coins: 10 },
    { day: 2, slaps: 1, coins: 20 },
    { day: 3, slaps: 2, coins: 30 },
    { day: 4, slaps: 2, coins: 40 },
    { day: 5, slaps: 3, coins: 50 },
    { day: 6, slaps: 3, coins: 75 },
    { day: 7, slaps: 5, coins: 150 }
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

  const handleClaimStarterPack = () => {
    sound.playSuccess();
    const currentSlaps = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
    const spaceLeft = 100 - currentSlaps;
    const slapsToGive = Math.min(50, spaceLeft);
    const nextSlapsToday = Math.max(0, stats.maxSlapsPerDay - (currentSlaps + slapsToGive));

    updateCoinsAndXp(100, 25, 'Daily Check-in', 'New Player Starter Pack Bonus');
    updateStatsDirectly({
      hasClaimedStarterPack: true,
      slapsToday: nextSlapsToday
    });

    addNotification(
      '🎁 Starter Pack Claimed!',
      `Received +100 SP Starter Bonus & +${slapsToGive} Slaps! Welcome to SlapEarn!`,
      'success'
    );
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

    triggerRewardedAdScript();

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

        // Reward player with +3 slaps and +5 SP
        const currentSlaps = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
        const nextSlapsToday = Math.max(0, stats.slapsToday - 3);

        updateStatsDirectly({
          adsWatchedToday: newAdsToday,
          totalAdsWatchedLifetime: newAdsLifetime,
          slapsToday: nextSlapsToday
        });

        updateCoinsAndXp(5, 10, 'Ad', 'Watched Video Ad');

        addNotification(
          '🎉 Ad Completed!',
          `+1 Ad Added to Lifetime Progress (${newAdsLifetime} Total)! +3 Slaps Refilled & +5 SP!`,
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

  // Calculate standard daily tasks with rewards ranging from 5 SP to 100 SP
  const basicChallengesList = [
    {
      id: 'daily_login',
      title: 'Daily Check-in',
      subtitle: 'Claim your daily login streak bonus',
      reward: 5,
      icon: Gift,
      iconBg: 'bg-amber-400 text-slate-950',
      current: hasClaimedToday ? 1 : 0,
      target: 1,
      shortcut: () => { sound.playSuccess(); setShowClaimsModal(true); }
    },
    {
      id: 'play_slap_10',
      title: 'Play SlapEarn 10 Times',
      subtitle: 'Perform 10 slaps in the Slap arena',
      reward: 10,
      icon: Hand,
      iconBg: 'bg-blue-500 text-white',
      current: Math.min(10, stats.slapsPlayedToday || 0),
      target: 10
    },
    {
      id: 'play_whack_mole_2',
      title: 'Play Whack a Mole 2 Times',
      subtitle: 'Play 2 rounds in the Whack-a-Mole mini-game',
      reward: 15,
      icon: Hammer,
      iconBg: 'bg-[#00D09E] text-slate-950 font-black',
      current: Math.min(2, stats.whackAMolePlayedToday || 0),
      target: 2
    },
    {
      id: 'deal_60_damage',
      title: 'Deal 60 Slap Damage',
      subtitle: 'Inflict 60 total damage on targets',
      reward: 20,
      icon: Flame,
      iconBg: 'bg-orange-500 text-white',
      current: Math.min(60, stats.totalDamageDealtToday || ((stats.slapsPlayedToday || 0) * 120)),
      target: 60
    },
    {
      id: 'defeat_2_chars',
      title: 'Defeat 2 Boss Characters',
      subtitle: 'KO 2 target characters in Slap game',
      reward: 30,
      icon: Sword,
      iconBg: 'bg-red-500 text-white',
      current: Math.min(2, stats.charactersDefeatedToday || 0),
      target: 2
    },
    {
      id: 'watch_15_ads',
      title: 'Watch 15 Video Ads',
      subtitle: 'Watch sponsor videos to earn extra SP',
      reward: 40,
      icon: Tv,
      iconBg: 'bg-purple-600 text-white',
      current: Math.min(15, adsWatchedToday),
      target: 15,
      shortcut: () => startWatchingAd()
    },
    {
      id: 'earn_500_sp',
      title: 'Earn 500 SP Today',
      subtitle: 'Accumulate 500 SP points today',
      reward: 50,
      icon: Coins,
      iconBg: 'bg-[#00D09E] text-slate-950',
      current: Math.min(500, stats.spEarnedToday || 0),
      target: 500
    },
    {
      id: 'complete_1_survey',
      title: 'Complete 1 Survey Task',
      subtitle: 'Complete a market research survey',
      reward: 75,
      icon: CheckSquare,
      iconBg: 'bg-cyan-500 text-slate-950',
      current: Math.min(1, stats.surveysCompletedToday || 0),
      target: 1,
      shortcut: () => { sound.playSuccess(); setShowTaskModal(true); }
    },
    {
      id: 'complete_1_offer',
      title: 'Complete 1 Offerwall Task',
      subtitle: 'Finish an app or game offer',
      reward: 100,
      icon: Zap,
      iconBg: 'bg-amber-400 text-slate-950',
      current: Math.min(1, stats.offersCompletedToday || 0),
      target: 1,
      shortcut: () => { sound.playSuccess(); setShowTaskModal(true); }
    }
  ];

  // 10th grand completion task: Complete All Daily Tasks
  const basicCompletedCount = basicChallengesList.filter(c => c.current >= c.target).length;
  const allDailyChallengesList = [
    ...basicChallengesList,
    {
      id: 'complete_all_tasks',
      title: 'Complete All Daily Tasks',
      subtitle: 'Finish all 9 daily challenges for a grand bonus',
      reward: 100,
      icon: Award,
      iconBg: 'bg-gradient-to-r from-amber-400 to-rose-500 text-white font-black',
      current: basicCompletedCount,
      target: 9
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
          <h3 className="text-3.5xl font-black text-slate-950 tracking-tight mt-1 leading-none flex items-baseline">
            <AnimatedOdometer value={stats.coins} suffix="SP" />
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
            id="ad-button"
            data-testid="watch-ad-btn"
            onClick={startWatchingAd}
            disabled={adsWatchedToday >= 20}
            className={`ad-button watch-ad-btn px-3.5 py-1.5 rounded-xl border-2 border-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all ${
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

      {/* Adsterra Sponsor Banner on Home Page */}
      <AdsterraBanner />

      {/* New Player Starter Pack Bonus Banner */}
      {!stats.hasClaimedStarterPack && (
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-slate-950 flex flex-col gap-2 relative overflow-hidden"
          id="starter-pack-bonus-card"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 bg-white border-3 border-slate-900 rounded-[14px] flex items-center justify-center text-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
                🎁
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-white/80 px-1.5 py-0.2 rounded-md border border-slate-900">
                    Welcome Gift
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <h3 className="text-sm font-black text-slate-950 leading-tight mt-0.5">
                  Starter Pack Bonus
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimStarterPack}
              className="bg-slate-950 hover:bg-slate-800 text-amber-300 font-black text-xs px-3 py-2 rounded-[14px] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Claim +100 SP</span>
            </button>
          </div>

          <div className="bg-slate-950/15 border border-slate-900/20 rounded-xl px-2.5 py-1 flex items-center justify-between text-[10.5px] font-black text-slate-950">
            <span>🪙 +100 SP Starter Pack</span>
            <span>⚡ +50 Slaps Bonus</span>
            <span>🏆 Level 1 Booster</span>
          </div>
        </motion.div>
      )}

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

      {/* Daily Tasks Section matching Earn Page Colors & Styling */}
      <div 
        className="bg-white border-4 border-slate-900 rounded-[28px] p-4 text-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3.5 relative overflow-hidden" 
        id="daily-tasks-section"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-3 border-slate-900 gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-[#FFD043] border-3 border-slate-900 rounded-[18px] flex items-center justify-center text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
              <Trophy className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-950 tracking-tight uppercase">DAILY TASKS</h3>
                <span className="bg-[#FFEED1] text-slate-950 border-2 border-slate-900 font-black text-[10px] px-2 py-0.5 rounded-full uppercase shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                  5 SP - 100 SP
                </span>
              </div>
              <p className="text-slate-500 font-bold text-[11px] mt-0.5">
                Complete daily tasks to earn SP rewards!
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Daily Reset Countdown Timer */}
            <div className="bg-[#FFEED1] border-2 border-slate-900 px-2.5 py-1 rounded-[14px] flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
              <Clock className="w-3.5 h-3.5 text-[#FF3B77] stroke-[2.5px] animate-pulse shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-600 font-extrabold uppercase leading-none">Resets in</span>
                <span className="text-[11px] font-mono font-black text-slate-950 leading-tight tracking-tight">{timeLeftStr || '--h --m --s'}</span>
              </div>
            </div>

            {/* Claimed Counter */}
            <div className="bg-[#00D09E] border-2 border-slate-900 px-2.5 py-1 rounded-[14px] text-right shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-xs font-black text-slate-950">
                {allDailyChallengesList.filter(c => claimedChallenges.includes(c.id)).length} / {allDailyChallengesList.length}
              </span>
              <span className="text-[8px] text-slate-900 block font-extrabold leading-none uppercase">Claimed</span>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex flex-col gap-3 relative z-10">
          {allDailyChallengesList.map((item) => {
            const isClaimed = claimedChallenges.includes(item.id);
            const isCompleted = item.current >= item.target;
            const progressPercent = Math.min(100, Math.floor((item.current / item.target) * 100));
            const IconComponent = item.icon;

            return (
              <div 
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-[22px] border-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isClaimed 
                    ? 'bg-slate-100/90 border-slate-300 opacity-75 shadow-none' 
                    : isCompleted 
                      ? 'bg-[#E8FDF5] border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,208,158,1)] ring-2 ring-[#00D09E]/50' 
                      : 'bg-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-[#FAF8F5]'
                }`}
                id={`daily-task-item-${item.id}`}
              >
                {/* Left Icon & Details */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-[16px] border-3 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${item.iconBg}`}>
                    <IconComponent className="w-5.5 h-5.5 stroke-[2.5px]" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Title & Reward Tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-sm sm:text-base text-slate-950 leading-snug break-words">
                        {item.title}
                      </span>
                      <span className="text-xs font-black text-[#FF3B77] shrink-0 bg-[#FFF0F4] border-2 border-[#FF3B77]/40 px-2.5 py-0.5 rounded-full shadow-[1px_1px_0px_0px_rgba(255,59,119,0.2)]">
                        +{item.reward} SP
                      </span>
                    </div>

                    {/* Task Description / Subtitle */}
                    {item.subtitle && (
                      <p className="text-xs font-extrabold text-slate-600 mt-0.5 leading-snug">
                        {item.subtitle}
                      </p>
                    )}

                    {/* Progress Bar & High-Contrast Progress Numbers */}
                    <div className="flex items-center gap-2.5 mt-2">
                      <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-[#00D09E]' : 'bg-[#FF3B77]'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-black text-slate-950 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md shrink-0 shadow-xs">
                        {item.current.toLocaleString()} / {item.target.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action / Claim Button */}
                <div className="shrink-0 flex items-center justify-end pt-1 sm:pt-0">
                  {isClaimed ? (
                    <span className="bg-slate-200 text-slate-700 border-2 border-slate-400 font-black text-xs px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                      <Check className="w-4 h-4 stroke-[3px] text-emerald-600" />
                      Completed
                    </span>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaimChallenge(item.id, item.reward, item.title)}
                      className="w-full sm:w-auto bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2 rounded-[14px] border-2.5 border-slate-900 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer"
                    >
                      Claim +{item.reward} SP 🎉
                    </button>
                  ) : item.shortcut ? (
                    <button
                      onClick={item.shortcut}
                      className="bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs px-4 py-1.5 rounded-[12px] border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer uppercase tracking-wide"
                    >
                      Start Task
                    </button>
                  ) : (
                    <span className="bg-slate-100 text-slate-800 border-2 border-slate-300 font-extrabold text-xs px-2.5 py-1 rounded-xl">
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
        className="bg-white border-4 border-slate-900 rounded-[28px] p-4 text-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3.5 relative overflow-hidden"
        id="slapearn-hand-shop-card"
      >
        <div className="flex items-center justify-between border-b-3 border-slate-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-[#FFD043] border-3 border-slate-900 rounded-[18px] flex items-center justify-center text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
              <Sword className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h4 className="font-black text-base text-slate-950 tracking-tight uppercase">HAND SHOP & UPGRADES</h4>
              <p className="text-slate-500 font-bold text-[11px] mt-0.5">
                Equip & Unlock Slap Hands
              </p>
            </div>
          </div>
          <span className="bg-[#FFEED1] text-slate-950 border-2 border-slate-900 font-black text-[10px] px-2.5 py-1 rounded-full uppercase shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
            {unlockedHandsList.length}/{HAND_UPGRADES.length} Unlocked
          </span>
        </div>

        {/* Currently Equipped Hand Summary */}
        {selectedHandObj && (
          <div className="bg-[#FAF8F5] border-2.5 border-slate-900 rounded-[20px] p-3 flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white border-2 border-slate-900 rounded-[14px] p-1 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                <HandVisual id={selectedHandObj.id} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-950">{selectedHandObj.name}</span>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] ${selectedHandObj.rarityColor}`}>
                    {selectedHandObj.rarity}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 mt-1">
                  <span>Dmg: <strong className="text-slate-950">{selectedHandObj.minDamage}-{selectedHandObj.maxDamage}</strong></span>
                  <span>•</span>
                  <span>Crit: <strong className="text-[#FF3B77]">{Math.round(selectedHandObj.criticalChance * 100)}%</strong></span>
                  <span>•</span>
                  <span>SP: <strong className="text-emerald-700">+{Math.round(selectedHandObj.spBonus * 100)}%</strong></span>
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
          className="w-full py-3 rounded-[16px] border-3 border-slate-900 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Hand className="w-4 h-4 stroke-[2.5px]" />
          <span>Open Hand Shop & Inspect Details 🥊</span>
        </button>
      </div>

      {/* Hand Shop Modal Prompt */}
      <AnimatePresence>
        {showHandShopModal && (
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowHandShopModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border-4 border-slate-900 rounded-[32px] w-full max-w-[480px] max-h-[92vh] p-4 sm:p-5 relative shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] text-slate-950 flex flex-col my-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b-3 border-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 bg-[#FFD043] border-3 border-slate-900 rounded-[16px] flex items-center justify-center text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
                    <Sword className="w-5.5 h-5.5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">HAND SHOP & UPGRADES</h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase">
                      Inspect details & unlock powerful hands
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playSuccess();
                    setShowHandShopModal(false);
                  }}
                  className="w-9 h-9 rounded-full border-2.5 border-slate-900 bg-white hover:bg-[#FFEED1] flex items-center justify-center text-slate-950 transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-90 cursor-pointer"
                  title="Close Shop"
                >
                  <X className="w-4.5 h-4.5 stroke-[3px]" />
                </button>
              </div>

              {/* Hand Selector Tabs */}
              <div className="flex items-center justify-between gap-1.5 py-2.5 border-b-2 border-slate-900 overflow-x-auto">
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
                        className={`px-3 py-1.5 rounded-[12px] border-2 border-slate-900 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          isTabActive
                            ? 'bg-[#FFD043] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                            : 'bg-slate-100 text-slate-700 hover:bg-[#FFEED1] hover:text-slate-950 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                        }`}
                      >
                        <span>{h.name.split(' ')[0]}</span>
                        {isUnlocked ? (
                          <span className="w-2 h-2 rounded-full bg-[#00D09E] border border-slate-900" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-500" />
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
                  className={`px-2.5 py-1.5 rounded-[12px] border-2 border-slate-900 font-black text-[10px] uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    shopViewMode === 'all'
                      ? 'bg-[#4965FF] text-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {shopViewMode === 'all' ? 'Inspector' : 'All List'}
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
                        <div className={`bg-[#FAF8F5] border-3 border-slate-900 rounded-[24px] p-4 text-slate-950 flex flex-col gap-3.5 relative overflow-hidden shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]`}>
                          
                          {/* Rarity & Status Header */}
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] ${hand.rarityColor}`}>
                              {hand.rarity} HAND
                            </span>
                            {isSelected ? (
                              <span className="bg-[#00D09E] text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                                <CheckCircle className="w-3.5 h-3.5 text-slate-950 stroke-[3px]" />
                                Active Hand
                              </span>
                            ) : isUnlocked ? (
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-3 py-1 rounded-full border border-slate-900 uppercase shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                                Unlocked
                              </span>
                            ) : (
                              <span className="bg-[#FFEED1] text-amber-950 font-black text-[10px] px-3 py-1 rounded-full border border-slate-900 uppercase flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                                <Lock className="w-3 h-3 text-slate-900" />
                                Locked
                              </span>
                            )}
                          </div>

                          {/* Hand Visual Preview Canvas */}
                          <div className="w-full aspect-[16/9] rounded-[20px] overflow-hidden border-3 border-slate-900 bg-white shadow-inner p-3 flex items-center justify-center relative">
                            <div className={`w-32 h-32 flex items-center justify-center transition-all ${!isUnlocked ? 'brightness-75 filter saturate-50' : ''}`}>
                              <HandVisual id={hand.id} />
                            </div>
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
                                <Lock className="w-8 h-8 text-amber-300 stroke-[2.5px]" />
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Locked Hand</span>
                              </div>
                            )}
                          </div>

                          {/* Hand Title & Description */}
                          <div>
                            <h4 className="text-2xl font-black text-slate-950 tracking-tight flex items-center justify-between">
                              <span>{hand.name}</span>
                            </h4>
                            <p className="text-slate-600 text-xs font-bold mt-0.5 leading-relaxed">
                              {hand.description}
                            </p>
                          </div>

                          {/* Full Detailed Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-[18px] border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8F5] border border-slate-900 text-center">
                              <Sword className="w-4 h-4 text-rose-500 mb-1 stroke-[2.5px]" />
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Damage</span>
                              <span className="font-mono font-black text-sm text-slate-950 mt-0.5">
                                {hand.minDamage}–{hand.maxDamage}
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8F5] border border-slate-900 text-center">
                              <Sparkles className="w-4 h-4 text-[#FF3B77] mb-1 stroke-[2.5px]" />
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Crit Rate</span>
                              <span className="font-mono font-black text-sm text-[#FF3B77] mt-0.5">
                                {Math.round(hand.criticalChance * 100)}%
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8F5] border border-slate-900 text-center">
                              <Coins className="w-4 h-4 text-[#00D09E] mb-1 stroke-[2.5px]" />
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">SP Bonus</span>
                              <span className="font-mono font-black text-sm text-emerald-700 mt-0.5">
                                +{Math.round(hand.spBonus * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Unlock Requirements Section */}
                          {!isUnlocked && (
                            <div className="flex flex-col gap-3 bg-white p-3.5 rounded-[20px] border-2.5 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mt-1">
                              
                              {/* STAGE 1: Mandatory Ads Requirement Progress */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <Tv className="w-3.5 h-3.5 text-[#FF3B77]" />
                                    <span>1. Mandatory Ads Progress:</span>
                                  </span>
                                  <span className={`font-mono font-black ${adsMet ? 'text-emerald-700' : 'text-[#FF3B77]'}`}>
                                    {lifetimeAdsWatched} / {req.requiredAds} Ads
                                  </span>
                                </div>

                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-slate-900">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      adsMet ? 'bg-[#00D09E]' : 'bg-[#FF3B77]'
                                    }`}
                                    style={{ width: `${adProgressPercent}%` }}
                                  />
                                </div>

                                <div className="text-[10px] text-slate-600 flex justify-between items-center font-bold">
                                  {adsMet ? (
                                    <span className="text-emerald-700 font-black flex items-center gap-1">
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
                              <div className="border-t-2 border-slate-900 pt-2.5 flex flex-col gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-black text-slate-600">
                                  2. Choose Unlock Option (After Ads Completed):
                                </span>

                                {/* Option A: SP Instant Unlock */}
                                <div className={`p-3 rounded-xl border-2 border-slate-900 flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] ${
                                  adsMet ? 'bg-[#FFF9EE]' : 'bg-slate-100 opacity-60'
                                }`}>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-950 flex items-center gap-1">
                                      <Coins className="w-3.5 h-3.5 text-[#FFD043]" /> Option A: Pay SP
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-bold">
                                      Cost: {req.spPrice.toLocaleString()} SP
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleUnlockWithSP(hand)}
                                    disabled={!adsMet || stats.coins < req.spPrice || !levelMet}
                                    className={`px-3.5 py-1.5 rounded-xl border-2.5 border-slate-900 font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer ${
                                      !adsMet || stats.coins < req.spPrice || !levelMet
                                        ? 'bg-slate-200 text-slate-400 border-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-[#FFD043] hover:bg-yellow-400 text-slate-950'
                                    }`}
                                  >
                                    Pay {req.spPrice.toLocaleString()} SP
                                  </button>
                                </div>

                                {/* Option B: Offerwall / Survey Tasks Unlock */}
                                <div className={`p-3 rounded-xl border-2 border-slate-900 flex flex-col gap-2 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] ${
                                  adsMet ? 'bg-[#F0FDF4]' : 'bg-slate-100 opacity-60'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-950 flex items-center gap-1">
                                        <CheckSquare className="w-3.5 h-3.5 text-[#00D09E]" /> Option B: Free Task Unlock
                                      </span>
                                      <span className="text-[10px] text-slate-600 font-bold">
                                        Tasks: {totalTasksCompleted} / {req.requiredTasks} Completed
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => handleUnlockWithTasks(hand)}
                                      disabled={!adsMet || !tasksMet || !levelMet}
                                      className={`px-3.5 py-1.5 rounded-xl border-2.5 border-slate-900 font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer ${
                                        !adsMet || !tasksMet || !levelMet
                                          ? 'bg-slate-200 text-slate-400 border-slate-400 cursor-not-allowed shadow-none'
                                          : 'bg-[#00D09E] hover:bg-emerald-400 text-slate-950'
                                      }`}
                                    >
                                      {tasksMet ? 'Claim Free Unlock 🎉' : `${totalTasksCompleted}/${req.requiredTasks} Tasks`}
                                    </button>
                                  </div>

                                  <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border-2 border-slate-900">
                                    <div 
                                      className="bg-[#00D09E] h-full rounded-full transition-all duration-300"
                                      style={{ width: `${taskProgressPercent}%` }}
                                    />
                                  </div>

                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                    {req.requiredLevel && (
                                      <span className={levelMet ? 'text-emerald-700 font-black' : 'text-[#FF3B77] font-black'}>
                                        Level {req.requiredLevel} ({stats.level}/{req.requiredLevel})
                                      </span>
                                    )}
                                    <button
                                      onClick={() => {
                                        setShowHandShopModal(false);
                                        setShowTaskModal(true);
                                      }}
                                      className="text-[#4965FF] hover:underline font-black flex items-center gap-0.5 ml-auto"
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
                              className={`w-full py-3.5 rounded-[16px] border-3 border-slate-900 font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-[1.5px] active:shadow-none cursor-pointer mt-1 ${
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
                          className={`bg-white border-3 border-slate-900 rounded-[20px] p-3 text-slate-950 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FFEED1]/40 transition-all shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] ${
                            isSelected ? 'ring-2 ring-[#FFD043]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 border-2 border-slate-900 rounded-xl p-1 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                              <HandVisual id={hand.id} />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-950">{hand.name}</span>
                                <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase border border-slate-900 shadow-[0.5px_0.5px_0px_0px_rgba(15,23,42,1)] ${hand.rarityColor}`}>
                                  {hand.rarity}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-600 font-extrabold mt-0.5">
                                Dmg: <strong className="text-slate-950">{hand.minDamage}-{hand.maxDamage}</strong> • SP: <strong className="text-emerald-700">+{Math.round(hand.spBonus * 100)}%</strong>
                              </span>
                            </div>
                          </div>

                          <div>
                            {isSelected ? (
                              <span className="bg-[#00D09E] text-slate-950 border border-slate-900 font-black text-[9px] px-2.5 py-1 rounded-full uppercase shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">Active</span>
                            ) : isUnlocked ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-slate-900 font-extrabold text-[9px] px-2.5 py-1 rounded-full uppercase">Inspect</span>
                            ) : (
                              <span className="bg-[#FFEED1] text-amber-950 border border-slate-900 font-black text-[9px] px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-slate-900" /> Locked
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
              <div className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 my-3 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                {adPlaying ? (
                  <>
                    <div className="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-2" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-widest animate-pulse mb-2">
                      Playing Advertisement... {adProgress}%
                    </span>
                    <RewardedAdScript />
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
                    <h5 className="font-black text-xs text-white">MyLead Offerwall Task</h5>
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
                    <h5 className="font-black text-xs text-white">MyLead Opinion Survey</h5>
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
                          +{item.coins} SP
                        </div>
                        <div className="font-bold text-[8px] text-amber-400 mt-0.5 flex items-center justify-center gap-0.5">
                          <span>+{item.slaps} {item.slaps === 1 ? 'Slap' : 'Slaps'}</span>
                        </div>
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
              className="absolute w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.25)_0%,rgba(244,63,94,0.15)_40%,transparent_70%)] pointer-events-none"
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
