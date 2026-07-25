import { UserStats } from '../types';

export interface TitleTier {
  id: string;
  title: string;
  icon: string;
  minLevel: number;
  maxLevel: number;
  levelRangeText: string;
  rewardText: string;
  frameType?: 'none' | 'bronze' | 'silver' | 'gold_animated';
  hasGoldenName?: boolean;
  slapReward?: number;
  spinReward?: number;
  unlockHandId?: string;
  color: string;
  bgGrad: string;
}

export const TITLE_TIERS: TitleTier[] = [
  {
    id: 'rookie',
    title: 'Rookie',
    icon: '🌱',
    minLevel: 1,
    maxLevel: 5,
    levelRangeText: 'Level 1 - 5',
    rewardText: '+5 Slaps + Rookie Badge',
    slapReward: 5,
    frameType: 'none',
    color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700',
    bgGrad: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'slapper',
    title: 'Slapper',
    icon: '🥊',
    minLevel: 6,
    maxLevel: 10,
    levelRangeText: 'Level 6 - 10',
    rewardText: '+10 Slaps + Bronze Profile Frame',
    slapReward: 10,
    frameType: 'bronze',
    color: 'border-amber-600 bg-amber-600/10 text-amber-800',
    bgGrad: 'from-amber-600 to-amber-800',
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    icon: '⚡',
    minLevel: 11,
    maxLevel: 20,
    levelRangeText: 'Level 11 - 20',
    rewardText: '+1 Free Wheel Spin + Lightning Badge',
    spinReward: 1,
    frameType: 'none',
    color: 'border-yellow-500 bg-yellow-500/10 text-yellow-800',
    bgGrad: 'from-yellow-400 to-amber-500',
  },
  {
    id: 'fruit_hunter',
    title: 'Fruit Hunter',
    icon: '🍓',
    minLevel: 21,
    maxLevel: 35,
    levelRangeText: 'Level 21 - 35',
    rewardText: '+15 Slaps + Fruit Profile Icon',
    slapReward: 15,
    frameType: 'none',
    color: 'border-rose-500 bg-rose-500/10 text-rose-800',
    bgGrad: 'from-rose-400 to-pink-500',
  },
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    icon: '👹',
    minLevel: 36,
    maxLevel: 50,
    levelRangeText: 'Level 36 - 50',
    rewardText: 'Unlock special boss skin + 1 Free Spin',
    spinReward: 1,
    unlockHandId: 'dragon',
    frameType: 'none',
    color: 'border-red-600 bg-red-600/10 text-red-800',
    bgGrad: 'from-red-500 to-rose-700',
  },
  {
    id: 'elite_slapper',
    title: 'Elite Slapper',
    icon: '💎',
    minLevel: 51,
    maxLevel: 75,
    levelRangeText: 'Level 51 - 75',
    rewardText: '+20 Slaps + Silver Profile Frame',
    slapReward: 20,
    frameType: 'silver',
    color: 'border-cyan-500 bg-cyan-500/10 text-cyan-800',
    bgGrad: 'from-cyan-300 to-blue-500',
  },
  {
    id: 'legend',
    title: 'Legend',
    icon: '🔥',
    minLevel: 76,
    maxLevel: 99,
    levelRangeText: 'Level 76 - 99',
    rewardText: 'Golden Name Color + 2 Free Wheel Spins',
    spinReward: 2,
    hasGoldenName: true,
    frameType: 'none',
    color: 'border-orange-500 bg-orange-500/10 text-orange-800',
    bgGrad: 'from-orange-500 to-red-600',
  },
  {
    id: 'grand_master',
    title: 'Grand Master',
    icon: '👑',
    minLevel: 100,
    maxLevel: 99999,
    levelRangeText: 'Level 100+',
    rewardText: 'Exclusive Crown Badge + Animated Border + 25 Slaps',
    slapReward: 25,
    frameType: 'gold_animated',
    hasGoldenName: true,
    color: 'border-amber-400 bg-amber-400/15 text-amber-900',
    bgGrad: 'from-amber-300 via-yellow-400 to-amber-500',
  },
];

/**
 * Get the title tier object corresponding to a player's level
 */
export function getTitleTierForLevel(level: number): TitleTier {
  const found = TITLE_TIERS.slice().reverse().find((t) => level >= t.minLevel);
  return found || TITLE_TIERS[0];
}

/**
 * Process title unlocks and claim rewards ONCE as player levels up.
 * Returns updated stats and a list of new notifications to emit.
 */
export function processTitleUnlocks(
  stats: UserStats,
  addNotification?: (title: string, message: string, type: 'success' | 'info') => void
): { updatedStats: UserStats; newNotifications: { title: string; message: string }[] } {
  const currentLevel = stats.level || 1;
  const claimed = stats.claimedTitleRewards || [];
  const achieved = stats.achievedTitles || [];
  const unlockedHands = stats.unlockedHands || ['wooden'];

  let updatedStats = { ...stats };
  const notifications: { title: string; message: string }[] = [];

  // Determine highest title for current level
  const highestTier = getTitleTierForLevel(currentLevel);

  // Auto-replace equipped title permanently with highest achieved title if user hasn't explicitly set a higher one
  let nextEquippedTitle = updatedStats.equippedTitle || highestTier.title;
  let nextEquippedFrame = updatedStats.equippedFrame || highestTier.frameType || 'none';

  // Find all tiers unlocked up to currentLevel
  const unlockedTiers = TITLE_TIERS.filter((tier) => currentLevel >= tier.minLevel);

  const nextClaimed = [...claimed];
  const nextAchieved = [...achieved];
  const nextUnlockedHands = [...unlockedHands];

  for (const tier of unlockedTiers) {
    if (!nextAchieved.includes(tier.title)) {
      nextAchieved.push(tier.title);
    }

    // Always ensure current highest level title becomes the equipped title replacing previous ones permanently!
    if (tier.minLevel === highestTier.minLevel) {
      nextEquippedTitle = tier.title;
      if (tier.frameType && tier.frameType !== 'none') {
        nextEquippedFrame = tier.frameType;
      }
    }

    // Check if reward for this tier has been claimed yet
    if (!nextClaimed.includes(tier.id)) {
      nextClaimed.push(tier.id);

      // 1. Slaps reward
      if (tier.slapReward) {
        updatedStats.slapsToday = Math.max(0, (updatedStats.slapsToday ?? 0) - tier.slapReward);
      }

      // 2. Free wheel spins reward
      if (tier.spinReward) {
        updatedStats.freeSpins = (updatedStats.freeSpins || 0) + tier.spinReward;
      }

      // 3. Boss skin reward
      if (tier.unlockHandId && !nextUnlockedHands.includes(tier.unlockHandId)) {
        nextUnlockedHands.push(tier.unlockHandId);
      }

      // 4. Frame reward
      if (tier.frameType && tier.frameType !== 'none') {
        nextEquippedFrame = tier.frameType;
      }

      notifications.push({
        title: `🏆 NEW TITLE: ${tier.title.toUpperCase()}!`,
        message: `Reached ${tier.levelRangeText}! Reward claimed once: ${tier.rewardText}`,
      });
    }
  }

  updatedStats.claimedTitleRewards = nextClaimed;
  updatedStats.achievedTitles = nextAchieved;
  updatedStats.equippedTitle = nextEquippedTitle;
  updatedStats.equippedFrame = nextEquippedFrame;
  updatedStats.unlockedHands = nextUnlockedHands;

  // Trigger notifications
  if (addNotification) {
    for (const note of notifications) {
      addNotification(note.title, note.message, 'success');
    }
  }

  return { updatedStats, newNotifications: notifications };
}
