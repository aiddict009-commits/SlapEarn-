import { useState, useEffect, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Award, Volume2, VolumeX, Star, ArrowLeft, Clock } from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction, EconomyConfig } from '../types';

interface SlapAMoleProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  onClose?: () => void;
  economyConfig?: EconomyConfig;
}

type MoleType = 'standard' | 'golden' | 'boss' | 'bunny' | 'bomb';

interface HoleState {
  id: number;
  mole: {
    type: MoleType;
    hp: number; // 1 for standard/golden/bunny/bomb, 2 for boss
    maxHp: number;
    spawnTime: number;
    duration: number; // ms to stay up
  } | null;
  hitState: 'none' | 'hit' | 'escaped' | 'whacked';
}

interface FloatingText {
  id: string;
  text: string;
  holeId: number;
  color: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  emoji: string;
  vx: number;
  vy: number;
  size: number;
}

const SLAP_COST = 5;
const HOLE_COUNT = 9; // 3x3 grid

// Custom SVG Mole Characters
function StandardMoleVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body / Head */}
      <path d="M20 85 C20 40, 30 20, 50 20 C70 20, 80 40, 80 85 Z" fill="#8B5A2B" stroke="#0F172A" strokeWidth="4" />
      {/* Belly */}
      <path d="M32 85 C32 60, 40 50, 50 50 C60 50, 68 60, 68 85 Z" fill="#D2B48C" stroke="#0F172A" strokeWidth="3" />
      {/* Eyes */}
      <circle cx="38" cy="42" r="5" fill="#0F172A" />
      <circle cx="39" cy="40" r="2" fill="#FFFFFF" />
      <circle cx="62" cy="42" r="5" fill="#0F172A" />
      <circle cx="63" cy="40" r="2" fill="#FFFFFF" />
      {/* Snout */}
      <ellipse cx="50" cy="52" rx="12" ry="8" fill="#FFB6C1" stroke="#0F172A" strokeWidth="3" />
      {/* Nose */}
      <ellipse cx="50" cy="49" rx="5" ry="3" fill="#FF1493" />
      {/* Buck Teeth */}
      <rect x="46" y="58" width="3" height="5" rx="1" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      <rect x="51" y="58" width="3" height="5" rx="1" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      {/* Little Paws */}
      <path d="M22 68 C15 68, 15 78, 25 76" fill="#D2B48C" stroke="#0F172A" strokeWidth="3" />
      <path d="M78 68 C85 68, 85 78, 75 76" fill="#D2B48C" stroke="#0F172A" strokeWidth="3" />
    </svg>
  );
}

function GoldenMoleVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Golden Aura Glow */}
      <circle cx="50" cy="50" r="42" fill="#FFD700" opacity="0.3" />
      {/* Body / Head */}
      <path d="M20 85 C20 40, 30 20, 50 20 C70 20, 80 40, 80 85 Z" fill="#FFC72C" stroke="#0F172A" strokeWidth="4" />
      {/* Belly */}
      <path d="M32 85 C32 60, 40 50, 50 50 C60 50, 68 60, 68 85 Z" fill="#FFF2B2" stroke="#0F172A" strokeWidth="3" />
      {/* Cool Sunglasses */}
      <polygon points="30,38 48,38 45,48 33,48" fill="#0F172A" />
      <polygon points="52,38 70,38 67,48 55,48" fill="#0F172A" />
      <line x1="48" y1="41" x2="52" y2="41" stroke="#0F172A" strokeWidth="3" />
      <line x1="33" y1="41" x2="43" y2="41" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="55" y1="41" x2="65" y2="41" stroke="#FFFFFF" strokeWidth="1.5" />
      {/* Snout */}
      <ellipse cx="50" cy="54" rx="11" ry="7" fill="#FFE4E1" stroke="#0F172A" strokeWidth="3" />
      <ellipse cx="50" cy="51" rx="4" ry="2.5" fill="#FF69B4" />
      {/* Crown */}
      <path d="M50 12 L53 20 L61 20 L55 25 L57 32 L50 27 L43 32 L45 25 L39 20 L47 20 Z" fill="#FFD043" stroke="#0F172A" strokeWidth="2" />
    </svg>
  );
}

function BossMoleVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body / Head - Dark purple/brown robust mole */}
      <path d="M18 85 C18 35, 28 15, 50 15 C72 15, 82 35, 82 85 Z" fill="#4A2E2B" stroke="#0F172A" strokeWidth="4" />
      {/* Helmet */}
      <path d="M22 30 C22 14, 78 14, 78 30 Z" fill="#FF3B77" stroke="#0F172A" strokeWidth="3.5" />
      <rect x="18" y="28" width="64" height="6" rx="2" fill="#E11D48" stroke="#0F172A" strokeWidth="2" />
      {/* Spikes on helmet */}
      <path d="M25 20 L20 8 L32 18 Z" fill="#FFD043" stroke="#0F172A" strokeWidth="2" />
      <path d="M75 20 L80 8 L68 18 Z" fill="#FFD043" stroke="#0F172A" strokeWidth="2" />
      {/* Angry Eyebrows */}
      <path d="M30 38 L45 44" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 38 L55 44" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="38" cy="46" r="4" fill="#FFD043" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="62" cy="46" r="4" fill="#FFD043" stroke="#0F172A" strokeWidth="1.5" />
      {/* Snout */}
      <ellipse cx="50" cy="58" rx="13" ry="8" fill="#C4A484" stroke="#0F172A" strokeWidth="3" />
      <ellipse cx="50" cy="55" rx="5" ry="3" fill="#8B0000" />
      {/* Tusks */}
      <polygon points="43,64 47,64 45,71" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      <polygon points="53,64 57,64 55,71" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
    </svg>
  );
}

function BunnyVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <ellipse cx="38" cy="22" rx="7" ry="20" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3.5" />
      <ellipse cx="38" cy="22" rx="3.5" ry="14" fill="#FFB6C1" />
      <ellipse cx="62" cy="22" rx="7" ry="20" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3.5" />
      <ellipse cx="62" cy="22" rx="3.5" ry="14" fill="#FFB6C1" />
      {/* Head */}
      <circle cx="50" cy="60" r="28" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />
      {/* Cheeks */}
      <circle cx="34" cy="64" r="5" fill="#FFB6C1" opacity="0.6" />
      <circle cx="66" cy="64" r="5" fill="#FFB6C1" opacity="0.6" />
      {/* Eyes */}
      <circle cx="41" cy="54" r="4" fill="#0F172A" />
      <circle cx="42" cy="52" r="1.5" fill="#FFFFFF" />
      <circle cx="59" cy="54" r="4" fill="#0F172A" />
      <circle cx="60" cy="52" r="1.5" fill="#FFFFFF" />
      {/* Nose & Mouth */}
      <polygon points="48,60 52,60 50,63" fill="#FF69B4" stroke="#0F172A" strokeWidth="1" />
      <path d="M46 66 C48 69, 50 68, 50 66 C50 68, 52 69, 54 66" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BombMoleVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fuse Spark */}
      <path d="M50 20 Q58 10 65 14" stroke="#0F172A" strokeWidth="3" fill="none" />
      <circle cx="66" cy="13" r="5" fill="#FFD043" />
      <circle cx="66" cy="13" r="3" fill="#FF3B77" />
      {/* Bomb Head */}
      <circle cx="50" cy="58" r="28" fill="#2D3748" stroke="#0F172A" strokeWidth="4" />
      <rect x="44" y="24" width="12" height="8" rx="2" fill="#4A5568" stroke="#0F172A" strokeWidth="2" />
      {/* Mischievous Eyes */}
      <path d="M35 50 L45 54" stroke="#FF3B77" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M65 50 L55 54" stroke="#FF3B77" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="40" cy="58" r="3" fill="#FFD043" />
      <circle cx="60" cy="58" r="3" fill="#FFD043" />
      {/* Mouth */}
      <path d="M42 68 Q50 74 58 68" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Audio Synthesizer for Mole Sounds
class MoleSoundFX {
  private static playSynth(freqs: number[], type: OscillatorType = 'sine', duration = 0.12) {
    if (sound.getMuteStatus()) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + duration + 0.05);
      });
    } catch (_) {}
  }

  static playWhack() {
    this.playSynth([450, 600, 800], 'triangle', 0.1);
  }

  static playGoldWhack() {
    this.playSynth([600, 800, 1000, 1200], 'sine', 0.18);
  }

  static playBossWhack() {
    this.playSynth([300, 450, 250], 'sawtooth', 0.15);
  }

  static playOuchBunny() {
    this.playSynth([200, 150, 100], 'sawtooth', 0.2);
  }

  static playVictory() {
    this.playSynth([523.25, 659.25, 783.99, 1046.5], 'triangle', 0.4);
  }
}

export default function SlapAMole({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification, onClose, economyConfig }: SlapAMoleProps) {
  const SLAP_COST = economyConfig?.gameEntrySlapsCost ?? 5;
  const slapEnergy = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);

  // Game core state
  const GAME_DURATION = 30; // Strictly 30 seconds game round
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION);
  const [score, setScore] = useState<number>(0);
  const [totalSlaps, setTotalSlaps] = useState<number>(0);
  const [successfulHits, setSuccessfulHits] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState<boolean>(sound.getMuteStatus());

  // Holes array (0 to 8)
  const [holes, setHoles] = useState<HoleState[]>(
    Array.from({ length: HOLE_COUNT }, (_, i) => ({ id: i, mole: null, hitState: 'none' }))
  );

  // FX state
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Timers refs
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Mute
  const toggleMute = () => {
    const nextMute = sound.toggleMute();
    setSoundMuted(nextMute);
  };

  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState]);

  // Particle animation
  useEffect(() => {
    if (particles.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
          }))
          .filter((p) => p.y < 350 && p.x > -50 && p.x < 350)
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [particles]);

  // Spawning Moles loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      return;
    }

    const spawnInterval = Math.max(350, 700 - Math.floor(score / 5) * 20);

    spawnTimerRef.current = setInterval(() => {
      spawnMole();
    }, spawnInterval);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, score]);

  // Spawn a random mole into an empty hole
  const spawnMole = () => {
    setHoles((prevHoles) => {
      const emptyHoles = prevHoles.filter((h) => h.mole === null);
      if (emptyHoles.length === 0) return prevHoles;

      // Pick random hole
      const randomHole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];

      // Pick mole type
      const rand = Math.random() * 100;
      let type: MoleType = 'standard';
      let hp = 1;

      if (rand < 55) type = 'standard'; // 55%
      else if (rand < 63) type = 'golden'; // 8% (more rare)
      else if (rand < 66) type = 'boss'; // 3% (ultra rare)
      else if (rand < 84) type = 'bunny'; // 18% (obstacle - pops up more often)
      else type = 'bomb'; // 16% (obstacle - pops up more often)

      hp = type === 'boss' ? 2 : 1;

      // Moles stay up for less time (leave quicker: 950ms -> 450ms)
      const duration = Math.max(450, 950 - Math.floor(score / 10) * 35);

      const updated = prevHoles.map((h) => {
        if (h.id === randomHole.id) {
          return {
            ...h,
            mole: {
              type,
              hp,
              maxHp: hp,
              spawnTime: Date.now(),
              duration,
            },
            hitState: 'none' as const,
          };
        }
        return h;
      });

      // Auto-despawn timeout
      setTimeout(() => {
        setHoles((currentHoles) =>
          currentHoles.map((h) => {
            if (h.id === randomHole.id && h.mole && h.hitState === 'none') {
              return { ...h, mole: null, hitState: 'escaped' as const };
            }
            return h;
          })
        );
      }, duration);

      return updated;
    });
  };

  const startNewGame = () => {
    if (slapEnergy < SLAP_COST) {
      sound.playError();
      addNotification('Need More Slaps!', `You need ${SLAP_COST} Slaps to play a round.`, 'info');
      return;
    }

    // Deduct slaps and track game played
    updateStatsDirectly({ 
      slapsToday: stats.slapsToday + SLAP_COST,
      whackAMolePlayedToday: (stats.whackAMolePlayedToday || 0) + 1
    });

    setScore(0);
    setTotalSlaps(0);
    setSuccessfulHits(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setHoles(Array.from({ length: HOLE_COUNT }, (_, i) => ({ id: i, mole: null, hitState: 'none' })));

    setGameState('playing');
    MoleSoundFX.playWhack();
  };

  const endGame = () => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);

    MoleSoundFX.playVictory();
    setGameState('gameover');
  };

  const emitFloatingText = (text: string, holeId: number, color = 'text-[#FFD043]') => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloatingTexts((prev) => [...prev.slice(-6), { id, text, holeId, color }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((ft) => ft.id !== id));
    }, 750);
  };

  const emitParticles = (holeId: number, emoji: string, count = 3) => {
    const newParticles: Particle[] = [];
    const col = holeId % 3;
    const row = Math.floor(holeId / 3);
    const baseX = col * 90 + 45;
    const baseY = row * 90 + 45;

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${Date.now()}-${Math.random()}`,
        x: baseX,
        y: baseY,
        emoji,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.6) * 7,
        size: Math.random() > 0.5 ? 20 : 15,
      });
    }
    setParticles((prev) => [...prev.slice(-12), ...newParticles]);
  };

  // Slap / Whack Hole Action
  const handleHoleSlap = (holeId: number, e: MouseEvent) => {
    if (gameState !== 'playing') return;

    setTotalSlaps((t) => t + 1);

    const hole = holes[holeId];

    if (!hole.mole) {
      // Whacked empty dirt hole
      sound.playSlap();
      setCombo(0);
      emitFloatingText('MISS!', holeId, 'text-slate-400 font-bold text-xs');
      return;
    }

    const m = hole.mole;
    const newHp = m.hp - 1;

    setSuccessfulHits((s) => s + 1);

    if (newHp > 0) {
      // Boss hit once
      MoleSoundFX.playBossWhack();
      emitFloatingText('1 MORE HIT! 👑', holeId, 'text-amber-300 font-black text-xs');
      emitParticles(holeId, '💥', 2);
      setHoles((prev) =>
        prev.map((h) => (h.id === holeId && h.mole ? { ...h, mole: { ...h.mole, hp: newHp } } : h))
      );
      return;
    }

    // Whacked mole completely!
    let points = 0;
    let text = '';
    let textColor = 'text-[#FFD043]';
    let particleEmoji = '⭐';

    if (m.type === 'standard') {
      points = 5;
      text = '+5 SP';
      textColor = 'text-amber-300';
      particleEmoji = '💥';
      MoleSoundFX.playWhack();
    } else if (m.type === 'golden') {
      points = 15;
      text = '⭐ +15 SP!';
      textColor = 'text-yellow-300 font-black';
      particleEmoji = '✨';
      MoleSoundFX.playGoldWhack();
    } else if (m.type === 'boss') {
      points = 25;
      text = '👑 BOSS WHACK +25!';
      textColor = 'text-amber-400 font-black';
      particleEmoji = '🌟';
      MoleSoundFX.playGoldWhack();
    } else if (m.type === 'bunny') {
      points = -15;
      text = 'DON\'T SLAP BUNNY! -15';
      textColor = 'text-rose-400 font-black';
      particleEmoji = '🐰';
      MoleSoundFX.playOuchBunny();
      setCombo(0);
    } else if (m.type === 'bomb') {
      points = -20;
      text = 'BOOM! BOMB MOLE! -20';
      textColor = 'text-rose-500 font-black';
      particleEmoji = '💣';
      MoleSoundFX.playOuchBunny();
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 250);
      setCombo(0);
    }

    if (points > 0) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));

      if (newCombo >= 3) {
        text += ` x${newCombo}!`;
      }
    }

    setScore((s) => Math.max(0, s + points));
    emitFloatingText(text, holeId, textColor);
    emitParticles(holeId, particleEmoji, 3);

    // Remove mole from hole
    setHoles((prev) =>
      prev.map((h) => (h.id === holeId ? { ...h, mole: null, hitState: 'whacked' } : h))
    );
  };

  const claimSP = () => {
    const baseClaimable = Math.max(5, score);
    const eventMultiplier = economyConfig?.doubleSpEventActive ? 2 : 1;
    const claimable = baseClaimable * eventMultiplier;
    updateCoinsAndXp(claimable, 20, 'Slap Game', 'Slap a Mole Arcade Victory');
    sound.playCoin();
    addNotification('SP Claimed! 🔨', `Won +${claimable} SP in Slap-a-Mole!${eventMultiplier > 1 ? ' (2x Event Active! ⚡)' : ''}`, 'success');
    setGameState('idle');
  };

  const accuracy = totalSlaps > 0 ? Math.round((successfulHits / totalSlaps) * 100) : 0;
  const starRating = score >= 120 ? 3 : score >= 50 ? 2 : 1;

  return (
    <div
      className={`bg-[#180E29] border-4 border-slate-900 rounded-[32px] p-3 relative flex flex-col shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden text-white touch-none select-none overscroll-none w-full max-w-md mx-auto transition-transform ${
        screenShake ? 'translate-x-1 translate-y-1' : ''
      }`}
      id="slap-a-mole-game-tab"
    >
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#a855f7_0.8px,transparent_0.8px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex justify-between items-center mb-2 z-10 border-b-2 border-purple-900/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[14px] bg-[#FFD043] border-2.5 border-slate-900 flex items-center justify-center text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
            🔨
          </div>
          <div className="flex flex-col text-left">
            <h2 className="text-sm font-black text-white tracking-tight uppercase leading-none flex items-center gap-1.5">
              <span>SLAP-A-MOLE</span>
              <span className="bg-[#FF3B77] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                ARCADE
              </span>
            </h2>
            <span className="text-purple-300 font-bold text-[9px] mt-0.5 tracking-wider uppercase">
              Cute SP Whack Mania
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-xl border-2 border-slate-900 bg-[#2A1B4E] hover:bg-purple-800 flex items-center justify-center text-purple-200 transition-all shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:scale-95 cursor-pointer"
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#FFD043]" />}
          </button>

          {onClose && (
            <button
              onClick={() => {
                sound.playSuccess();
                onClose();
              }}
              className="px-2.5 py-1 rounded-xl border-2 border-slate-900 bg-white hover:bg-[#FFEED1] text-slate-950 text-[10px] font-black uppercase tracking-wider transition-all shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>
      </div>

      {/* IDLE / START CARD */}
      {gameState === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center p-2 text-center z-10 my-auto">
          {/* Mole Character Mascot Icon */}
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#FFD043] to-amber-500 border-3 border-slate-900 flex items-center justify-center p-1.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <StandardMoleVisual className="w-full h-full drop-shadow-md" />
            </div>
            <div className="absolute -top-2 -right-2 bg-[#FF3B77] text-white text-[8px] font-black px-2 py-0.5 rounded-full border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] uppercase animate-bounce">
              Juicy SP!
            </div>
          </div>

          <h3 className="text-base font-black tracking-tight uppercase text-white mb-0.5">
            Slap-a-Mole Arcade 🐹🔨
          </h3>
          <p className="text-[11px] text-purple-200 font-bold leading-snug max-w-xs mb-3">
            Spend <span className="text-[#FFD043] font-black">{SLAP_COST} Slaps</span> to play! Whack adorable moles as they pop out of burrows to earn <span className="text-[#00D09E] font-black">SP Rewards</span>!
          </p>

          {/* 30-Second Duration Badge */}
          <div className="flex items-center gap-2 mb-3 bg-[#2A1B4E] px-3.5 py-1.5 rounded-[16px] border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-[#FFD043] font-black text-xs uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-[#FFD043]" />
            <span>⏱️ 30 Seconds Round</span>
          </div>

          {/* PROMINENT START BUTTON */}
          <button
            onClick={startNewGame}
            className={`w-full max-w-xs py-3.5 rounded-[20px] border-3 border-slate-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-[2px] active:shadow-none cursor-pointer mb-2.5 ${
              slapEnergy >= SLAP_COST
                ? 'bg-[#FFD043] hover:bg-yellow-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-75 shadow-none'
            }`}
          >
            <Play className="w-4 h-4 fill-slate-950 stroke-none" />
            <span>START GAME (-{SLAP_COST} SLAPS)</span>
          </button>

          <div className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mb-2">
            Slaps Available: <span className="font-mono text-[#FFD043] font-black">{slapEnergy} / {stats.maxSlapsPerDay}</span>
          </div>

          {/* Mole Types Chips Row */}
          <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap max-w-xs text-[9px] font-black">
            <span className="bg-amber-500/25 border border-amber-400 text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              🐹 Mole (+10)
            </span>
            <span className="bg-yellow-500/25 border border-yellow-300 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              ⭐ Golden (+30)
            </span>
            <span className="bg-purple-500/25 border border-purple-400 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              👑 Boss (+50)
            </span>
            <span className="bg-rose-500/25 border border-rose-400 text-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              🐰 Bunny (-15)
            </span>
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY */}
      {gameState === 'playing' && (
        <div className="flex-1 flex flex-col z-10 touch-none select-none overscroll-none">
          {/* ARCADE HUD */}
          <div className="bg-[#2A1B4E] border-3 border-slate-900 rounded-[22px] p-2 mb-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between gap-1.5 relative overflow-hidden">
            {/* Score Box */}
            <div className="bg-[#180E29] border-2 border-slate-900 rounded-xl px-2.5 py-1.5 flex flex-col items-start min-w-[75px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-[8px] font-black text-purple-300 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> SCORE
              </span>
              <span className="text-xs sm:text-sm font-black text-[#FFD043] font-mono leading-none mt-0.5">
                {score.toLocaleString()}
              </span>
            </div>

            {/* Central Timer Circle */}
            <div className="flex flex-col items-center justify-center -my-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#FF3B77] to-pink-700 border-3 border-slate-900 flex flex-col items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <span className="text-[7px] font-black uppercase text-pink-200 tracking-wider leading-none">
                  TIME
                </span>
                <span className="text-sm font-black font-mono leading-none mt-0.5">
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* SP Earned Box */}
            <div className="bg-[#180E29] border-2 border-slate-900 rounded-xl px-2.5 py-1.5 flex flex-col items-end min-w-[75px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-[8px] font-black text-purple-300 uppercase tracking-wider">
                SP WON
              </span>
              <span className="text-xs sm:text-sm font-black text-[#00D09E] font-mono leading-none mt-0.5">
                +{score} SP
              </span>
            </div>
          </div>

          {/* 3x3 MOLE HOLES GRID */}
          <div className="relative flex justify-center items-center my-auto touch-none select-none overscroll-none">
            {/* Floating FX Text Overlay */}
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              <AnimatePresence>
                {floatingTexts.map((ft) => {
                  const col = ft.holeId % 3;
                  const row = Math.floor(ft.holeId / 3);
                  const x = col * 33 + 12;
                  const y = row * 33 + 8;

                  return (
                    <motion.div
                      key={ft.id}
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1.2, y: -18 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.45 }}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className={`absolute text-xs sm:text-sm font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase tracking-wider ${ft.color}`}
                    >
                      {ft.text}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Particle Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {particles.map((p) => (
                <div
                  key={p.id}
                  style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
                  className="absolute pointer-events-none select-none drop-shadow-sm"
                >
                  <span style={{ fontSize: `${p.size}px` }}>{p.emoji}</span>
                </div>
              ))}
            </div>

            {/* 3x3 Grid Canvas */}
            <div
              className="grid grid-cols-3 gap-2.5 p-3 bg-[#251740] border-3 border-slate-900 rounded-[28px] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] touch-none select-none overscroll-none relative w-full max-w-[280px] aspect-square"
            >
              {holes.map((hole) => {
                const m = hole.mole;

                return (
                  <div
                    key={hole.id}
                    onClick={(e) => handleHoleSlap(hole.id, e)}
                    className="relative aspect-square rounded-[20px] bg-gradient-to-b from-[#180E29] to-[#120a20] border-2 border-slate-900 flex items-center justify-center cursor-pointer overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.7)] group"
                  >
                    {/* Dirt Mound Ring */}
                    <div className="absolute bottom-0 inset-x-0 h-4 bg-amber-900/40 border-t-2 border-amber-800/60 rounded-b-[18px] pointer-events-none" />

                    {/* Mole Pop-Up Character */}
                    <AnimatePresence>
                      {m && (
                        <motion.div
                          key={`mole-${hole.id}-${m.spawnTime}`}
                          initial={{ y: 50, scale: 0.6, opacity: 0 }}
                          animate={{ y: 0, scale: 1, opacity: 1 }}
                          exit={{ y: 50, scale: 0.5, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                          className="w-full h-full p-1 flex flex-col items-center justify-center relative z-10"
                        >
                          {m.type === 'standard' && (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <StandardMoleVisual className="w-full h-full drop-shadow-md" />
                            </div>
                          )}

                          {m.type === 'golden' && (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <GoldenMoleVisual className="w-full h-full drop-shadow-md" />
                            </div>
                          )}

                          {m.type === 'boss' && (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <BossMoleVisual className="w-full h-full drop-shadow-md" />
                              {m.hp === 2 && (
                                <span className="absolute bottom-0 text-[8px] bg-amber-500 text-slate-950 font-black px-1 rounded border border-slate-900 shadow-sm">
                                  2 HITS
                                </span>
                              )}
                            </div>
                          )}

                          {m.type === 'bunny' && (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <BunnyVisual className="w-full h-full drop-shadow-md" />
                              <span className="absolute top-0 text-[8px] bg-rose-500 text-white font-black px-1 rounded uppercase shadow-sm">
                                DON'T!
                              </span>
                            </div>
                          )}

                          {m.type === 'bomb' && (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <BombMoleVisual className="w-full h-full drop-shadow-md" />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Grass Patch Bottom Decor */}
                    <div className="absolute bottom-0 left-1 right-1 h-2 bg-emerald-600/50 rounded-t-sm pointer-events-none z-20" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SUMMARY MODAL */}
      {gameState === 'gameover' && (
        <div className="flex-1 flex flex-col items-center justify-center p-2 text-center z-10 my-auto">
          <div className="w-14 h-14 rounded-[20px] bg-[#FFD043] border-3 border-slate-900 flex items-center justify-center text-slate-950 mb-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <Award className="w-8 h-8 stroke-[2.5px]" />
          </div>

          <h3 className="text-base font-black tracking-tight uppercase text-[#FFD043] mb-0.5">
            Round Complete! 🎉
          </h3>
          <p className="text-xs text-purple-200 font-bold max-w-xs leading-relaxed">
            Great slaps! Here is your reward summary:
          </p>

          {/* Star Rating */}
          <div className="flex items-center gap-1.5 my-2">
            <Star className={`w-6 h-6 ${starRating >= 1 ? 'text-[#FFD043] fill-[#FFD043]' : 'text-slate-700'}`} />
            <Star className={`w-8 h-8 -mt-1 ${starRating >= 2 ? 'text-[#FFD043] fill-[#FFD043]' : 'text-slate-700'}`} />
            <Star className={`w-6 h-6 ${starRating >= 3 ? 'text-[#FFD043] fill-[#FFD043]' : 'text-slate-700'}`} />
          </div>

          {/* Breakdown Box */}
          <div className="bg-[#2A1B4E] border-3 border-slate-900 rounded-[20px] w-full max-w-xs p-3 my-2 text-left text-[11px] space-y-1.5 font-bold uppercase tracking-wide text-purple-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex justify-between items-center text-purple-300 border-b-2 border-purple-900 pb-1 text-[9px] font-black">
              <span>SUMMARY</span>
              <span>VALUE</span>
            </div>

            <div className="flex justify-between items-center">
              <span>🔨 Whack Score</span>
              <span className="font-mono text-white font-black">{score}</span>
            </div>

            <div className="flex justify-between items-center text-purple-200">
              <span>🎯 Accuracy</span>
              <span className="font-mono font-black">{accuracy}%</span>
            </div>

            <div className="flex justify-between items-center text-pink-300">
              <span>🔥 Max Combo</span>
              <span className="font-mono font-black">x{maxCombo}</span>
            </div>

            <div className="flex justify-between items-center border-t-2 border-purple-900 pt-1.5 text-white text-xs font-black">
              <span>TOTAL SP WON</span>
              <span className="font-mono text-[#00D09E] text-sm">+{Math.max(5, score)} SP</span>
            </div>
          </div>

          <button
            onClick={claimSP}
            className="w-full max-w-xs py-3.5 rounded-[20px] border-3 border-slate-900 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[3.5px_3.5px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-[1.5px] active:shadow-none cursor-pointer mt-1"
          >
            CLAIM SP REWARDS 🎁
          </button>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-2 border-t-2 border-purple-900/60 pt-2 text-center text-[9px] text-purple-300 flex items-center justify-between font-bold uppercase tracking-wider">
        <span>🔨 Slap-a-Mole</span>
        <span>⚡ Combo Multipliers</span>
        <span>⭐ Earn SP Points</span>
      </div>
    </div>
  );
}
