export interface HandUpgrade {
  id: string;
  name: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  rarityColor: string; // Tailwind color class for text/tag
  borderColor: string; // Tailwind border color
  shadowColor: string; // Custom shadow style matching image
  image: string;
  description: string;
  minDamage: number;
  maxDamage: number;
  criticalChance: number; // e.g. 0.05 for 5%
  spBonus: number; // e.g. 0.05 for +5%
  unlockCost: number;
}

export const HAND_UPGRADES: HandUpgrade[] = [
  {
    id: 'wooden',
    name: 'Wooden Hand',
    rarity: 'COMMON',
    rarityColor: 'bg-slate-600 text-white',
    borderColor: 'border-slate-800',
    shadowColor: 'shadow-[0_4px_12px_rgba(100,116,139,0.15)]',
    image: '/src/assets/images/wooden_hand_1784281310329.jpg',
    description: 'Simple but reliable.',
    minDamage: 1,
    maxDamage: 2,
    criticalChance: 0.05,
    spBonus: 0.0,
    unlockCost: 0
  },
  {
    id: 'iron',
    name: 'Iron Hand',
    rarity: 'UNCOMMON',
    rarityColor: 'bg-emerald-600 text-white',
    borderColor: 'border-emerald-600',
    shadowColor: 'shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
    image: '/src/assets/images/iron_hand_1784281319928.jpg',
    description: 'Solid and dependable.',
    minDamage: 2,
    maxDamage: 4,
    criticalChance: 0.10,
    spBonus: 0.05,
    unlockCost: 1000
  },
  {
    id: 'golden',
    name: 'Golden Hand',
    rarity: 'RARE',
    rarityColor: 'bg-blue-600 text-white',
    borderColor: 'border-blue-600',
    shadowColor: 'shadow-[0_4px_12px_rgba(59,130,246,0.2)]',
    image: '/src/assets/images/golden_hand_1784281328952.jpg',
    description: 'Shiny, powerful, legendary.',
    minDamage: 4,
    maxDamage: 7,
    criticalChance: 0.18,
    spBonus: 0.12,
    unlockCost: 5000
  },
  {
    id: 'crystal',
    name: 'Crystal Hand',
    rarity: 'EPIC',
    rarityColor: 'bg-purple-600 text-white',
    borderColor: 'border-purple-600',
    shadowColor: 'shadow-[0_4px_12px_rgba(168,85,247,0.2)]',
    image: '/src/assets/images/crystal_hand_1784281340966.jpg',
    description: 'Refined for maximum impact.',
    minDamage: 7,
    maxDamage: 12,
    criticalChance: 0.25,
    spBonus: 0.20,
    unlockCost: 20000
  },
  {
    id: 'dragon',
    name: 'Dragon Hand',
    rarity: 'LEGENDARY',
    rarityColor: 'bg-amber-600 text-white',
    borderColor: 'border-amber-600',
    shadowColor: 'shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
    image: '/src/assets/images/dragon_hand_1784281351520.jpg',
    description: 'Forged in fire. Supreme power.',
    minDamage: 12,
    maxDamage: 20,
    criticalChance: 0.35,
    spBonus: 0.35,
    unlockCost: 50000
  }
];
