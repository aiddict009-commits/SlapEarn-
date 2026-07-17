import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2, VolumeX, ShieldAlert, Award, Clock, ArrowLeft, RotateCw, CheckCircle } from 'lucide-react';
import { sound } from '../utils/sound';
import { AdCampaign, Transaction } from '../types';

interface AdsProps {
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

const CAMPAIGNS: AdCampaign[] = [
  {
    id: 'ad-1',
    title: 'DexiTrade Crypto Broker',
    advertiser: 'DexiTrade Corp',
    tagline: 'Trade cryptos with zero fees and 100x leverage. Get a free signup bonus today!',
    duration: 10,
    reward: 35,
    accentColor: '#10b981', // emerald
    logo: '📈'
  },
  {
    id: 'ad-2',
    title: 'HyperStrike: Shadow Raid',
    advertiser: 'Rogue Byte Games',
    tagline: 'Defend your guild! Unlock legendary warriors & claim epic tier loot. Play FREE today!',
    duration: 12,
    reward: 45,
    accentColor: '#f59e0b', // amber
    logo: '⚔️'
  },
  {
    id: 'ad-3',
    title: 'SolaVolt Solar Cells',
    advertiser: 'SolaVolt Green Tech',
    tagline: 'Harness clean energy for your home with $0 down. Find your solar tax credit limits now!',
    duration: 8,
    reward: 25,
    accentColor: '#06b6d4', // cyan
    logo: '☀️'
  }
];

export default function Ads({ updateCoinsAndXp, addNotification }: AdsProps) {
  const [activeAd, setActiveAd] = useState<AdCampaign | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isAdMuted, setIsAdMuted] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [adFinished, setAdFinished] = useState<boolean>(false);

  // Chart values for the crypto ad animation
  const [cryptoChart, setCryptoChart] = useState<number[]>([40, 45, 42, 48, 44, 52, 50]);
  
  // Game animation state for the RPG ad
  const [warriorState, setWarriorState] = useState<'idle' | 'attack'>('idle');
  const [monsterHealth, setMonsterHealth] = useState<number>(100);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animate mock ad elements while playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeAd) {
      interval = setInterval(() => {
        if (activeAd.id === 'ad-1') {
          // Crypto graph spikes
          setCryptoChart((prev) => {
            const next = [...prev.slice(1)];
            const change = Math.floor(Math.random() * 20) - 8;
            next.push(Math.max(20, Math.min(100, prev[prev.length - 1] + change)));
            return next;
          });
        } else if (activeAd.id === 'ad-2') {
          // RPG slashing triggers
          setWarriorState('attack');
          setMonsterHealth((prev) => Math.max(10, prev - 15));
          sound.playSlap(); // Use slap sound for hit
          setTimeout(() => setWarriorState('idle'), 250);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeAd]);

  // Handle countdown
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      handleCompleteAd();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, timeLeft]);

  const handleStartAd = (campaign: AdCampaign) => {
    setActiveAd(campaign);
    setTimeLeft(campaign.duration);
    setIsPlaying(true);
    setAdFinished(false);
    setMonsterHealth(100);
    sound.playSuccess();
    addNotification('Ad Loading...', 'Simulated advertisement starting. Please wait for the timer.', 'info');
  };

  const handleCompleteAd = () => {
    if (!activeAd) return;
    setIsPlaying(false);
    setAdFinished(true);
    setCompletedCount((prev) => prev + 1);

    // Credit reward
    updateCoinsAndXp(activeAd.reward, 15, 'Ad', `Watched ad: ${activeAd.title}`);
    sound.playCoin();
    addNotification('Ad Reward Credited!', `Watched ${activeAd.title} completely! Earned +${activeAd.reward} Coins & +15 XP!`, 'success');
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setActiveAd(null);
    setAdFinished(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleResetLimit = () => {
    setCompletedCount(0);
    sound.playSuccess();
    addNotification('Ads Refreshed!', 'Daily viewing thresholds reset! High payout campaigns are online.', 'info');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="ads-tab">
      <AnimatePresence mode="wait">
        {!activeAd ? (
          /* Ad Listing View */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-display font-semibold tracking-wide text-sm uppercase">
                  <Play className="w-5 h-5 text-cyan-400 fill-cyan-400 stroke-none animate-pulse" />
                  <span>Sponsor Video Campaigns</span>
                </div>
                <h2 className="text-2xl font-bold font-display text-white mt-1">Watch & Earn Hub</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Watch quick simulated commercial reels from our external partners. Zero delays, full payouts.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  Watched Today: <span className="text-white font-bold">{completedCount} / 10</span>
                </span>
                {completedCount > 0 && (
                  <button
                    onClick={handleResetLimit}
                    id="reset-ads-limit-btn"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg hover:text-white transition-colors"
                    title="Reset ads limit"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Campaign Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {CAMPAIGNS.map((camp) => (
                <div
                  key={camp.id}
                  id={`ad-card-${camp.id}`}
                  className="bg-slate-950/40 hover:bg-slate-950 p-5 rounded-2xl border border-slate-850 hover:border-slate-700 transition-all flex flex-col justify-between h-56"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{camp.logo}</span>
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${camp.accentColor}15`, color: camp.accentColor }}
                      >
                        {camp.duration}s Ads
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-white leading-snug">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {camp.tagline}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-900">
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-500">
                      <Award className="w-4 h-4" />
                      <span>+{camp.reward} Coins</span>
                    </div>

                    <button
                      onClick={() => handleStartAd(camp)}
                      id={`watch-ad-${camp.id}`}
                      className="px-4 py-2 bg-slate-800 hover:bg-white hover:text-slate-950 font-display font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 text-white"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Live simulated video ad player */
          <motion.div
            key="player"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto"
            id="ad-player-box"
          >
            {/* Player Header */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
              <button
                onClick={handleClosePlayer}
                disabled={isPlaying}
                id="exit-ad-player-btn"
                className={`flex items-center gap-1.5 text-sm font-display font-medium ${
                  isPlaying ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white transition-all'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-slate-950 text-amber-500 rounded-lg border border-slate-850 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Payout: +{activeAd.reward} Coins</span>
                </span>
              </div>
            </div>

            {/* Virtual Screen Layer */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video border border-slate-850 shadow-2xl flex flex-col justify-between p-6">
              
              {/* Ad Status Bars */}
              <div className="flex justify-between items-center z-10">
                <span className="text-xs bg-slate-900/90 text-slate-400 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="font-mono">Live Broadcast</span>
                </span>

                {/* Simulated Timer Counter */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAdMuted(!isAdMuted)}
                    className="p-1.5 bg-slate-900/90 text-slate-300 backdrop-blur-md rounded-full border border-slate-800 hover:text-white transition-colors"
                  >
                    {isAdMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="text-xs bg-slate-900/90 text-white font-mono font-bold backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeLeft}s</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Simulated Ad Content Screens */}
              <div className="absolute inset-0 flex items-center justify-center p-6 z-0">
                
                {/* 1. DexiTrade Graph Ad Animation */}
                {activeAd.id === 'ad-1' && (
                  <div className="w-full h-1/2 flex flex-col items-center justify-center">
                    <div className="text-center mb-4">
                      <span className="text-5xl animate-bounce inline-block">📈</span>
                      <h4 className="font-display font-black text-xl text-emerald-400 mt-2">DexiTrade Live Indexes</h4>
                      <p className="text-xs text-slate-500">Real-time simulated high speed leverage tracking</p>
                    </div>

                    {/* Interactive vector chart lines */}
                    <div className="flex items-end gap-1.5 w-64 h-20 px-2 border-b border-emerald-500/20">
                      {cryptoChart.map((val, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ height: '0%' }}
                          animate={{ height: `${val}%` }}
                          transition={{ duration: 0.3 }}
                          className="flex-1 bg-emerald-500 rounded-t"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. RPG Slasher Ad Animation */}
                {activeAd.id === 'ad-2' && (
                  <div className="w-full flex items-center justify-around max-w-md">
                    {/* Character */}
                    <div className="text-center flex flex-col items-center">
                      <motion.div
                        animate={warriorState === 'attack' ? { x: [0, 45, 0] } : {}}
                        transition={{ duration: 0.2 }}
                        className="text-5xl"
                      >
                        ⚔️
                      </motion.div>
                      <span className="text-[10px] text-slate-500 font-mono mt-2">Level 99 Paladin</span>
                    </div>

                    <div className="text-2xl font-black font-display text-amber-500 animate-pulse">VS</div>

                    {/* Enemy Boss */}
                    <div className="text-center flex flex-col items-center">
                      <motion.div
                        animate={warriorState === 'attack' ? { x: [0, 10, -5, 0], scale: [1, 0.9, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className="text-5xl"
                      >
                        👹
                      </motion.div>
                      {/* Boss Health Bar */}
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-red-500 h-full transition-all duration-200" style={{ width: `${monsterHealth}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Solar cells Rotating Sun Ad */}
                {activeAd.id === 'ad-3' && (
                  <div className="text-center flex flex-col items-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                      className="text-6xl text-yellow-400 filter drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                    >
                      ☀️
                    </motion.div>
                    <h4 className="font-display font-bold text-lg text-cyan-400 mt-4">SolaVolt Eco Power Cells</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      $0 initial deposits. Save over 45% on monthly utility tariffs instantly.
                    </p>
                  </div>
                )}
              </div>

              {/* Ad Footer Info */}
              <div className="z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-xs text-white">{activeAd.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{activeAd.tagline}</p>
                </div>

                {!isPlaying && adFinished ? (
                  <button
                    onClick={handleClosePlayer}
                    id="ad-collect-reward-btn"
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-display font-black rounded-lg transition-all"
                  >
                    Collect Coins
                  </button>
                ) : (
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">
                    {isPlaying ? 'Sponsor Ad playing' : 'Standby'}
                  </span>
                )}
              </div>

              {/* Large success prompt inside player on complete */}
              {!isPlaying && adFinished && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-7 h-7 stroke-[2px]" />
                  </div>
                  <h4 className="text-lg font-bold text-white font-display">Ad Watched Completely!</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Your wallet was successfully credited with <strong>+{activeAd.reward} Coins</strong>.
                  </p>
                  <button
                    onClick={handleClosePlayer}
                    id="finish-and-exit-ad-btn"
                    className="mt-4 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all text-xs font-display"
                  >
                    Back to Ads Hub
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
