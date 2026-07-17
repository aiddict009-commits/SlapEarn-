import { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Hand, Gift, Sword, Sparkles, Coins, Lock, CheckCircle, HelpCircle, Star, ArrowUp } from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction } from '../types';
import { HAND_UPGRADES, HandUpgrade } from '../handsData';

interface HomeProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

export default function Home({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification }: HomeProps) {
  // Check if claimed today using exact ISO dates
  const hasClaimedToday = stats.lastCheckIn 
    ? new Date(stats.lastCheckIn).toDateString() === new Date().toDateString() 
    : false;

  const handleClaimDaily = () => {
    if (hasClaimedToday) {
      sound.playError();
      return;
    }

    // Daily bonus reward
    const rewardCoins = 50;
    
    updateCoinsAndXp(rewardCoins, 10, 'Daily Check-in', 'Daily Bonus');
    updateStatsDirectly({
      lastCheckIn: new Date().toISOString()
    });

    sound.playSuccess();
    addNotification('Daily Bonus Claimed!', `Earned +${rewardCoins} SP!`, 'success');
  };

  const slapsAvailable = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);

  // Hands variables
  const unlockedHandsList = stats.unlockedHands || ['wooden'];
  const currentSelectedHand = stats.selectedHand || 'wooden';

  const handleUnlockOrEquip = (hand: HandUpgrade) => {
    const isUnlocked = unlockedHandsList.includes(hand.id);

    if (isUnlocked) {
      if (currentSelectedHand === hand.id) return;
      
      updateStatsDirectly({ selectedHand: hand.id });
      sound.playSuccess();
      addNotification('Hand Equipped!', `🥊 ${hand.name} is now equipped!`, 'success');
    } else {
      // Unlock logic
      if (stats.coins >= hand.unlockCost) {
        const updatedUnlocked = [...unlockedHandsList, hand.id];
        updateStatsDirectly({
          coins: stats.coins - hand.unlockCost,
          unlockedHands: updatedUnlocked,
          selectedHand: hand.id
        });
        sound.playSuccess();
        addNotification('Hand Unlocked!', `🎉 Unlocked and equipped the ${hand.name}!`, 'success');
      } else {
        sound.playError();
        addNotification('Inadequate SP!', `Need ${hand.unlockCost.toLocaleString()} SP for the ${hand.name}!`, 'info');
      }
    }
  };

  return (
    <div className="flex flex-col text-slate-900 select-none gap-3" id="home-view">
      
      {/* Welcome Message */}
      <div className="flex flex-col px-1" id="home-welcome-header">
        <h2 className="text-xl font-black text-slate-950 tracking-tight leading-none">
          Welcome back, Slap Champ! 👋
        </h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
          Level {stats.level} • Let's slap and earn!
        </p>
      </div>

      {/* Balance Card: Vibrant Teal Emerald Accent */}
      <div 
        className="bg-[#00D09E] rounded-[24px] border-4 border-slate-900 p-4 relative shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-[120px]"
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

        <div className="text-xs sm:text-sm font-black text-slate-950 opacity-80">
          ≈ K{(stats.coins / 100).toFixed(2)}
        </div>
      </div>

      {/* Daily Bonus Card: Soft Apricot Beige */}
      <div 
        className="bg-[#FFEED1] rounded-[24px] border-4 border-slate-900 p-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between"
        id="daily-bonus-card"
      >
        <div className="flex items-center">
          <div className="w-11 h-11 bg-[#FFD043] border-4 border-slate-900 rounded-[14px] flex items-center justify-center shadow-[1.5px_2px_0px_0px_rgba(15,23,42,1)]">
            <Gift className="w-4.5 h-4.5 text-slate-900 stroke-[2.5px]" />
          </div>
          <div className="flex flex-col ml-2.5">
            <span className="text-slate-950 font-black text-sm leading-tight">Daily bonus</span>
            <span className="text-slate-500 font-bold text-xs mt-0.5">+50 free SP</span>
          </div>
        </div>

        <button
          onClick={handleClaimDaily}
          disabled={hasClaimedToday}
          className={`font-black text-xs px-3.5 py-2 rounded-[14px] border-4 border-slate-900 transition-all ${
            hasClaimedToday
              ? 'bg-[#FF3B77]/40 text-white/80 cursor-not-allowed opacity-75 shadow-none'
              : 'bg-[#FF3B77] hover:bg-[#E33D6F] text-white shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] active:scale-95'
          }`}
        >
          {hasClaimedToday ? 'Claimed' : 'Claim'}
        </button>
      </div>

      {/* Stats Grid: Double Column White Cards */}
      <div className="grid grid-cols-2 gap-3" id="stats-grid">
        
        {/* Streak card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-28">
          <Flame className="w-5.5 h-5.5 text-[#FF3B77] stroke-[2.5px]" />
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-950 leading-none">{stats.streak}</span>
            <span className="text-slate-400 font-bold text-[10px] leading-tight mt-1">Current slap streak</span>
          </div>
        </div>

        {/* Slaps Available card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-28">
          <Hand className="w-5.5 h-5.5 text-[#4965FF] stroke-[2.5px]" />
          <div className="flex flex-col">
            <span className="text-3xl font-black text-slate-950 leading-none">{slapsAvailable}</span>
            <span className="text-slate-400 font-bold text-[10px] leading-tight mt-1">Slaps available</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SLAPEARN HANDS SECTION (MATCHING PIC STRUCTURE WITH HIGH FIDELITY)       */}
      {/* ========================================================================= */}
      <div className="mt-4 flex flex-col gap-3" id="slapearn-hands-section">
        
        {/* Section Header */}
        <div className="text-center py-2 flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-rose-500 animate-pulse text-lg">⚡</span>
            <h3 className="text-2xl font-black text-slate-950 tracking-tight uppercase">
              SLAPEARN HANDS
            </h3>
            <span className="text-yellow-500 text-lg">✦</span>
          </div>
          <p className="text-slate-500 font-bold text-[11px] uppercase tracking-wide mt-1">
            Stronger hands deal more damage and earn more SP!
          </p>
        </div>

        {/* List of Individual Sections for each hand precisely as the pictures */}
        <div className="flex flex-col gap-5">
          {HAND_UPGRADES.map((hand) => {
            const isUnlocked = unlockedHandsList.includes(hand.id);
            const isSelected = currentSelectedHand === hand.id;

            return (
              <div
                key={hand.id}
                className={`bg-[#0F172A] border-4 border-slate-950 rounded-[28px] p-4 text-white flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${hand.shadowColor} ${
                  isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#FDFBF2]' : ''
                }`}
                id={`hand-section-${hand.id}`}
              >
                {/* Rarity & Header Row */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest ${hand.rarityColor}`}>
                    {hand.rarity}
                  </span>
                  {isSelected && (
                    <span className="bg-[#00D09E] text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-slate-950 stroke-[3px]" />
                      Active
                    </span>
                  )}
                </div>

                {/* Hand Name & Description */}
                <div>
                  <h4 className="text-2xl font-black text-white tracking-tight">
                    {hand.name}
                  </h4>
                  <p className="text-slate-400 text-xs font-semibold mt-1">
                    {hand.description}
                  </p>
                </div>

                {/* Grid layout: Left Image, Right Stats */}
                <div className="grid grid-cols-5 gap-3 items-center">
                  
                  {/* Left Column: Hand Image Asset (2 cols) */}
                  <div className="col-span-2 relative aspect-square rounded-2xl overflow-hidden border-3 border-slate-800 bg-[#1E293B] shadow-inner">
                    <img
                      src={hand.image}
                      alt={hand.name}
                      className={`w-full h-full object-cover select-none pointer-events-none ${!isUnlocked ? 'brightness-50 filter saturate-50' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-slate-400 stroke-[2.5px]" />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Hand stats (3 cols) */}
                  <div className="col-span-3 flex flex-col gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 font-semibold text-xs text-slate-300">
                    
                    {/* Stat 1: Damage */}
                    <div className="flex justify-between items-center py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Sword className="w-3.5 h-3.5 text-rose-500 stroke-[2.5px]" />
                        <span>Damage per hit</span>
                      </div>
                      <span className="font-mono font-black text-white text-sm">
                        {hand.minDamage}–{hand.maxDamage}
                      </span>
                    </div>

                    {/* Stat 2: Critical Chance */}
                    <div className="flex justify-between items-center py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500 stroke-[2.5px]" />
                        <span>Critical Chance</span>
                      </div>
                      <span className="font-mono font-black text-yellow-400 text-sm">
                        {Math.round(hand.criticalChance * 100)}%
                      </span>
                    </div>

                    {/* Stat 3: SP Bonus */}
                    <div className="flex justify-between items-center py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#00D09E] stroke-[2.5px]" />
                        <span>SP Bonus</span>
                      </div>
                      <span className="font-mono font-black text-[#00D09E] text-sm">
                        +{Math.round(hand.spBonus * 100)}%
                      </span>
                    </div>

                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  onClick={() => handleUnlockOrEquip(hand)}
                  className={`w-full py-3.5 rounded-2xl border-4 border-slate-950 font-black text-xs uppercase tracking-wider shadow-[3px_3.5px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-[2.5px] active:shadow-none ${
                    isUnlocked
                      ? isSelected
                        ? 'bg-[#00D09E] text-slate-950 border-slate-950 cursor-default shadow-none translate-y-[2px]'
                        : 'bg-white text-slate-950 hover:bg-[#FFEED1]'
                      : stats.coins >= hand.unlockCost
                        ? 'bg-[#FFD043] text-slate-950 hover:bg-yellow-400'
                        : 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-75 shadow-none'
                  }`}
                >
                  {isUnlocked ? (
                    isSelected ? '✓ Equipped Active Hand' : 'Equip Hand'
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Unlock for {hand.unlockCost.toLocaleString()} SP
                    </span>
                  )}
                </button>

              </div>
            );
          })}
        </div>

        {/* Informational Banners at bottom of Section */}
        <div className="grid grid-cols-1 gap-2.5 mt-2" id="hands-footer-banners">
          
          {/* Banner 1: Better hands = More SP! */}
          <div className="bg-[#1E293B] border-3 border-slate-950 rounded-[20px] p-3 shadow-[2.5px_3px_0px_0px_rgba(15,23,42,1)] flex items-start gap-2.5">
            <div className="w-7 h-7 bg-amber-500 border-2 border-slate-950 rounded-lg flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-slate-950 fill-slate-950 stroke-[2px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-xs leading-none">Better hands = More SP!</span>
              <span className="text-slate-400 font-semibold text-[10px] mt-1 leading-normal">
                Upgrade your hands to slap harder and earn more bonus SP per tap.
              </span>
            </div>
          </div>

          {/* Banner 2: Hands are permanent! */}
          <div className="bg-[#1E293B] border-3 border-slate-950 rounded-[20px] p-3 shadow-[2.5px_3px_0px_0px_rgba(15,23,42,1)] flex items-start gap-2.5">
            <div className="w-7 h-7 bg-rose-500 border-2 border-slate-950 rounded-lg flex items-center justify-center shrink-0">
              <ArrowUp className="w-4 h-4 text-white stroke-[3px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-xs leading-none">Hands are permanent!</span>
              <span className="text-slate-400 font-semibold text-[10px] mt-1 leading-normal">
                Once unlocked, you keep them forever and can switch anytime in this section.
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
