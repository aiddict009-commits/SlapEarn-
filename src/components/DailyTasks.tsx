import { useState, useRef, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Zap, Sparkles, HelpCircle, Check, X, Trophy, RefreshCw, Hand, Star } from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, QuizQuestion, Transaction } from '../types';

interface DailyTasksProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
}

const TRIVIA_QUESTIONS: QuizQuestion[] = [
  {
    id: 'quiz-1',
    question: "Which of the following is considered the native cryptocurrency of the Ethereum network?",
    options: ["Bitcoin", "Ether (ETH)", "Solana", "Cardano"],
    correctAnswer: 1,
    reward: 120,
  },
  {
    id: 'quiz-2',
    question: "What does the abbreviation 'API' stand for in software development?",
    options: ["Application Programming Interface", "Advanced Protocol Integration", "Automated Program Instruction", "Access Point Internet"],
    correctAnswer: 0,
    reward: 100,
  },
  {
    id: 'quiz-3',
    question: "In computer systems, which device is responsible for executing instructions and calculations?",
    options: ["RAM", "Hard Drive", "CPU", "Graphics Card"],
    correctAnswer: 2,
    reward: 110,
  }
];

export default function DailyTasks({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification }: DailyTasksProps) {
  // Streaks / Check-in
  const [checkInClaimed, setCheckInClaimed] = useState<boolean>(() => {
    return stats.lastCheckIn 
      ? new Date(stats.lastCheckIn).toDateString() === new Date().toDateString() 
      : false;
  });

  useEffect(() => {
    const claimed = stats.lastCheckIn 
      ? new Date(stats.lastCheckIn).toDateString() === new Date().toDateString() 
      : false;
    setCheckInClaimed(claimed);
  }, [stats.lastCheckIn]);
  
  // Slap Game state
  const [slapEnergy, setSlapEnergy] = useState<number>(stats.maxSlapsPerDay - stats.slapsToday);
  const [isSlapAnimating, setIsSlapAnimating] = useState<boolean>(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const slapContainerRef = useRef<HTMLDivElement>(null);
  const nextParticleId = useRef<number>(0);

  // Quiz state
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizStatus, setQuizStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Initialize energy
  useEffect(() => {
    setSlapEnergy(stats.maxSlapsPerDay - stats.slapsToday);
  }, [stats.slapsToday, stats.maxSlapsPerDay]);

  // Setup initial state for mock check-in day checking
  const daysOfCheckIn = [
    { day: 1, slaps: 5, coins: 0 },
    { day: 2, slaps: 8, coins: 0 },
    { day: 3, slaps: 10, coins: 0 },
    { day: 4, slaps: 12, coins: 0 },
    { day: 5, slaps: 15, coins: 0 },
    { day: 6, slaps: 20, coins: 0 },
    { day: 7, slaps: 25, coins: 50 }
  ];

  // Handle daily check-in
  const handleCheckIn = () => {
    if (checkInClaimed) {
      sound.playError();
      return;
    }

    const nextStreak = stats.streak + 1;
    const rewardItem = daysOfCheckIn[stats.streak];
    if (!rewardItem) return;

    // Available slaps calculation under the 100 limit rule
    const currentSlaps = Math.max(0, stats.maxSlapsPerDay - stats.slapsToday);
    const maxSlapsLimit = 100;
    const spaceLeft = maxSlapsLimit - currentSlaps;
    const slapsToGive = Math.max(0, Math.min(rewardItem.slaps, spaceLeft));
    const nextSlapsToday = stats.maxSlapsPerDay - (currentSlaps + slapsToGive);

    // Coins reward
    if (rewardItem.coins > 0) {
      updateCoinsAndXp(rewardItem.coins, 10, 'Daily Check-in', `Day ${nextStreak} Daily Login Reward`);
    } else {
      // Still log check-in transaction with 0 coins but small XP
      updateCoinsAndXp(0, 10, 'Daily Check-in', `Day ${nextStreak} Daily Login Reward`);
    }

    updateStatsDirectly({
      streak: nextStreak,
      lastCheckIn: new Date().toISOString(),
      slapsToday: nextSlapsToday
    });

    setCheckInClaimed(true);
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

  // Handle giant slap click
  const handleSlap = (e: MouseEvent<HTMLDivElement>) => {
    if (slapEnergy <= 0) {
      sound.playError();
      addNotification('Out of Energy!', 'Watch an Ad or complete Offerwalls to instantly restore energy!', 'info');
      return;
    }

    sound.playSlap();
    setIsSlapAnimating(true);
    setTimeout(() => setIsSlapAnimating(false), 150);

    // Calculate position for reward particles
    if (slapContainerRef.current) {
      const rect = slapContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const randomCoin = Math.floor(Math.random() * 4) + 3; // +3 to +6 coins per slap
      const xpValue = 2; // +2 XP per slap
      
      updateCoinsAndXp(randomCoin, xpValue, 'Slap Game', 'Target Slap Reward');
      updateStatsDirectly({
        slapsToday: stats.slapsToday + 1
      });
      setSlapEnergy(prev => prev - 1);

      // Add particle
      const pId = nextParticleId.current++;
      setParticles(prev => [
        ...prev,
        { id: pId, x, y, text: `+${randomCoin} 🪙` }
      ]);

      // Remove particle after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== pId));
      }, 1000);
    }
  };

  // Restores Slap Energy via simulated Ad/Action
  const handleRestoreEnergy = () => {
    updateStatsDirectly({
      slapsToday: 0
    });
    setSlapEnergy(stats.maxSlapsPerDay);
    sound.playSuccess();
    addNotification('Energy Restored!', `Slap energy replenished to ${stats.maxSlapsPerDay}/${stats.maxSlapsPerDay}! Go ahead and Slap!`, 'success');
  };

  // Handle Trivia Submission
  const handleQuizAnswer = (optionIdx: number) => {
    if (quizAnswered) return;
    setSelectedOption(optionIdx);
  };

  const submitQuizAnswer = () => {
    if (selectedOption === null || quizAnswered) return;

    const currentQuiz = TRIVIA_QUESTIONS[currentQuizIndex];
    setQuizAnswered(true);

    if (selectedOption === currentQuiz.correctAnswer) {
      setQuizStatus('correct');
      sound.playSuccess();
      updateCoinsAndXp(currentQuiz.reward, 40, 'Daily Quiz' as any, 'Daily Trivia Master');
      addNotification('Quiz Cleared!', `Correct! Earned +${currentQuiz.reward} Coins!`, 'success');
    } else {
      setQuizStatus('wrong');
      sound.playError();
    }
  };

  const nextQuiz = () => {
    setCurrentQuizIndex((prev) => (prev + 1) % TRIVIA_QUESTIONS.length);
    setQuizAnswered(false);
    setSelectedOption(null);
    setQuizStatus('idle');
  };

  return (
    <div className="space-y-8" id="daily-tasks-tab">
      
      {/* 1. Daily Check-in */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="daily-checkin-section">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-amber-500 font-display font-semibold tracking-wide text-sm uppercase">
              <Flame className="w-5 h-5 fill-amber-500" />
              <span>Daily Check-in Streaks</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-white mt-1">Consistency pays off!</h2>
            <p className="text-slate-400 text-sm mt-1">Claim your daily coin boost. Miss a day, and the streak resets.</p>
          </div>
          
          <button
            onClick={handleCheckIn}
            disabled={checkInClaimed}
            id="claim-streak-btn"
            className={`w-full md:w-auto px-6 py-3.5 rounded-2xl font-display font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
              checkInClaimed
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95'
            }`}
          >
            {checkInClaimed ? (
              <>
                <Check className="w-5 h-5 stroke-[3px]" />
                <span>Claimed Today</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>Claim Day {stats.streak + 1} Reward</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {daysOfCheckIn.map((item) => {
            const isCompleted = item.day <= stats.streak;
            const isCurrent = item.day === stats.streak + 1 && !checkInClaimed;
            const isLocked = item.day > stats.streak + (checkInClaimed ? 0 : 1);

            return (
              <div
                key={item.day}
                id={`checkin-day-${item.day}`}
                className={`flex flex-col items-center justify-between p-4 rounded-2xl border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isCurrent
                    ? 'bg-slate-800 border-amber-500 text-white shadow-md shadow-amber-500/5 animate-pulse'
                    : 'bg-slate-950 border-slate-900 text-slate-500'
                }`}
              >
                <div className="font-display font-semibold text-xs tracking-wider uppercase mb-1">
                  Day {item.day}
                </div>
                
                <div className="my-3">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                      <Check className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto text-lg ${
                      isCurrent ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-900 text-slate-600'
                    }`}>
                      {item.day === 7 ? '🎁' : '👋'}
                    </div>
                  )}
                </div>

                <div>
                  <div className={`font-display font-black text-xs sm:text-sm ${isCurrent ? 'text-amber-500' : 'text-slate-200'}`}>
                    +{item.slaps} Slaps
                  </div>
                  {item.coins > 0 && (
                    <div className="font-display font-black text-xs text-amber-400 mt-1 flex items-center justify-center gap-0.5">
                      <span>⭐</span>
                      <span>+{item.coins} SP</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rules block matching the user's screenshot */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <h3 className="text-white font-bold font-display text-sm mb-3">Rules</h3>
          <ul className="text-slate-400 text-xs space-y-2 list-disc list-inside">
            <li>One reward per day.</li>
            <li>Missing a day resets the streak to Day 1.</li>
            <li>
              Rewards cannot take the player above the <span className="text-amber-400 font-bold">100 Slap storage limit</span>. For example, if a player has 90 Slaps and claims Day 7, they would receive only 10 Slaps (reaching the cap of 100), but they would still receive the full 50 SP.
            </li>
          </ul>
        </div>
      </section>

      {/* 2. Slap & Earn Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Slap Game Container */}
        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between" id="slap-earn-game-section">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-display font-semibold tracking-wide text-sm uppercase">
              <Zap className="w-5 h-5 fill-emerald-500 stroke-none" />
              <span>Slap & Earn Tap Miner</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-white mt-1">Slap the Piggy!</h2>
            <p className="text-slate-400 text-sm mt-1">
              Give our digital piggy a heavy slap to mine coins and earn instant experience. Maximize your energy daily!
            </p>
          </div>

          {/* Interactive Slap Stage */}
          <div className="relative my-8 flex items-center justify-center">
            <div
              ref={slapContainerRef}
              onClick={handleSlap}
              id="slap-target-box"
              className={`relative cursor-pointer select-none transition-all duration-75 flex items-center justify-center p-8 ${
                slapEnergy <= 0 ? 'opacity-75 pointer-events-none' : ''
              }`}
            >
              {/* Particle Render */}
              <AnimatePresence>
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 1, scale: 0.6, y: p.y, x: p.x }}
                    animate={{ opacity: 0, scale: 1.5, y: p.y - 140, x: p.x + (Math.random() * 60 - 30) }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute pointer-events-none font-display font-bold text-xl text-amber-400 z-30 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                  >
                    {p.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Hologram energy ring under piggy */}
              <div className={`absolute w-44 h-44 rounded-full border border-emerald-500/10 bg-emerald-500/5 filter blur-xl transition-all ${
                isSlapAnimating ? 'scale-150 opacity-40' : 'scale-100 opacity-20'
              }`} />

              {/* Giant Clickable Hand/Coin */}
              <motion.div
                animate={isSlapAnimating ? { scale: 0.88, rotate: [0, -6, 6, 0] } : { scale: 1 }}
                whileHover={slapEnergy > 0 ? { scale: 1.05 } : {}}
                transition={{ duration: 0.12 }}
                id="giant-piggy-target"
                className="relative z-10 w-52 h-52 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-yellow-300 group"
              >
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-yellow-200/40 animate-[spin_40s_linear_infinite]" />
                
                {/* Floating Hand/Slap icon inside */}
                <Hand className="w-16 h-16 text-slate-950 stroke-[2px] mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-display font-black text-2xl text-slate-950 tracking-wider">
                  SLAP!
                </span>
                <span className="text-[10px] font-mono text-slate-900 bg-yellow-300/60 px-2 py-0.5 rounded-full font-bold">
                  +{stats.level}x MULTI
                </span>
              </motion.div>
            </div>

            {/* Empty Energy State */}
            {slapEnergy <= 0 && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-4 border border-red-500/30">
                  <Zap className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-white font-display">Slap Energy Depleted</h4>
                <p className="text-slate-400 text-sm max-w-xs mt-1">
                  You have reached your daily slapping limit! Reset or restore energy.
                </p>
                <button
                  onClick={handleRestoreEnergy}
                  id="restore-slap-energy-btn"
                  className="mt-4 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-semibold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm font-display shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restore Energy (Instant Reset)</span>
                </button>
              </div>
            )}
          </div>

          {/* Energy Bar and Quotas */}
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl">
            <div className="flex justify-between items-center text-sm font-display font-medium text-slate-300 mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500 stroke-none" />
                <span>Today's Energy Balance</span>
              </div>
              <span className="font-mono text-white text-xs">{slapEnergy} / {stats.maxSlapsPerDay} Slaps</span>
            </div>
            
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                animate={{ width: `${(slapEnergy / stats.maxSlapsPerDay) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-right">
              Earn +3 to +6 Coins + 2 XP on every slap! Higher player levels increase coin payouts.
            </p>
          </div>
        </section>

        {/* 3. Daily Trivia Quiz */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between" id="daily-quiz-section">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-400 font-display font-semibold tracking-wide text-sm uppercase">
                <HelpCircle className="w-5 h-5" />
                <span>Daily Knowledge Drill</span>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                Trivia Quiz
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">Trivia {currentQuizIndex + 1} of {TRIVIA_QUESTIONS.length}</span>
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                +{TRIVIA_QUESTIONS[currentQuizIndex].reward} Coins
              </span>
            </div>

            <h3 className="text-lg font-bold font-display text-white mt-3 min-h-[56px] leading-snug">
              {TRIVIA_QUESTIONS[currentQuizIndex].question}
            </h3>

            {/* Options list */}
            <div className="space-y-2.5 mt-6">
              {TRIVIA_QUESTIONS[currentQuizIndex].options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectAnswer = idx === TRIVIA_QUESTIONS[currentQuizIndex].correctAnswer;
                
                let btnStyles = "bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-850 hover:border-slate-700";
                
                if (quizAnswered) {
                  if (isCorrectAnswer) {
                    btnStyles = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-medium";
                  } else if (isSelected) {
                    btnStyles = "bg-red-500/20 border-red-500 text-red-400";
                  } else {
                    btnStyles = "bg-slate-950 border-slate-900 text-slate-600 opacity-60";
                  }
                } else if (isSelected) {
                  btnStyles = "bg-blue-500/15 border-blue-500 text-white shadow-lg shadow-blue-500/5";
                }

                return (
                  <button
                    key={idx}
                    disabled={quizAnswered}
                    onClick={() => handleQuizAnswer(idx)}
                    id={`quiz-option-${idx}`}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all text-sm font-display flex items-center justify-between ${btnStyles}`}
                  >
                    <span>{opt}</span>
                    {quizAnswered && isCorrectAnswer && <Check className="w-4.5 h-4.5 text-emerald-500 stroke-[3px] flex-shrink-0" />}
                    {quizAnswered && isSelected && !isCorrectAnswer && <X className="w-4.5 h-4.5 text-red-500 stroke-[3px] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quiz Action Panel */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            {!quizAnswered ? (
              <button
                onClick={submitQuizAnswer}
                disabled={selectedOption === null}
                id="submit-quiz-btn"
                className={`w-full py-3 rounded-xl font-display font-bold transition-all ${
                  selectedOption === null
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg'
                }`}
              >
                Submit Answer
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850">
                  {quizStatus === 'correct' ? (
                    <>
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Check className="w-4 h-4 stroke-[3px]" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-400">Correct!</span> Earned +{TRIVIA_QUESTIONS[currentQuizIndex].reward} Coins!
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 flex-shrink-0">
                        <X className="w-4 h-4 stroke-[3px]" />
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="font-bold text-red-400">Wrong!</span> Better luck next time. Try rotating to a new query!
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={nextQuiz}
                  id="next-quiz-btn"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-display font-bold transition-all text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Next Trivia Question</span>
                </button>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
