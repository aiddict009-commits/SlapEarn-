import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Award, Zap, Clock, Info, Sparkles, Trophy } from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction } from '../types';
import { CharacterVisual } from './CharacterVisual';

interface FruitMatchProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  onClose?: () => void;
}

// 6 core cute fruits + 3 special items
type FruitType = 'apple' | 'banana' | 'grapes' | 'orange' | 'strawberry' | 'kiwi' | 'golden' | 'rainbow' | 'bomb';

interface Cell {
  id: string;
  type: FruitType;
  row: number;
  col: number;
  isMatched: boolean;
  isSpecialEffect?: boolean;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  emoji: string;
  vx: number;
  vy: number;
}

const FRUIT_METADATA: Record<FruitType, { name: string; color: string; bg: string; border: string }> = {
  apple: { name: 'Momo Peach', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' },
  banana: { name: 'Bobo Tea', color: 'text-amber-300', bg: 'bg-amber-400/15', border: 'border-amber-400/40' },
  grapes: { name: 'Puni Slime', color: 'text-cyan-300', bg: 'bg-cyan-500/15', border: 'border-cyan-400/40' },
  orange: { name: 'Pip Citrus', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-400/40' },
  strawberry: { name: 'Wooly Alpaca', color: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-400/40' },
  kiwi: { name: 'Kiki Kiwi', color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-400/40' },
  golden: { name: 'Aero Star', color: 'text-yellow-300', bg: 'bg-yellow-400/25', border: 'border-yellow-400/60' },
  rainbow: { name: 'Niji Bunny', color: 'text-sky-300', bg: 'bg-sky-400/25', border: 'border-sky-400/60' },
  bomb: { name: 'Bambu Bomb', color: 'text-slate-300', bg: 'bg-slate-700/30', border: 'border-slate-500/50' },
};

const BOARD_SIZE = 8;
const SLAP_COST = 5;

// Cute SVG Vector graphics component for each fruit with adorable expressions (one character per tile)
function CuteFruitVisual({ type, isSelected }: { type: FruitType; isSelected?: boolean }) {
  const characterMap: Record<FruitType, string> = {
    apple: 'momo',
    banana: 'bobo',
    grapes: 'puni',
    orange: 'pip',
    strawberry: 'wooly',
    kiwi: 'kiki',
    golden: 'aero',
    rainbow: 'niji',
    bomb: 'bambu',
  };

  const charId = characterMap[type];

  return (
    <div className={`w-full h-full p-0.5 flex items-center justify-center transition-all duration-150 relative ${isSelected ? 'scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'hover:scale-105'}`}>
      <CharacterVisual id={charId} expression="idle" className="w-full h-full select-none pointer-events-none drop-shadow-sm" />
    </div>
  );
}

// Fallback audio synth helper
class MatchSoundPlayer {
  private static playSound(freqs: number[], type: OscillatorType = 'sine', duration = 0.1, delay = 0) {
    if (sound.getMuteStatus()) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime + delay;
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + duration + 0.05);
      });
    } catch (_) {}
  }

  static playSwap() {
    this.playSound([350, 450], 'triangle', 0.12);
  }

  static playMatchNormal() {
    this.playSound([523.25, 659.25, 783.99], 'sine', 0.15);
  }

  static playComboSound(count: number) {
    const multiplier = 1 + (count * 0.15);
    this.playSound([523.25 * multiplier, 659.25 * multiplier, 783.99 * multiplier, 1046.50 * multiplier], 'sine', 0.2);
  }

  static playExplosion() {
    this.playSound([100, 80, 50], 'sawtooth', 0.3);
  }

  static playGoldenChime() {
    this.playSound([880, 1109, 1318, 1760], 'triangle', 0.25);
  }

  static playRoundEnd() {
    this.playSound([523.25, 659.25, 783.99, 1046.5], 'sine', 0.4);
  }
}

export default function FruitMatch({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification, onClose }: FruitMatchProps) {
  const slapEnergy = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
  
  // Game state
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [board, setBoard] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [comboCount, setComboCount] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  // Statistics trackers
  const [totalMoves, setTotalMoves] = useState<number>(0);
  const [successfulMatchesCount, setSuccessfulMatchesCount] = useState<number>(0);
  const [wastedMovesCount, setWastedMovesCount] = useState<number>(0);
  const [maxComboAchieved, setMaxComboAchieved] = useState<number>(1);
  const [goldenFruitsMatchedCount, setGoldenFruitsMatchedCount] = useState<number>(0);
  const [rainbowFruitsMatchedCount, setRainbowFruitsMatchedCount] = useState<number>(0);

  // FX Layers
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Refs for loop controls & touch scrolling prevention
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef<boolean>(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Touch/swipe listeners
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartCell = useRef<{ r: number; c: number } | null>(null);

  // Fast animation based on Dynamic Difficulty
  const isPaceIncreased = timeLeft <= 30 && gameState === 'playing';

  // Prevent default scrolling on mobile touch devices when inside Fruit Match game
  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;

    const preventTouchScroll = (e: TouchEvent) => {
      if (gameState === 'playing') {
        if (e.cancelable) e.preventDefault();
      }
    };

    boardEl.addEventListener('touchstart', preventTouchScroll, { passive: false });
    boardEl.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      boardEl.removeEventListener('touchstart', preventTouchScroll);
      boardEl.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [gameState]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Handle particle animation frame
  useEffect(() => {
    if (particles.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity
          }))
          .filter((p) => p.y < 500 && p.x > -50 && p.x < 450)
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [particles]);

  const generateRandomFruitType = (): FruitType => {
    const roll = Math.random() * 100;
    if (roll < 0.2) return 'rainbow'; // 0.2% wildcard
    if (roll < 1.2) return 'golden';  // 1% golden
    if (roll < 3.2) return 'bomb';    // 2% bomb
    
    // Core fruits
    const coreFruits: FruitType[] = ['apple', 'banana', 'grapes', 'orange', 'strawberry', 'kiwi'];
    const idx = Math.floor(Math.random() * coreFruits.length);
    return coreFruits[idx];
  };

  const createInitialBoard = (): Cell[][] => {
    let newBoard: Cell[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      let rowCells: Cell[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        // Prevent initial matches
        let type = generateRandomFruitType();
        while (
          (r >= 2 && newBoard[r - 1][c].type === type && newBoard[r - 2][c].type === type) ||
          (c >= 2 && rowCells[c - 1].type === type && rowCells[c - 2].type === type)
        ) {
          type = generateRandomFruitType();
        }
        rowCells.push({
          id: `${Date.now()}-${r}-${c}-${Math.random()}`,
          type,
          row: r,
          col: c,
          isMatched: false,
        });
      }
      newBoard.push(rowCells);
    }
    return newBoard;
  };

  const startRound = () => {
    if (slapEnergy < SLAP_COST) {
      sound.playError();
      addNotification('Out of Slaps!', 'You need 5 Slaps to start a round. Watch some ads or spin the wheel!', 'info');
      return;
    }

    // Deduct slaps cost
    updateStatsDirectly({
      slapsToday: stats.slapsToday + SLAP_COST,
    });

    // Reset round trackers
    setScore(0);
    setTimeLeft(60);
    setComboCount(1);
    setTotalMoves(0);
    setSuccessfulMatchesCount(0);
    setWastedMovesCount(0);
    setMaxComboAchieved(1);
    setGoldenFruitsMatchedCount(0);
    setRainbowFruitsMatchedCount(0);
    setSelectedCell(null);
    setFloatingTexts([]);
    setParticles([]);

    // Initialize board
    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    
    sound.playSuccess();
    setGameState('playing');
    addNotification('Round Started!', 'You spent 5 Slaps. Clear as many fruits as you can in 60s!', 'success');
  };

  const handleGameOver = () => {
    MatchSoundPlayer.playRoundEnd();
    setGameState('gameover');
  };

  // Helper to trigger floating text (disabled)
  const spawnFloatingText = (_text: string, _col: number, _row: number, _color = 'text-yellow-400') => {
    // Disabled for speed
  };

  // Helper to trigger custom visual particles on matches (disabled)
  const spawnExplosionParticles = (_row: number, _col: number, _emoji: string, _count = 4) => {
    // Disabled for speed
  };

  // Main match check and resolve loops
  const processMatches = async (currentBoard: Cell[][], currentCombo: number): Promise<{ resolvedBoard: Cell[][]; matchFound: boolean }> => {
    let boardCopy = currentBoard.map(row => row.map(cell => ({ ...cell, isMatched: false })));
    let matchFound = false;

    // 1. Mark standard horizontal/vertical matches
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE - 2; c++) {
        const type1 = boardCopy[r][c].type;
        const type2 = boardCopy[r][c + 1].type;
        const type3 = boardCopy[r][c + 2].type;

        if (type1 === 'rainbow' || type2 === 'rainbow' || type3 === 'rainbow') {
          const nonWildcards = [type1, type2, type3].filter(t => t !== 'rainbow');
          if (nonWildcards.length === 0 || nonWildcards.every(t => t === nonWildcards[0])) {
            boardCopy[r][c].isMatched = true;
            boardCopy[r][c + 1].isMatched = true;
            boardCopy[r][c + 2].isMatched = true;
            matchFound = true;
          }
        } else if (type1 === type2 && type2 === type3) {
          boardCopy[r][c].isMatched = true;
          boardCopy[r][c + 1].isMatched = true;
          boardCopy[r][c + 2].isMatched = true;
          matchFound = true;
        }
      }
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE - 2; r++) {
        const type1 = boardCopy[r][c].type;
        const type2 = boardCopy[r + 1][c].type;
        const type3 = boardCopy[r + 2][c].type;

        if (type1 === 'rainbow' || type2 === 'rainbow' || type3 === 'rainbow') {
          const nonWildcards = [type1, type2, type3].filter(t => t !== 'rainbow');
          if (nonWildcards.length === 0 || nonWildcards.every(t => t === nonWildcards[0])) {
            boardCopy[r][c].isMatched = true;
            boardCopy[r + 1][c].isMatched = true;
            boardCopy[r + 2][c].isMatched = true;
            matchFound = true;
          }
        } else if (type1 === type2 && type2 === type3) {
          boardCopy[r][c].isMatched = true;
          boardCopy[r + 1][c].isMatched = true;
          boardCopy[r + 2][c].isMatched = true;
          matchFound = true;
        }
      }
    }

    if (!matchFound) {
      return { resolvedBoard: currentBoard, matchFound: false };
    }

    // 2. Resolve BOMBS in matches
    let hasExplodedBomb = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardCopy[r][c].isMatched && boardCopy[r][c].type === 'bomb') {
          hasExplodedBomb = true;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                boardCopy[nr][nc].isMatched = true;
                boardCopy[nr][nc].isSpecialEffect = true;
              }
            }
          }
        }
      }
    }

    if (hasExplodedBomb) {
      MatchSoundPlayer.playExplosion();
    }

    // 3. Score calculation
    let matchGroups: Cell[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (boardCopy[r][c].isMatched) {
          matchGroups.push(boardCopy[r][c]);
        }
      }
    }

    const matchedCount = matchGroups.length;
    let earnedSp = 0;

    if (matchedCount >= 5) earnedSp += 10;
    else if (matchedCount === 4) earnedSp += 5;
    else if (matchedCount === 3) earnedSp += 2;
    else if (matchedCount > 0) earnedSp += 1;

    if (currentCombo > 1) {
      let comboBonus = 0;
      if (currentCombo === 2) comboBonus = 2;
      else if (currentCombo === 3) comboBonus = 5;
      else if (currentCombo === 4) comboBonus = 8;
      else comboBonus = 12;
      
      earnedSp += comboBonus;
      spawnFloatingText(`Combo x${currentCombo}! +${comboBonus}`, 3.5, 3, 'text-pink-400 font-black scale-110');
      MatchSoundPlayer.playComboSound(currentCombo);
    } else {
      MatchSoundPlayer.playMatchNormal();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }

    let goldenMatchIncrement = 0;
    let rainbowMatchIncrement = 0;

    matchGroups.forEach((cell) => {
      if (cell.type === 'golden') {
        earnedSp += 25;
        goldenMatchIncrement++;
        MatchSoundPlayer.playGoldenChime();
        spawnFloatingText('GOLDEN! +25 SP', cell.col, cell.row, 'text-yellow-300 font-bold');
      }
      if (cell.type === 'rainbow') {
        earnedSp += 50;
        rainbowMatchIncrement++;
        MatchSoundPlayer.playGoldenChime();
        spawnFloatingText('RAINBOW! +50 SP', cell.col, cell.row, 'text-sky-300 font-bold');
      }
      spawnExplosionParticles(cell.row, cell.col, '✨', 3);
    });

    if (goldenMatchIncrement > 0) {
      setGoldenFruitsMatchedCount(prev => prev + goldenMatchIncrement);
    }
    if (rainbowMatchIncrement > 0) {
      setRainbowFruitsMatchedCount(prev => prev + rainbowMatchIncrement);
    }

    setScore((prev) => prev + earnedSp);
    setSuccessfulMatchesCount((prev) => prev + matchedCount);

    if (matchGroups.length > 0) {
      const centerCell = matchGroups[Math.floor(matchGroups.length / 2)];
      spawnFloatingText(`+${earnedSp} SP`, centerCell.col, centerCell.row, 'text-emerald-400 font-black');
    }

    await new Promise((resolve) => setTimeout(resolve, 60));

    // 4. Compact the board
    for (let c = 0; c < BOARD_SIZE; c++) {
      let unmatchedCells: FruitType[] = [];
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        if (!boardCopy[r][c].isMatched) {
          unmatchedCells.push(boardCopy[r][c].type);
        }
      }

      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        const unmatchedIdx = (BOARD_SIZE - 1) - r;
        if (unmatchedIdx < unmatchedCells.length) {
          boardCopy[r][c].type = unmatchedCells[unmatchedIdx];
        } else {
          boardCopy[r][c].type = generateRandomFruitType();
          boardCopy[r][c].id = `${Date.now()}-${r}-${c}-${Math.random()}`;
        }
        boardCopy[r][c].isMatched = false;
        boardCopy[r][c].isSpecialEffect = false;
      }
    }

    setBoard(boardCopy);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // 5. Recursive check for cascade matches
    const nextCombo = currentCombo + 1;
    const cascadeResult = await processMatches(boardCopy, nextCombo);
    if (cascadeResult.matchFound) {
      setMaxComboAchieved((prev) => Math.max(prev, nextCombo));
      setBoard(cascadeResult.resolvedBoard);
    }

    return { resolvedBoard: cascadeResult.resolvedBoard, matchFound: true };
  };

  // Swap cells action
  const swapCells = async (r1: number, c1: number, r2: number, c2: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    processingRef.current = true;
    setComboCount(1);
    setTotalMoves((prev) => prev + 1);

    MatchSoundPlayer.playSwap();

    let boardCopy = board.map(row => row.map(cell => ({ ...cell })));
    const tempType = boardCopy[r1][c1].type;
    boardCopy[r1][c1].type = boardCopy[r2][c2].type;
    boardCopy[r2][c2].type = tempType;
    setBoard(boardCopy);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const matchResult = await processMatches(boardCopy, 1);

    if (!matchResult.matchFound) {
      MatchSoundPlayer.playSwap();
      setWastedMovesCount((prev) => prev + 1);
      
      const tempTypeBack = boardCopy[r1][c1].type;
      boardCopy[r1][c1].type = boardCopy[r2][c2].type;
      boardCopy[r2][c2].type = tempTypeBack;
      setBoard(boardCopy);
      
      spawnFloatingText('No Match!', c2, r2, 'text-rose-400 font-bold text-xs');
    }

    setSelectedCell(null);
    setIsProcessing(false);
    processingRef.current = false;
  };

  const handleCellClick = (r: number, c: number) => {
    if (isProcessing || gameState !== 'playing') return;

    if (!selectedCell) {
      sound.playSlap();
      setSelectedCell({ r, c });
    } else {
      const isNeighbor =
        (Math.abs(selectedCell.r - r) === 1 && selectedCell.c === c) ||
        (Math.abs(selectedCell.c - c) === 1 && selectedCell.r === r);

      if (isNeighbor) {
        swapCells(selectedCell.r, selectedCell.c, r, c);
      } else {
        sound.playSlap();
        setSelectedCell({ r, c });
      }
    }
  };

  // Touch and drag swipe listeners
  const handleCellTouchStart = (r: number, c: number, e: any) => {
    if (isProcessing || gameState !== 'playing') return;
    const nativeEvent = e;
    const clientX = nativeEvent.touches ? nativeEvent.touches[0].clientX : nativeEvent.clientX;
    const clientY = nativeEvent.touches ? nativeEvent.touches[0].clientY : nativeEvent.clientY;
    touchStartPos.current = { x: clientX, y: clientY };
    touchStartCell.current = { r, c };
    setSelectedCell({ r, c });
  };

  const handleCellTouchEnd = (e: any) => {
    if (isProcessing || gameState !== 'playing' || !touchStartPos.current || !touchStartCell.current) return;
    
    const nativeEvent = e;
    const clientX = nativeEvent.changedTouches ? nativeEvent.changedTouches[0].clientX : nativeEvent.clientX;
    const clientY = nativeEvent.changedTouches ? nativeEvent.changedTouches[0].clientY : nativeEvent.clientY;
    
    const dx = clientX - touchStartPos.current.x;
    const dy = clientY - touchStartPos.current.y;
    
    const threshold = 12;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return;
    }

    const start = touchStartCell.current;
    let targetR = start.r;
    let targetC = start.c;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && start.c < BOARD_SIZE - 1) targetC = start.c + 1;
      else if (dx < 0 && start.c > 0) targetC = start.c - 1;
    } else {
      if (dy > 0 && start.r < BOARD_SIZE - 1) targetR = start.r + 1;
      else if (dy < 0 && start.r > 0) targetR = start.r - 1;
    }

    if (targetR !== start.r || targetC !== start.c) {
      swapCells(start.r, start.c, targetR, targetC);
    }

    touchStartPos.current = null;
    touchStartCell.current = null;
  };

  const claimRewards = () => {
    const baseSp = score;
    const bonusNoWasted = (totalMoves > 0 && wastedMovesCount === 0) ? 5 : 0;
    const bonusCombos = (maxComboAchieved >= 3 || successfulMatchesCount >= 40) ? 10 : 0;
    const bonusGolden = (goldenFruitsMatchedCount > 0) ? 25 : 0;
    const bonusRainbow = (rainbowFruitsMatchedCount > 0) ? 50 : 0;

    const totalClaimableSp = baseSp + bonusNoWasted + bonusCombos + bonusGolden + bonusRainbow;

    if (totalClaimableSp > 0) {
      updateCoinsAndXp(totalClaimableSp, 15, 'Slap Game', `Fruit Match Round SP Reward`);
    } else {
      updateCoinsAndXp(0, 5, 'Slap Game', `Fruit Match Round Completed`);
    }

    sound.playCoin();
    addNotification('SP Claimed!', `Claimed +${totalClaimableSp} SP from Fruit Match!`, 'success');
    
    setGameState('idle');
  };

  return (
    <div className="bg-[#0B0F19] border-4 border-slate-950 rounded-[28px] p-2.5 sm:p-3 relative flex flex-col shadow-[4px_4.5px_0px_0px_rgba(15,23,42,1)] overflow-hidden text-white touch-none select-none overscroll-none w-full max-w-md mx-auto" id="fruit-match-game-tab">
      
      {/* Background neon style sparks */}
      <div className="absolute inset-0 bg-[radial-gradient(#ff3b77_0.8px,transparent_0.8px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex justify-between items-center mb-1.5 z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 rounded-lg bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-xs">
            🍓
          </div>
          <div className="flex flex-col text-left">
            <h2 className="text-[11px] font-black text-white tracking-tight leading-none uppercase">Cute Fruit Match</h2>
            <span className="text-slate-400 font-bold text-[8px] mt-0.5 tracking-wide uppercase">Match-3 SP Puzzle</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={() => {
              sound.playSuccess();
              onClose();
            }}
            className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900 text-[9.5px] font-black uppercase text-slate-300 hover:text-white transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:scale-95"
          >
            ← Back
          </button>
        )}
      </div>

      {gameState === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center p-2 text-center z-10 my-auto min-h-[360px]">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border-2 border-pink-500 flex items-center justify-center text-2xl mb-2.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] animate-bounce-subtle">
            🍓
          </div>
          <h3 className="text-xs font-black tracking-tight uppercase text-white mb-1">Fast & Super Cute Match-3</h3>
          <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xs mb-3">
            Spend <span className="text-[#FFD043] font-black">{SLAP_COST} Slaps</span> for a 60s round. Match 3 adorable fruits to earn SP rewards!
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-left w-full max-w-xs mb-4 text-[9px] uppercase font-bold text-slate-300 bg-slate-900/80 border border-slate-800 rounded-xl p-2">
            <div className="flex items-center gap-1">
              <span>💣</span> <span>Bomb explosions</span>
            </div>
            <div className="flex items-center gap-1">
              <span>⭐</span> <span>Golden (+25 SP)</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🌈</span> <span>Wildcards (+50 SP)</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔥</span> <span>Combo chains</span>
            </div>
          </div>

          <button
            onClick={startRound}
            className={`w-full max-w-xs py-2.5 rounded-xl border-2 border-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] active:shadow-none ${
              slapEnergy >= SLAP_COST
                ? 'bg-[#FF3B77] text-white hover:bg-[#E33D6F]'
                : 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-75 shadow-none'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-white stroke-none" />
            <span>Start Game (-5 Slaps)</span>
          </button>
          
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">
            Available: <span className="font-mono text-white">{slapEnergy} / {stats.maxSlapsPerDay} Slaps</span>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex-1 flex flex-col z-10 touch-none select-none overscroll-none" id="fruit-match-active-board">
          
          {/* HUD Score bar */}
          <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl mb-1.5 items-center">
            <div className="text-left">
              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block">SP EARNED</span>
              <span className="text-xs font-black text-emerald-400 font-mono tracking-tight">{score} SP</span>
            </div>
            <div className="text-center">
              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block">TIMER</span>
              <div className="flex items-center justify-center gap-0.5">
                <Clock className="w-2.5 h-2.5 text-pink-500 animate-pulse" />
                <span className={`text-xs font-mono font-black ${timeLeft <= 10 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block">PACE MODE</span>
              <span className={`text-[8.5px] font-black uppercase tracking-tight ${isPaceIncreased ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {isPaceIncreased ? '🔥 RAPID' : '💤 RELAXED'}
              </span>
            </div>
          </div>

          {/* Time progress bar */}
          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mb-1.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 15 ? 'bg-red-500' : 'bg-[#FF3B77]'}`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>

          {/* 8x8 MATCH-3 BOARD */}
          <div className="relative flex justify-center items-center my-auto touch-none select-none overscroll-none">
            
            {/* Board grid outline */}
            <div
              ref={boardRef}
              className="grid grid-cols-8 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-950 border-2 border-slate-900 rounded-[18px] shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] touch-none select-none overscroll-none"
              style={{
                width: '100%',
                maxWidth: '290px',
                aspectRatio: '1',
                touchAction: 'none',
              }}
            >
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const meta = FRUIT_METADATA[cell.type];
                  const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;

                  return (
                    <div
                      key={cell.id}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      onTouchStart={(e) => handleCellTouchStart(rIdx, cIdx, e)}
                      onTouchEnd={handleCellTouchEnd}
                      onMouseDown={(e) => handleCellTouchStart(rIdx, cIdx, e)}
                      onMouseUp={handleCellTouchEnd}
                      style={{ touchAction: 'none' }}
                      className={`aspect-square rounded-lg flex items-center justify-center cursor-pointer relative select-none touch-none transition-all duration-75 border ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-amber-500/20 scale-95 z-10 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : cell.isMatched
                          ? 'opacity-30 scale-90 border-slate-800 bg-slate-900'
                          : `${meta.bg} ${meta.border} hover:bg-slate-800/80`
                      }`}
                    >
                      <CuteFruitVisual type={cell.type} isSelected={isSelected} />
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Quick interactive tips */}
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[8px] text-slate-400 font-bold uppercase tracking-wide">
            <Info className="w-2.5 h-2.5 text-[#FF3B77]" />
            <span>Tap neighboring fruits or drag to swap!</span>
          </div>

        </div>
      )}

      {gameState === 'gameover' && (
        <div className="flex-1 flex flex-col items-center justify-center p-2 text-center z-10 my-auto min-h-[360px]">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-2">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black tracking-tight uppercase text-[#FFD043]">Round Completed!</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-relaxed">
            Time's up! Here is your reward breakdown:
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-xs p-2.5 my-2.5 text-left text-[10px] space-y-1 font-bold uppercase tracking-wide text-slate-300">
            <div className="flex justify-between items-center text-slate-400 border-b border-slate-900 pb-1 text-[8.5px]">
              <span>REWARD BREAKDOWN</span>
              <span>SP VALUE</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>🍎 Matches Score</span>
              <span className="font-mono text-white">+{score} SP</span>
            </div>

            <div className="flex justify-between items-center text-emerald-400">
              <span>🎯 No Wasted Moves</span>
              <span className="font-mono">
                {totalMoves > 0 && wastedMovesCount === 0 ? '+5 SP' : '0 SP'}
              </span>
            </div>

            <div className="flex justify-between items-center text-pink-400">
              <span>🔥 Combos Skill Bonus</span>
              <span className="font-mono">
                {maxComboAchieved >= 3 || successfulMatchesCount >= 40 ? '+10 SP' : '0 SP'}
              </span>
            </div>

            <div className="flex justify-between items-center text-yellow-400">
              <span>⭐ Golden Fruit matched</span>
              <span className="font-mono">
                {goldenFruitsMatchedCount > 0 ? `+${goldenFruitsMatchedCount * 25} SP` : '0 SP'}
              </span>
            </div>

            <div className="flex justify-between items-center text-sky-400">
              <span>🌈 Rainbow Fruit matched</span>
              <span className="font-mono">
                {rainbowFruitsMatchedCount > 0 ? `+${rainbowFruitsMatchedCount * 50} SP` : '0 SP'}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-900 pt-1 text-white text-[11px] font-black">
              <span>TOTAL SP WON</span>
              <span className="font-mono text-emerald-400">
                +{score +
                  ((totalMoves > 0 && wastedMovesCount === 0) ? 5 : 0) +
                  ((maxComboAchieved >= 3 || successfulMatchesCount >= 40) ? 10 : 0) +
                  (goldenFruitsMatchedCount * 25) +
                  (rainbowFruitsMatchedCount * 50)} SP
              </span>
            </div>
          </div>

          <div className="flex gap-2 w-full max-w-xs">
            <button
              onClick={claimRewards}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-950 bg-[#FF3B77] text-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-[1px] active:shadow-none"
            >
              Claim SP Reward
            </button>
          </div>
        </div>
      )}

      {/* Compact Rules ribbon */}
      <div className="mt-1.5 border-t border-slate-900/80 pt-1.5 text-left text-[8px] text-slate-400 flex items-center justify-between font-bold uppercase tracking-wider">
        <span>🍓 60s Round (-5 Slaps)</span>
        <span>🔥 Match 3+ for SP</span>
        <span>⭐ Specials = Explosions</span>
      </div>

    </div>
  );
}
