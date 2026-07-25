import { useState, useRef, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Zap, Shield, Sparkles, Heart } from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction } from '../types';
import { HAND_UPGRADES } from '../handsData';
import { CharacterVisual } from './CharacterVisual';
import FruitMatch from './FruitMatch';

export interface SlapCharacter {
  id: string;
  name: string;
  maxHp: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  defeatCoins: number;
  defeatXp: number;
  folderPath: string;
}

export const CHARACTERS: SlapCharacter[] = [
  {
    id: 'momo',
    name: 'Momo Peach',
    maxHp: 50,
    rarity: 'COMMON',
    defeatCoins: 50,
    defeatXp: 30,
    folderPath: 'momo'
  },
  {
    id: 'puni',
    name: 'Puni Slime',
    maxHp: 80,
    rarity: 'UNCOMMON',
    defeatCoins: 90,
    defeatXp: 50,
    folderPath: 'puni'
  },
  {
    id: 'bobo',
    name: 'Bobo Tea',
    maxHp: 120,
    rarity: 'RARE',
    defeatCoins: 150,
    defeatXp: 80,
    folderPath: 'bobo'
  },
  {
    id: 'wooly',
    name: 'Wooly Alpaca',
    maxHp: 200,
    rarity: 'EPIC',
    defeatCoins: 280,
    defeatXp: 150,
    folderPath: 'wooly'
  },
  {
    id: 'aero',
    name: 'Aero Star',
    maxHp: 350,
    rarity: 'LEGENDARY',
    defeatCoins: 600,
    defeatXp: 300,
    folderPath: 'aero'
  }
];

interface SlapGameProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  setActiveTab?: (tab: 'home' | 'earn' | 'slap' | 'wallet' | 'profile') => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  angle: number;
}

interface SavedCharacterState {
  name: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  maxHp: number;
  hp: number;
  timerSeconds: number;
  folderPath: string;
  defeatCoins: number;
  defeatXp: number;
  lastSavedTimestamp: number;
  baseReward: number;
  criticalReward: number;
}

function spawnNewCharacter(): SavedCharacterState {
  const roll = Math.random() * 100;
  let rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  let timerSeconds = 180;
  let maxHp = 50;
  let defeatCoins = 50;
  let defeatXp = 30;
  let baseReward = 2;
  let criticalReward = 8;
  let name = 'Momo Peach';
  let folderPath = 'momo';

  if (roll < 70) {
    rarity = 'COMMON';
    timerSeconds = 180; // 3:00
    maxHp = 50;
    defeatCoins = 50;
    defeatXp = 30;
    baseReward = 2;
    criticalReward = 8;
    name = 'Momo Peach';
    folderPath = 'momo';
  } else if (roll < 90) { // 70 + 20 = 90
    rarity = 'UNCOMMON';
    timerSeconds = 150; // 2:30
    maxHp = 80;
    defeatCoins = 90;
    defeatXp = 50;
    baseReward = 3;
    criticalReward = 12;
    name = 'Puni Slime';
    folderPath = 'puni';
  } else if (roll < 97) { // 90 + 7 = 97
    rarity = 'RARE';
    timerSeconds = 120; // 2:00
    maxHp = 120;
    defeatCoins = 150;
    defeatXp = 80;
    baseReward = 5;
    criticalReward = 20;
    name = 'Bobo Tea';
    folderPath = 'bobo';
  } else if (roll < 99.5) { // 97 + 2.5 = 99.5
    rarity = 'EPIC';
    timerSeconds = 90; // 1:30
    maxHp = 200;
    defeatCoins = 280;
    defeatXp = 150;
    baseReward = 8;
    criticalReward = 30;
    name = 'Wooly Alpaca';
    folderPath = 'wooly';
  } else {
    rarity = 'LEGENDARY';
    timerSeconds = 60; // 1:00
    maxHp = 350;
    defeatCoins = 600;
    defeatXp = 300;
    baseReward = 15;
    criticalReward = 50;
    name = 'Aero Star';
    folderPath = 'aero';
  }

  return {
    name,
    rarity,
    maxHp,
    hp: maxHp,
    timerSeconds,
    folderPath,
    defeatCoins,
    defeatXp,
    lastSavedTimestamp: Date.now(),
    baseReward,
    criticalReward
  };
}

const SHOWCASE_CHARACTERS = [
  {
    name: 'Momo Peach',
    rarity: 'COMMON',
    rarityColor: 'text-[#94a3b8]',
    tagBg: 'bg-[#1e293b]',
    borderColor: 'border-slate-600',
    shadowColor: 'shadow-[0_0_20px_rgba(148,163,184,0.15)]',
    bgGradient: 'from-[#1e293b] to-[#0f172a]',
    hp: 50,
    reward: 2,
    critical: 8,
    chance: '70%',
    patSuccess: '15%',
    image: 'momo'
  },
  {
    name: 'Puni Slime',
    rarity: 'UNCOMMON',
    rarityColor: 'text-[#10b981]',
    tagBg: 'bg-[#064e3b]',
    borderColor: 'border-emerald-500',
    shadowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    bgGradient: 'from-[#064e3b] to-[#022c22]',
    hp: 80,
    reward: 3,
    critical: 12,
    chance: '20%',
    patSuccess: '10%',
    image: 'puni'
  },
  {
    name: 'Bobo Tea',
    rarity: 'RARE',
    rarityColor: 'text-[#3b82f6]',
    tagBg: 'bg-[#1e3a8a]',
    borderColor: 'border-blue-500',
    shadowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.25)]',
    bgGradient: 'from-[#1e3a8a] to-[#172554]',
    hp: 120,
    reward: 5,
    critical: 20,
    chance: '7%',
    patSuccess: '7%',
    image: 'bobo'
  },
  {
    name: 'Wooly Alpaca',
    rarity: 'EPIC',
    rarityColor: 'text-[#a855f7]',
    tagBg: 'bg-[#581c87]',
    borderColor: 'border-purple-500',
    shadowColor: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]',
    bgGradient: 'from-[#581c87] to-[#3b0764]',
    hp: 200,
    reward: 8,
    critical: 30,
    chance: '2.5%',
    patSuccess: '4%',
    image: 'wooly'
  },
  {
    name: 'Aero Star',
    rarity: 'LEGENDARY',
    rarityColor: 'text-[#f59e0b]',
    tagBg: 'bg-[#78350f]',
    borderColor: 'border-amber-500',
    shadowColor: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    bgGradient: 'from-[#78350f] to-[#451a03]',
    hp: 350,
    reward: 15,
    critical: 50,
    chance: '0.5%',
    patSuccess: '2%',
    image: 'aero'
  }
];

export default function SlapGame({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification, setActiveTab }: SlapGameProps) {
  const activeHand = HAND_UPGRADES.find(h => h.id === (stats.selectedHand || 'wooden')) || HAND_UPGRADES[0];
  
  // Base miss chance by hand
  let handMissChance = 0.15;
  if (activeHand.id === 'wooden') handMissChance = 0.15;
  else if (activeHand.id === 'stone') handMissChance = 0.12;
  else if (activeHand.id === 'gold') handMissChance = 0.06;
  else if (activeHand.id === 'diamond') handMissChance = 0.03;
  else if (activeHand.id === 'legendary') handMissChance = 0.01;

  const slapEnergy = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
  const [subTab, setSubTab] = useState<'slap' | 'fruit'>('slap');
  const [isSlapAnimating, setIsSlapAnimating] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shakeType, setShakeType] = useState<'none' | 'miss' | 'crit'>('none');
  const [isDefeatedTransition, setIsDefeatedTransition] = useState<boolean>(false);

  // Quick Sponsor Ad states
  const [isWatchingQuickAd, setIsWatchingQuickAd] = useState<boolean>(false);
  const [quickAdCountdown, setQuickAdCountdown] = useState<number>(0);
  const quickAdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cute Character Interaction states
  const [isPetted, setIsPetted] = useState<boolean>(false);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const petTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load / Persist active character state
  const [characterState, setCharacterState] = useState<SavedCharacterState>(() => {
    const saved = localStorage.getItem('slapearn_active_character_state');
    if (saved) {
      try {
        const parsed: SavedCharacterState = JSON.parse(saved);
        const elapsedSeconds = Math.floor((Date.now() - parsed.lastSavedTimestamp) / 1000);
        const updatedTimer = Math.max(0, parsed.timerSeconds - elapsedSeconds);
        
        let baseReward = parsed.baseReward;
        let criticalReward = parsed.criticalReward;
        if (!baseReward || !criticalReward) {
          if (parsed.rarity === 'COMMON') { baseReward = 2; criticalReward = 8; }
          else if (parsed.rarity === 'UNCOMMON') { baseReward = 3; criticalReward = 12; }
          else if (parsed.rarity === 'RARE') { baseReward = 5; criticalReward = 20; }
          else if (parsed.rarity === 'EPIC') { baseReward = 8; criticalReward = 30; }
          else { baseReward = 15; criticalReward = 50; }
        }

        let cleanFolderPath = parsed.folderPath;
        if (!['momo', 'puni', 'bobo', 'wooly', 'aero'].includes(cleanFolderPath)) {
          if (parsed.rarity === 'COMMON') {
            cleanFolderPath = 'momo';
            parsed.name = 'Momo Peach';
          } else if (parsed.rarity === 'UNCOMMON') {
            cleanFolderPath = 'puni';
            parsed.name = 'Puni Slime';
          } else if (parsed.rarity === 'RARE') {
            cleanFolderPath = 'bobo';
            parsed.name = 'Bobo Tea';
          } else if (parsed.rarity === 'EPIC') {
            cleanFolderPath = 'wooly';
            parsed.name = 'Wooly Alpaca';
          } else {
            cleanFolderPath = 'aero';
            parsed.name = 'Aero Star';
          }
        }

        if (updatedTimer > 0 && parsed.hp > 0) {
          return {
            ...parsed,
            folderPath: cleanFolderPath,
            name: parsed.name,
            baseReward,
            criticalReward,
            timerSeconds: updatedTimer,
            lastSavedTimestamp: Date.now()
          };
        }
      } catch (err) {
        console.error('Failed to parse saved character state', err);
      }
    }
    const spawned = spawnNewCharacter();
    localStorage.setItem('slapearn_active_character_state', JSON.stringify(spawned));
    return spawned;
  });

  // Track target state changes
  useEffect(() => {
    localStorage.setItem('slapearn_active_character_state', JSON.stringify(characterState));
  }, [characterState]);

  // Handle active countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCharacterState((prev) => {
        if (prev.timerSeconds <= 1) {
          // Timer reached 0! The character escaped!
          const spawned = spawnNewCharacter();
          
          setTimeout(() => {
            sound.playError();
            addNotification('Character Escaped!', `${prev.name} escaped! A new character has spawned!`, 'info');
          }, 0);

          return spawned;
        }
        
        return {
          ...prev,
          timerSeconds: prev.timerSeconds - 1,
          lastSavedTimestamp: Date.now()
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [addNotification]);

  const nextParticleId = useRef<number>(0);
  const slapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const comboResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAngry = characterState.hp > 0 && characterState.hp < 0.25 * characterState.maxHp;
  const isEnraged = slapEnergy === 0;

  // Calculate total miss probability at component scope
  let rarityMissModifier = 0;
  if (characterState.rarity === 'COMMON') rarityMissModifier = 0;
  else if (characterState.rarity === 'UNCOMMON') rarityMissModifier = 0.02;
  else if (characterState.rarity === 'RARE') rarityMissModifier = 0.05;
  else if (characterState.rarity === 'EPIC') rarityMissModifier = 0.08;
  else if (characterState.rarity === 'LEGENDARY') rarityMissModifier = 0.12;

  let angryMissModifier = isAngry ? 0.15 : 0;
  const totalMissChance = Math.min(0.80, handMissChance + rarityMissModifier + angryMissModifier);

  // Blinking effect when idle & not angry
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;

    const triggerNextBlink = () => {
      // Every 3 - 6 seconds
      const randomDelay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
      blinkTimeout = setTimeout(() => {
        if (!isAngry && characterState.hp > 0) {
          setIsBlinking(true);
          setTimeout(() => {
            setIsBlinking(false);
            triggerNextBlink();
          }, 200); // blink duration is 200ms
        } else {
          triggerNextBlink();
        }
      }, randomDelay);
    };

    triggerNextBlink();

    return () => {
      clearTimeout(blinkTimeout);
    };
  }, [isAngry, characterState.hp]);

  // Determine current image priority:
  // Defeated -> Hit -> Angry (Enraged/Low health) -> Blink -> Idle
  let currentExpression: 'idle' | 'blink' | 'hit' | 'angry' | 'defeated' = 'idle';
  if (characterState.hp <= 0) {
    currentExpression = 'defeated';
  } else if (isSlapAnimating) {
    currentExpression = 'hit';
  } else if (isPetted) {
    currentExpression = 'blink';
  } else if (isAngry) {
    currentExpression = 'angry';
  } else if (isBlinking) {
    currentExpression = 'blink';
  } else {
    currentExpression = 'idle';
  }


  // Dynamic Combo Tracker
  const incrementCombo = () => {
    const currentVal = stats.currentCombo || 0;
    const newVal = currentVal + 1;
    const bestVal = stats.bestCombo || 0;
    const updatedBest = Math.max(bestVal, newVal);

    updateStatsDirectly({
      currentCombo: newVal,
      bestCombo: updatedBest
    });

    if (comboResetTimerRef.current) clearTimeout(comboResetTimerRef.current);
    comboResetTimerRef.current = setTimeout(() => {
      updateStatsDirectly({ currentCombo: 0 });
    }, 1800);

    // Give extra combo milestone rewards
    if (newVal % 10 === 0) {
      setTimeout(() => {
        sound.playSuccess();
        updateCoinsAndXp(25, 12, 'Slap Game', `${newVal}-Slap Streak Bonus!`);
        addNotification('🔥 STREAK BONUS!', `${newVal}-Slap combo! Earned +25 SP and +12 XP!`, 'success');
      }, 80);
    }
  };

  // Main Slap Interaction Trigger
  const handleSlapClick = (e?: MouseEvent) => {
    if (e) e.stopPropagation();

    if (isDefeatedTransition) return;

    // If energy is depleted, run sponsor ad flow
    if (slapEnergy <= 0) {
      handleWatchQuickAd();
      return;
    }

    if (characterState.hp <= 0) {
      return; // Awaiting spawn
    }

    const pId = nextParticleId.current++;

    const rollMiss = Math.random() < totalMissChance;

    // Consume exactly 1 slap energy
    updateStatsDirectly({
      slapsToday: Math.min(stats.maxSlapsPerDay, stats.slapsToday + 1),
      slapsPlayedToday: (stats.slapsPlayedToday || 0) + 1
    });

    if (rollMiss) {
      // 1. MISS BEHAVIOR
      sound.playError();
      updateStatsDirectly({ currentCombo: 0 });
      triggerSpeech('miss');

      // Trigger slight miss shake
      setShakeType('miss');
      setTimeout(() => setShakeType('none'), 300);

      // Spawn floating MISS text
      setParticles((prev) => [
        ...prev,
        {
          id: pId,
          x: 140,
          y: 110,
          text: 'MISS!',
          color: 'text-slate-400 font-extrabold',
          angle: Math.random() * 20 - 10
        }
      ]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== pId));
      }, 800);

      return;
    }

    // 2. HIT BEHAVIOR
    sound.playSlap();
    triggerSpeech('hit');

    // Trigger hit expression for exactly 300ms
    setIsSlapAnimating(true);
    if (slapTimerRef.current) clearTimeout(slapTimerRef.current);
    slapTimerRef.current = setTimeout(() => {
      setIsSlapAnimating(false);
    }, 300);

    // Calculate critical status & damage values
    const isCritical = Math.random() < activeHand.criticalChance;
    const baseDmg = Math.floor(Math.random() * (activeHand.maxDamage - activeHand.minDamage + 1)) + activeHand.minDamage;
    const finalDmg = isCritical ? baseDmg * 2 : baseDmg;

    // Reward calculation based on character's rewards & hand's SP bonus
    const baseRewardCoins = isCritical ? characterState.criticalReward : characterState.baseReward;
    if (isCritical) {
      setShakeType('crit');
      setTimeout(() => setShakeType('none'), 300);
    } else {
      setShakeType('none');
    }

    const finalCoinsAwarded = Math.round(baseRewardCoins * (1 + activeHand.spBonus));
    const xpAwarded = isCritical ? 4 : 2;

    // Apply stats rewards
    updateCoinsAndXp(finalCoinsAwarded, xpAwarded, 'Slap Game', `Target Hit (${activeHand.name})`);
    incrementCombo();

    // Reduce Target HP
    const nextHp = Math.max(0, characterState.hp - finalDmg);
    setCharacterState((prev) => ({
      ...prev,
      hp: nextHp
    }));

    // Floating text above character
    const bubbleText = isCritical ? `CRITICAL +${finalCoinsAwarded} SP` : `+${finalCoinsAwarded} SP`;
    const randColor = isCritical ? 'text-amber-500 font-black' : 'text-emerald-500 font-black';

    setParticles((prev) => [
      ...prev,
      {
        id: pId,
        x: 140,
        y: 110,
        text: bubbleText,
        color: randColor,
        angle: Math.random() * 16 - 8
      }
    ]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 800);

    // Defeat Trigger
    if (nextHp <= 0) {
      sound.playSuccess();
      setIsDefeatedTransition(true);
      setSpeechText(null);

      // Award defeat bonuses
      updateCoinsAndXp(characterState.defeatCoins, characterState.defeatXp, 'Slap Game', `Defeated ${characterState.name}`);

      addNotification(
        '🎯 TARGET DEFEATED!',
        `You KO'D ${characterState.name}! Earned +${characterState.defeatCoins} SP & +${characterState.defeatXp} XP!`,
        'success'
      );

      // Reset active combo & increment charactersDefeatedToday
      updateStatsDirectly({
        currentCombo: 0,
        charactersDefeatedToday: (stats.charactersDefeatedToday || 0) + 1
      });

      // Spawn next character after exactly 1 second (1000ms)
      setTimeout(() => {
        const spawned = spawnNewCharacter();
        setCharacterState(spawned);
        setIsDefeatedTransition(false);
      }, 1000);
    }
  };

  // Watch Sponsor Ad: restores exactly 1 slap
  const handleWatchQuickAd = () => {
    if (isWatchingQuickAd) return;
    
    sound.playSlap();
    setIsWatchingQuickAd(true);
    setQuickAdCountdown(4);

    let secLeft = 4;
    if (quickAdIntervalRef.current) clearInterval(quickAdIntervalRef.current);
    quickAdIntervalRef.current = setInterval(() => {
      secLeft -= 1;
      setQuickAdCountdown(secLeft);
      
      if (secLeft <= 0) {
        if (quickAdIntervalRef.current) clearInterval(quickAdIntervalRef.current);
        setIsWatchingQuickAd(false);
        sound.playSuccess();

        // Restore exactly 1 slap
        updateStatsDirectly({
          slapsToday: Math.max(0, stats.slapsToday - 1)
        });
        addNotification('Ad Watched!', 'Successfully earned +1 Slap energy!', 'success');
      }
    }, 1000);
  };

  const triggerSpeech = (type: 'hit' | 'miss' | 'pat') => {
    const name = characterState.name;
    let pool: string[] = [];
    if (type === 'pat') {
      if (name.includes('Neko') || name.includes('Fox') || name.includes('Dragon')) {
        if (name.includes('Neko')) {
          pool = ["Mew!~ Nya!", "Yay, pats! 🐾", "Aww, you're sweet!", "Happy tail wagging!"];
        } else if (name.includes('Fox')) {
          pool = ["Hmph, acceptable.", "A warrior appreciates care.", "Fluffy tail wag~", "I like this.", "Not bad at all."];
        } else {
          pool = ["You dare pet a deity? ...Do it again.", "A royal treatment.", "Purr...", "Behold my majesty! ✨", "Even dragons like pats."];
        }
      } else {
        // Chibi
        if (name.includes('Slime')) {
          pool = ["*squish pop*", "Puru puru~ Warm!", "Bouncy smiles!", "I feel bubbly! ✨"];
        } else {
          // Demon
          pool = ["I-it's not like I like this!", "My dark heart melts...", "B-Baka!", "Don't stop!", "Hmph, whatever..."];
        }
      }
    } else if (type === 'hit') {
      if (name.includes('Neko') || name.includes('Fox') || name.includes('Dragon')) {
        if (name.includes('Neko')) {
          pool = ["Ouch! Why?!", "Hey! No slaps! 😿", "Baka!", "That hurts!", "Mean!"];
        } else if (name.includes('Fox')) {
          pool = ["A swift blow!", "My blade shall strike back!", "Is that all you got?", "Target locked! 🦊", "Hmph!"];
        } else {
          pool = ["A mere scratch!", "Feel the dragon's wrath!", "Impudent!", "I shall burn your hand! 🔥", "Argh!"];
        }
      } else {
        // Chibi
        if (name.includes('Slime')) {
          pool = ["*sad squish*", "Puyu! 🥺", "Don't pop me!", "*sad bounce*"];
        } else {
          // Demon
          pool = ["Urgh! Foolish mortal!", "You will regret this!", "Ow! Stop that!", "H-how dare you!", "Impudent!"];
        }
      }
    } else {
      // Miss / Dodge
      if (name.includes('Neko') || name.includes('Fox') || name.includes('Dragon')) {
        if (name.includes('Neko')) {
          pool = ["Too slow! 😜", "Missed me!", "Nya nyan~", "Can't catch me!", "Hehe!"];
        } else if (name.includes('Fox')) {
          pool = ["Speed is key.", "Focus your mind.", "Predictable.", "Too slow, warrior.", "Missed."];
        } else {
          pool = ["You cannot touch a deity.", "Slow.", "A swing and a miss.", "Futile effort.", "Tremble before my speed!"];
        }
      } else {
        // Chibi
        if (name.includes('Slime')) {
          pool = ["*jiggle escape*", "Whoosh!", "Missed!", "Bouncy dodge!"];
        } else {
          // Demon
          pool = ["Ahaha, pathetic!", "Pathetic aim!", "Behind you!", "Too weak!", "Nowhere close!"];
        }
      }
    }

    if (pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      setSpeechText(pool[idx]);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        setSpeechText(null);
      }, 2500);
    }
  };

  const handlePatClick = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDefeatedTransition) return;
    if (characterState.hp <= 0) return;

    sound.playCoin();

    // Trigger pat animation state
    setIsPetted(true);
    if (petTimerRef.current) clearTimeout(petTimerRef.current);
    petTimerRef.current = setTimeout(() => {
      setIsPetted(false);
    }, 1200);

    // Trigger Speech
    triggerSpeech('pat');

    // Spawn 2-3 pink hearts / sparkle particles
    const heartColors = [
      'text-rose-500 text-3xl font-bold',
      'text-pink-500 text-2xl font-bold',
      'text-rose-400 text-xl font-bold',
      'text-amber-400 text-2xl font-bold'
    ];
    const heartSymbols = ['💖', '❤️', '✨', '💕', '🥰'];

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const pId = nextParticleId.current++;
        const randX = 80 + Math.random() * 120;
        const randColor = heartColors[Math.floor(Math.random() * heartColors.length)];
        const randSym = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
        
        setParticles((prev) => [
          ...prev,
          {
            id: pId,
            x: randX,
            y: 160 + Math.random() * 40,
            text: randSym,
            color: randColor,
            angle: Math.random() * 40 - 20
          }
        ]);

        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== pId));
        }, 850);
      }, i * 150);
    }

    // Dynamic pat success chance based on rarity: Common: 15%, Uncommon: 10%, Rare: 7%, Epic: 4%, Legendary: 2%
    let patSuccessChance = 0.15;
    if (characterState.rarity === 'UNCOMMON') patSuccessChance = 0.10;
    else if (characterState.rarity === 'RARE') patSuccessChance = 0.07;
    else if (characterState.rarity === 'EPIC') patSuccessChance = 0.04;
    else if (characterState.rarity === 'LEGENDARY') patSuccessChance = 0.02;

    if (Math.random() < patSuccessChance) {
      updateCoinsAndXp(1, 1, 'Slap Game', 'Headpat Love Bonus');
      addNotification('💖 PAT BONUS!', `Your happy companion gifted you +1 SP and +1 XP!`, 'success');
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (slapTimerRef.current) clearTimeout(slapTimerRef.current);
      if (comboResetTimerRef.current) clearTimeout(comboResetTimerRef.current);
      if (quickAdIntervalRef.current) clearInterval(quickAdIntervalRef.current);
      if (petTimerRef.current) clearTimeout(petTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  // Format countdown text helper
  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Energy fill percentage
  const energyPercent = (slapEnergy / stats.maxSlapsPerDay) * 100;

  // HP Bar Percentage and dynamic state styling
  const hpPercent = (characterState.hp / characterState.maxHp) * 100;
  let hpBarColor = 'bg-emerald-500'; // Green: 100–50%
  if (hpPercent < 25) {
    hpBarColor = 'bg-rose-500'; // Red: 24–0%
  } else if (hpPercent < 50) {
    hpBarColor = 'bg-amber-500'; // Orange: 49–25%
  }

  // Framer Motion Animation configs based on current state
  let animateProps = {};
  if (shakeType === 'miss') {
    animateProps = {
      x: [-6, 6, -6, 6, -3, 3, 0],
      transition: { duration: 0.3 }
    };
  } else if (shakeType === 'crit') {
    animateProps = {
      x: [-12, 12, -12, 12, -6, 6, 0],
      y: [-6, 6, -6, 6, -3, 3, 0],
      scale: [1, 1.15, 0.95, 1.05, 1],
      transition: { duration: 0.3 }
    };
  } else if (isSlapAnimating) {
    animateProps = {
      scale: 1.12,
      rotate: -4
    };
  } else if (isPetted) {
    animateProps = {
      y: [0, -15, 0], // a cute happy vertical bounce/hop!
      scaleX: [1, 1.08, 0.92, 1],
      scaleY: [1, 0.92, 1.08, 1],
      transition: { duration: 0.4, ease: 'easeOut' }
    };
  } else if (characterState.hp <= 0) {
    animateProps = {
      scale: 0.85,
      y: 32,
      rotate: 12,
      opacity: 0.8
    };
  } else if (isAngry) {
    animateProps = {
      x: [0, -1, 1, -1, 1, 0],
      y: [0, -6, 0],
      scaleY: [1, 1.04, 1],
      scaleX: [1, 0.96, 1],
      transition: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' }
    };
  } else {
    // Normal cute idle float & breathe (completely non-static!)
    animateProps = {
      y: [0, -10, 0],
      scaleY: [1, 1.03, 1],
      scaleX: [1, 0.97, 1],
      transition: { 
        repeat: Infinity, 
        duration: 2.8, 
        ease: "easeInOut" 
      }
    };
  }

  return (
    <div className={`flex flex-col text-slate-900 select-none pb-4 ${subTab === 'fruit' ? 'gap-1.5 -mt-1 sm:-mt-2' : 'gap-4'}`} id="slap-tab-layout">
      
      {/* Dynamic Sub-tab Segment Selectors */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border-3 border-slate-950 shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] z-10" id="slap-sub-tabs">
        <button
          onClick={() => { sound.playSlap(); setSubTab('slap'); }}
          className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'slap'
              ? 'bg-[#FF3B77] text-white border-2 border-slate-950 shadow-[1.5px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>👋</span> Slap Boss
        </button>
        <button
          onClick={() => { sound.playSlap(); setSubTab('fruit'); }}
          className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'fruit'
              ? 'bg-[#FFD043] text-slate-950 border-2 border-slate-950 shadow-[1.5px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🍓</span> Fruit Match
        </button>
      </div>

      {subTab === 'fruit' ? (
        <FruitMatch
          stats={stats}
          updateCoinsAndXp={updateCoinsAndXp}
          updateStatsDirectly={updateStatsDirectly}
          addNotification={addNotification}
          onClose={() => setSubTab('slap')}
        />
      ) : (
        <>
          {/* 1. Primary Interactive Slap Game Battle Card */}
          <div 
            onClick={() => handleSlapClick()}
            className="bg-white border-4 border-slate-950 rounded-[32px] p-5 relative flex flex-col justify-between min-h-[480px] shadow-[4px_4.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer overflow-hidden transition-all"
            id="character-slap-card"
          >
        {/* Soft elegant background dot texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* TOP HUD: Name, Rarity, Timer, and HP Progress Bar inside the Card */}
        <div className="w-full flex flex-col gap-1.5 border-b-2 border-slate-950 pb-3 z-10" id="card-hud-header">
          <div className="flex justify-between items-center">
            <span className="text-lg font-black text-slate-950 uppercase tracking-tight">
              {characterState.name}
            </span>
            <div className="flex items-center gap-1 bg-slate-100 border-2 border-slate-950 px-2 py-0.5 rounded-md font-mono text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
              ⏱ {formatTimer(characterState.timerSeconds)}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-black uppercase border px-2 py-0.5 rounded ${
              characterState.rarity === 'COMMON' ? 'text-slate-500 bg-slate-100 border-slate-300' :
              characterState.rarity === 'UNCOMMON' ? 'text-emerald-600 bg-emerald-50 border-emerald-300' :
              characterState.rarity === 'RARE' ? 'text-blue-600 bg-blue-50 border-blue-300' :
              characterState.rarity === 'EPIC' ? 'text-purple-600 bg-purple-50 border-purple-300' :
              'text-amber-600 bg-amber-50 border-amber-300 animate-pulse'
            }`}>
              {characterState.rarity}
            </span>
            {isAngry && (
              <span className="text-[9px] font-black uppercase text-white bg-rose-500 border border-slate-950 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                <Shield className="w-2.5 h-2.5 fill-white stroke-none" /> ANGRY (+dodging)
              </span>
            )}
          </div>

          {/* ❤️ HP Bar */}
          <div className="mt-2.5 flex flex-col gap-1">
            <div className="flex justify-between items-center font-mono text-[11px] font-black text-slate-950">
              <span className="flex items-center gap-0.5">❤️ HP</span>
              <span>{characterState.hp} / {characterState.maxHp}</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border-2 border-slate-950 shadow-[1px_1.5px_0px_0px_rgba(15,23,42,1)]">
              <motion.div
                className={`h-full rounded-full border-r border-slate-950 ${hpBarColor}`}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Canvas Particles Layer */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 0.8, y: 220, x: p.x, rotate: p.angle }}
                animate={{ opacity: 0, scale: 1.3, y: 80, rotate: p.angle + (Math.random() * 10 - 5) }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  textShadow: '2.5px 2.5px 0px #000, -1.5px -1.5px 0px #000, 1.5px -1.5px 0px #000, -1.5px 1.5px 0px #000, 1.5px 1.5px 0px #000'
                }}
                className={`absolute left-[15%] right-[15%] text-center font-sans font-black text-lg sm:text-xl uppercase select-none tracking-tighter ${p.color}`}
              >
                {p.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* CENTER: Centered Game Character Container without white borders */}
        <div className="h-64 w-full flex items-center justify-center relative select-none" id="character-sprite-container">
          
          {/* Cute Speech Bubble */}
          <AnimatePresence>
            {speechText && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="absolute top-1 bg-slate-950 text-white border-2 border-white font-sans font-black text-xs px-3.5 py-2 rounded-2xl shadow-[2px_2.5px_0px_0px_rgba(0,0,0,1)] z-40 max-w-[220px] text-center"
              >
                {speechText}
                {/* Arrow pointing down */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-white rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flame/Glow aura under angry character */}
          {isAngry && (
            <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-2xl animate-pulse pointer-events-none scale-110" />
          )}

          {/* Transparent character image centered and filling 65% height of container */}
          <motion.div
            animate={animateProps}
            className={`h-48 w-48 flex items-center justify-center pointer-events-none select-none transition-all duration-75 ${
              isAngry ? 'drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : ''
            } ${
              currentExpression === 'defeated' ? 'grayscale brightness-75 scale-90 rotate-12 opacity-80' :
              currentExpression === 'hit' ? 'brightness-125 saturate-150 scale-105' : ''
            }`}
          >
            <CharacterVisual id={characterState.folderPath} expression={currentExpression} />
          </motion.div>
        </div>

        {/* BOTTOM: Large Clickable Interactive Slap Button */}
        <div className="w-full z-10 mt-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleSlapClick()}
              disabled={isDefeatedTransition}
              className={`flex-1 py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase border-3 border-slate-950 tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[3px_3.5px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_2px_0px_0px_rgba(15,23,42,1)] ${
                isDefeatedTransition
                  ? 'bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed'
                  : slapEnergy > 0
                    ? 'bg-[#FFD043] hover:bg-yellow-400 text-slate-950'
                    : 'bg-[#FF3B77] hover:bg-[#E33D6F] text-white animate-pulse'
              }`}
            >
              {isDefeatedTransition ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                  KO'd!
                </span>
              ) : slapEnergy > 0 ? (
                <span>👋 SLAP</span>
              ) : (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  🎥 ad (+1)
                </span>
              )}
            </button>

            <button
              onClick={() => handlePatClick()}
              disabled={isDefeatedTransition || characterState.hp <= 0}
              className={`flex-1 py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase border-3 border-slate-950 tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[3px_3.5px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_2px_0px_0px_rgba(15,23,42,1)] ${
                isDefeatedTransition || characterState.hp <= 0
                  ? 'bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-[#FF8DA1] hover:bg-[#FF738D] text-slate-950'
              }`}
            >
              <Heart className="w-4 h-4 fill-slate-950 stroke-none animate-bounce" />
              <span>PAT</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Combined Active Hand Status & Energy Progress Ribbon (Moved below character card) */}
      <div 
        className="border-3 border-slate-900 rounded-full h-11 flex items-center relative overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]" 
        id="active-hand-energy-ribbon"
      >
        {/* Soft progress bar fill inside the ribbon */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-[#FFEAF0] transition-all duration-300 z-0 border-r-2 border-slate-900/10" 
          style={{ width: `${energyPercent}%` }}
        />
        
        {/* Banner content layered cleanly on top */}
        <div className="absolute inset-0 flex items-center justify-between px-4 z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-sm">🥊</span>
            <span className="text-xs font-black uppercase text-slate-950 tracking-tight">
              {activeHand.name} • 1x dmg • {Math.round(totalMissChance * 100)}% miss
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Helper/Caption Below Character Card (Only appears when out of slaps) */}
      {slapEnergy <= 0 && (
        <div className="text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest leading-normal px-2">
          Each tap costs 1 slap. Watch ads or spin the wheel to get more slaps.
        </div>
      )}

      {/* 4. Slap Daily Energy Balance Panel Widget */}
      <div className="bg-white border-4 border-slate-950 rounded-[24px] p-4 shadow-[4px_4.5px_0px_0px_rgba(15,23,42,1)]" id="energy-gauge-widget">
        <div className="flex justify-between items-center text-xs font-black text-slate-950 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 stroke-none animate-pulse" />
            <span>SLAP ENERGY BALANCE</span>
          </div>
          <span className="font-mono text-[11px]">{slapEnergy} / {stats.maxSlapsPerDay} Slaps</span>
        </div>
        
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border-3 border-slate-950">
          <motion.div
            className="bg-[#00D09E] h-full rounded-full border-r-2 border-slate-950"
            animate={{ width: `${(slapEnergy / stats.maxSlapsPerDay) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      {/* 5. Integrated Characters Showcase & Guide (Rendered naturally below, matching uploaded image layout, made smaller/compact to allow space) */}
      <div className="bg-[#090D1C] border-3 border-slate-950 rounded-[24px] p-3.5 relative flex flex-col gap-3 shadow-[3px_3.5px_0px_0px_rgba(15,23,42,1)] overflow-hidden transition-all text-white" id="characters-showcase-panel">
        {/* Cosmic background star/glow effects */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Heading */}
        <div className="text-center py-1 select-none z-10" id="showcase-header">
          <h2 className="text-sm font-black text-white tracking-tight flex items-center justify-center gap-1 uppercase">
            <span className="text-yellow-400 animate-pulse text-xs">✦</span>
            <span className="bg-gradient-to-r from-white via-pink-400 to-amber-300 bg-clip-text text-transparent">SLAPEARN CHARACTERS</span>
            <span className="text-yellow-400 animate-pulse text-xs">✦</span>
          </h2>
          <p className="text-slate-400 text-[8.5px] font-bold uppercase tracking-wider mt-0.5">
            5 Characters • 5 Rarities • 5x More Fun
          </p>
        </div>

        {/* Horizontal scrollable characters list with snaps */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 px-0.5 scrollbar-thin scrollbar-thumb-slate-800 snap-x snap-mandatory z-10" id="showcase-cards-list">
          {SHOWCASE_CHARACTERS.map((char) => (
            <div
              key={char.name}
              className={`flex-none w-[155px] snap-center rounded-[16px] border-2 ${char.borderColor} bg-gradient-to-b ${char.bgGradient} p-2.5 flex flex-col justify-between ${char.shadowColor} select-none relative overflow-hidden`}
            >
              {/* Sparkle background overlay for high rarities */}
              {['EPIC', 'LEGENDARY'].includes(char.rarity) && (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none animate-pulse" />
              )}

              {/* Header: Rarity and Name */}
              <div className="text-center flex flex-col gap-1 border-b border-white/10 pb-1.5">
                <span className={`mx-auto text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${char.tagBg} ${char.rarityColor} border border-white/5`}>
                  {char.rarity}
                </span>
                <h3 className="text-xs font-black text-white tracking-tight leading-none uppercase">
                  {char.name}
                </h3>
              </div>

              {/* Body image container with circular background glow */}
              <div className="h-24 my-2 flex items-center justify-center relative">
                <div className="absolute w-16 h-16 bg-white/5 rounded-full blur-xl pointer-events-none" />
                <div className="h-20 w-20 flex items-center justify-center transform hover:scale-110 transition-transform duration-200">
                  <CharacterVisual id={char.image} expression="idle" />
                </div>
              </div>

              {/* Stats list */}
              <div className="flex flex-col gap-1 border-t border-white/10 pt-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                  <span className="flex items-center gap-0.5">❤️ HP</span>
                  <span className="font-mono text-white font-extrabold">{char.hp}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                  <span className="flex items-center gap-0.5">🪙 Hit</span>
                  <span className="font-mono text-emerald-400 font-extrabold">+{char.reward} SP</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                  <span className="flex items-center gap-0.5">💥 Crit</span>
                  <span className="font-mono text-amber-400 font-extrabold">+{char.critical} SP</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                  <span className="flex items-center gap-0.5">👋 Pat Win</span>
                  <span className="font-mono text-pink-400 font-extrabold">{char.patSuccess}</span>
                </div>
              </div>

              {/* Spawn chance box */}
              <div className="mt-2 border border-white/10 bg-white/5 rounded-lg p-1.5 text-center flex flex-col gap-0.5 shadow-inner">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Spawn chance</span>
                <span className={`text-[11px] font-black tracking-tight ${char.rarityColor}`}>{char.chance}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Legends and Info footer cards */}
        <div className="flex flex-col gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5 z-10" id="showcase-legends">
          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-none text-[10px]">
              ❤️
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wide">Higher HP = More SP</span>
              <p className="text-[9px] text-slate-400 font-bold leading-tight mt-0.5">
                The more HP the character has, the more you earn per hit!
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 items-start border-t border-white/5 pt-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-none text-[10px]">
              💥
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wide">Critical Hits</span>
              <p className="text-[9px] text-slate-400 font-bold leading-tight mt-0.5">
                Random chance to deal massive damage and earn more SP!
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Sponsor Quick Commercial Overlay */}
      {isWatchingQuickAd && (
        <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFEED1] border-4 border-slate-950 rounded-[32px] p-6 text-center max-w-[320px] w-full shadow-[5px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden animate-pulse">
            <div className="w-12 h-12 rounded-full bg-white border-3 border-slate-950 flex items-center justify-center text-rose-500 mb-3 mx-auto shadow-[2.5px_3px_0px_0px_rgba(0,0,0,1)]">
              📺
            </div>
            <h4 className="text-base font-black text-slate-950 tracking-tight">Sponsor Commercial</h4>
            <p className="text-slate-600 text-[11px] font-bold mt-1">
              Restoring slaps energy balance in...
            </p>
            
            <div className="mt-4 w-16 h-16 rounded-full bg-white border-4 border-slate-950 flex items-center justify-center text-slate-950 font-black text-2xl shadow-[3px_3.5px_0px_0px_rgba(0,0,0,1)] mx-auto">
              {quickAdCountdown}
            </div>

            <span className="text-[10px] font-black text-[#FF3B77] uppercase tracking-widest mt-4 block">
              Sponsor: Chibi-Cola Company
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
