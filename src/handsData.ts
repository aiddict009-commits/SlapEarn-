export interface HandRequirement {
  requiredAds: number;
  spPrice: number;
  requiredTasks: number;
  requiredLevel?: number;
}

export interface HandUpgrade {
  id: string;
  name: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  rarityColor: string;
  borderColor: string;
  shadowColor: string;
  description: string;
  minDamage: number;
  maxDamage: number;
  criticalChance: number;
  spBonus: number;
  unlockCost: number; // for backward compatibility
  requirements: HandRequirement;
}

export const HAND_UPGRADES: HandUpgrade[] = [
  {
    id: 'wooden',
    name: 'Wooden Hand',
    rarity: 'COMMON',
    rarityColor: 'bg-amber-800 text-white',
    borderColor: 'border-amber-900',
    shadowColor: 'shadow-[0_4px_12px_rgba(139,90,43,0.25)]',
    description: 'Basic wooden hand. Unlocked by default, sturdy & reliable.',
    minDamage: 1,
    maxDamage: 2,
    criticalChance: 0.05,
    spBonus: 0.0,
    unlockCost: 0,
    requirements: { requiredAds: 0, spPrice: 0, requiredTasks: 0 }
  },
  {
    id: 'stone',
    name: 'Stone Hand',
    rarity: 'UNCOMMON',
    rarityColor: 'bg-slate-600 text-white',
    borderColor: 'border-slate-700',
    shadowColor: 'shadow-[0_4px_12px_rgba(71,85,105,0.3)]',
    description: 'Heavy stone hand. Delivers crushing slaps!',
    minDamage: 2,
    maxDamage: 4,
    criticalChance: 0.10,
    spBonus: 0.05,
    unlockCost: 2500,
    requirements: { requiredAds: 100, spPrice: 2500, requiredTasks: 2 }
  },
  {
    id: 'gold',
    name: 'Gold Hand',
    rarity: 'EPIC',
    rarityColor: 'bg-amber-500 text-slate-950 font-black',
    borderColor: 'border-amber-500',
    shadowColor: 'shadow-[0_4px_12px_rgba(245,158,11,0.35)]',
    description: 'Pure gold hand. Extremely shiny and lucrative.',
    minDamage: 7,
    maxDamage: 12,
    criticalChance: 0.25,
    spBonus: 0.25,
    unlockCost: 20000,
    requirements: { requiredAds: 500, spPrice: 20000, requiredTasks: 10, requiredLevel: 50 }
  },
  {
    id: 'diamond',
    name: 'Diamond Hand',
    rarity: 'LEGENDARY',
    rarityColor: 'bg-cyan-500 text-slate-950 font-black',
    borderColor: 'border-cyan-500',
    shadowColor: 'shadow-[0_4px_12px_rgba(6,182,212,0.4)]',
    description: 'Faceted diamond hand. Unstoppable slap power!',
    minDamage: 12,
    maxDamage: 20,
    criticalChance: 0.40,
    spBonus: 0.50,
    unlockCost: 50000,
    requirements: { requiredAds: 1000, spPrice: 50000, requiredTasks: 20, requiredLevel: 75 }
  },
  {
    id: 'legendary',
    name: 'Legendary Hand',
    rarity: 'MYTHIC',
    rarityColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-black',
    borderColor: 'border-purple-600',
    shadowColor: 'shadow-[0_4px_16px_rgba(168,85,247,0.45)]',
    description: 'Mythical radiant hand of supreme slap dominance.',
    minDamage: 20,
    maxDamage: 35,
    criticalChance: 0.60,
    spBonus: 1.0,
    unlockCost: 150000,
    requirements: { requiredAds: 2000, spPrice: 150000, requiredTasks: 40, requiredLevel: 100 }
  }
];
