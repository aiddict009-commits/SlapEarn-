import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2, VolumeX, Award, Clock, ArrowLeft, RotateCw, CheckCircle, Sparkles, Zap, Flame, ExternalLink, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/sound';
import { AdCampaign, Transaction, UserStats } from '../types';
import { AdsterraBanner, AdsterraNative } from './AdsterraAds';

interface AdsProps {
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  stats?: UserStats;
  updateStatsDirectly?: (newStats: Partial<UserStats>) => void;
  onBack?: () => void;
}

const CAMPAIGNS: AdCampaign[] = [
  {
    id: 'ad-1',
    title: 'DexiTrade Crypto Broker',
    advertiser: 'Adsterra Network',
    tagline: 'Trade cryptos with zero fees and 100x leverage. Free $10 signup bonus!',
    duration: 10,
    reward: 35,
    accentColor: '#10b981', // emerald
    logo: '📈'
  },
  {
    id: 'ad-2',
    title: 'HyperStrike: Shadow Raid',
    advertiser: 'MyBid Network',
    tagline: 'Defend your guild! Unlock legendary warriors & claim epic tier loot. Play FREE!',
    duration: 12,
    reward: 45,
    accentColor: '#f59e0b', // amber
    logo: '⚔️'
  },
  {
    id: 'ad-3',
    title: 'SolaVolt Solar Cells',
    advertiser: 'Adsterra Network',
    tagline: 'Harness clean energy for your home with $0 down. Check tax credit limits!',
    duration: 8,
    reward: 25,
    accentColor: '#06b6d4', // cyan
    logo: '☀️'
  },
  {
    id: 'ad-4',
    title: 'QuantumPay Virtual Card',
    advertiser: 'MyBid Network',
    tagline: 'Get instant virtual debit cards with 3% cashback on all online purchases!',
    duration: 10,
    reward: 40,
    accentColor: '#a855f7', // purple
    logo: '💳'
  },
  {
    id: 'ad-5',
    title: 'CyberRacer Nitro',
    advertiser: 'Adsterra Network',
    tagline: 'High-octane neon racing with 50+ custom hypercars! Race online now!',
    duration: 14,
    reward: 50,
    accentColor: '#ff2b6d', // pink
    logo: '🏎️'
  },
  {
    id: 'ad-6',
    title: 'MyBid High eCPM Partner Reel',
    advertiser: 'MyBid Network',
    tagline: 'Unlock double slap refill speeds & 2x wheel spin multipliers for 24h!',
    duration: 15,
    reward: 60,
    accentColor: '#ffd043', // yellow
    logo: '👑'
  }
];

export default function Ads({ updateCoinsAndXp, addNotification, stats, updateStatsDirectly, onBack }: AdsProps) {
  const [activeAd, setActiveAd] = useState<AdCampaign | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isAdMuted, setIsAdMuted] = useState<boolean>(false);
  const [adFinished, setAdFinished] = useState<boolean>(false);

  // Banner Ad State
  const [bannerClaimed, setBannerClaimed] = useState<boolean>(false);
  const [bannerTimer, setBannerTimer] = useState<number>(15);

  // Chart values for crypto ad
  const [cryptoChart, setCryptoChart] = useState<number[]>([40, 45, 42, 48, 44, 52, 50]);
  
  // Game animation state for RPG ad
  const [warriorState, setWarriorState] = useState<'idle' | 'attack'>('idle');
  const [monsterHealth, setMonsterHealth] = useState<number>(100);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const watchedToday = stats?.adsWatchedToday ?? 0;
  const lifetimeWatched = stats?.totalAdsWatchedLifetime ?? 0;

  // Banner countdown
  useEffect(() => {
    let bInterval: NodeJS.Timeout;
    if (!bannerClaimed && bannerTimer > 0) {
      bInterval = setInterval(() => {
        setBannerTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(bInterval);
  }, [bannerClaimed, bannerTimer]);

  // Animate mock ad elements while playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeAd) {
      interval = setInterval(() => {
        if (activeAd.id === 'ad-1') {
          setCryptoChart((prev) => {
            const next = [...prev.slice(1)];
            const change = Math.floor(Math.random() * 20) - 8;
            next.push(Math.max(20, Math.min(100, prev[prev.length - 1] + change)));
            return next;
          });
        } else if (activeAd.id === 'ad-2') {
          setWarriorState('attack');
          setMonsterHealth((prev) => Math.max(10, prev - 15));
          sound.playSlap();
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
    if (watchedToday >= 20) {
      sound.playError();
      addNotification('Daily Ad Limit Reached', 'You have watched the maximum 20 ads for today! Resetting tomorrow.', 'info');
      return;
    }

    setActiveAd(campaign);
    setTimeLeft(campaign.duration);
    setIsPlaying(true);
    setAdFinished(false);
    setMonsterHealth(100);
    sound.playSuccess();
    addNotification('Ad Loading...', `Playing "${campaign.title}". Watch for full payout!`, 'info');
  };

  const handleCompleteAd = () => {
    if (!activeAd) return;
    setIsPlaying(false);
    setAdFinished(true);

    const nextToday = watchedToday + 1;
    const nextLifetime = lifetimeWatched + 1;
    const currentSlapsToday = stats?.slapsToday ?? 0;
    const nextSlapsToday = Math.max(0, currentSlapsToday - 3);

    // Sync stats directly
    if (updateStatsDirectly) {
      updateStatsDirectly({
        adsWatchedToday: nextToday,
        totalAdsWatchedLifetime: nextLifetime,
        slapsToday: nextSlapsToday
      });
    }

    // Credit coins & XP
    updateCoinsAndXp(activeAd.reward, 15, 'Ad', `Watched Video Ad: ${activeAd.title}`);
    sound.playCoin();
    addNotification(
      '🎉 Ad Reward Credited!',
      `Watched ${activeAd.title}! Earned +${activeAd.reward} SP, +15 XP & +3 Slaps Refilled! (${nextToday}/20 today)`,
      'success'
    );
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setActiveAd(null);
    setAdFinished(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClaimBannerAd = () => {
    if (bannerClaimed) return;
    setBannerClaimed(true);
    sound.playCoin();
    updateCoinsAndXp(2, 5, 'Ad', 'Banner Ad Impression Bonus');
    addNotification('Banner Bonus Claimed!', 'Earned +2 SP for viewing partner banner ad!', 'success');
  };

  return (
    <div className="bg-[#FDFBF2] rounded-[28px] border-4 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]" id="ads-hub">
      <AnimatePresence mode="wait">
        {!activeAd ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="p-1.5 bg-white border-2 border-slate-900 rounded-xl hover:bg-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-900" />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-black text-slate-950 flex items-center gap-1.5">
                    <Play className="w-5 h-5 text-[#FF3B77] fill-[#FF3B77]" />
                    <span>Video Ads Hub</span>
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500">
                    Watch partner commercials to refill slaps & earn SP
                  </p>
                </div>
              </div>

              <div className="bg-[#FFD043] border-2 border-slate-900 px-3 py-1 rounded-xl text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                {watchedToday} / 20 Today
              </div>
            </div>

            {/* Adsterra Banner Ad */}
            <AdsterraBanner />

            {/* Adsterra Native Ad */}
            <AdsterraNative />

            {/* Simulated Banner Ad Widget */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 border-3 border-slate-900 rounded-2xl p-3 text-white shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">SPONSOR BANNER</span>
                    <span className="text-xs font-black">Apex Cloud VPS 2026</span>
                  </div>
                  <p className="text-[10px] text-purple-100 font-bold mt-0.5">
                    Deploy high performance cloud instances for $1/mo.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClaimBannerAd}
                disabled={bannerClaimed || bannerTimer > 0}
                className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-black transition-all ${
                  bannerClaimed
                    ? 'bg-emerald-400 text-slate-950 border-slate-900'
                    : bannerTimer > 0
                    ? 'bg-purple-900 text-purple-300 border-purple-800'
                    : 'bg-[#FFD043] hover:bg-yellow-300 text-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-95'
                }`}
              >
                {bannerClaimed ? '✓ Claimed (+2 SP)' : bannerTimer > 0 ? `${bannerTimer}s...` : 'Claim +2 SP'}
              </button>
            </div>

            {/* Campaign Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAMPAIGNS.map((camp) => (
                <div
                  key={camp.id}
                  id={`ad-card-${camp.id}`}
                  className="bg-white rounded-2xl border-3 border-slate-900 p-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{camp.logo}</span>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-900"
                        style={{ backgroundColor: `${camp.accentColor}25`, color: '#0f172a' }}
                      >
                        ⏱️ {camp.duration}s Reel
                      </span>
                    </div>

                    <h3 className="font-black text-sm text-slate-950 leading-snug">
                      {camp.title}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {camp.tagline}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-slate-100">
                    <div className="flex items-center gap-1 text-xs font-black text-[#FF3B77]">
                      <Award className="w-4 h-4 stroke-[2.5px]" />
                      <span>+{camp.reward} SP & +3 Slaps</span>
                    </div>

                    <button
                      onClick={() => handleStartAd(camp)}
                      disabled={watchedToday >= 20}
                      id={`watch-ad-${camp.id}`}
                      className={`px-3.5 py-1.5 font-black text-xs rounded-xl border-2 border-slate-900 transition-all flex items-center gap-1 ${
                        watchedToday >= 20
                          ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                          : 'bg-[#FF3B77] hover:bg-pink-600 text-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:scale-95'
                      }`}
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
          /* Live Video Ad Player Screen */
          <motion.div
            key="player"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full"
            id="ad-player-box"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-slate-900">
              <button
                onClick={handleClosePlayer}
                disabled={isPlaying}
                id="exit-ad-player-btn"
                className={`flex items-center gap-1 text-xs font-black ${
                  isPlaying ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900 hover:text-[#FF3B77]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Ads</span>
              </button>

              <span className="text-xs font-black bg-[#FFD043] border-2 border-slate-900 px-2.5 py-0.5 rounded-full text-slate-950 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-slate-950" />
                <span>Payout: +{activeAd.reward} SP</span>
              </span>
            </div>

            {/* Virtual Video Screen Frame */}
            <div className="relative bg-slate-950 rounded-2xl border-4 border-slate-900 overflow-hidden aspect-video shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between p-4 text-white">
              
              {/* Overlay header controls */}
              <div className="flex justify-between items-center z-10">
                <span className="text-[10px] bg-red-600 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  <span>Sponsor Live</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAdMuted(!isAdMuted)}
                    className="p-1 bg-slate-900/90 text-slate-200 rounded-full border border-slate-700"
                  >
                    {isAdMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-xs bg-slate-900 text-white font-mono font-black px-2.5 py-1 rounded-full border border-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>{timeLeft}s</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Interactive Ad Visual Animations */}
              <div className="absolute inset-0 flex items-center justify-center p-4 z-0">
                
                {/* 1. DexiTrade Crypto */}
                {activeAd.id === 'ad-1' && (
                  <div className="w-full flex flex-col items-center">
                    <span className="text-4xl animate-bounce">📈</span>
                    <h4 className="font-black text-emerald-400 text-sm mt-1">DexiTrade Live Indexes</h4>
                    <div className="flex items-end gap-1.5 w-48 h-16 mt-2 border-b border-emerald-500/40">
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

                {/* 2. RPG Slasher */}
                {activeAd.id === 'ad-2' && (
                  <div className="w-full flex items-center justify-around max-w-xs">
                    <div className="text-center">
                      <motion.div
                        animate={warriorState === 'attack' ? { x: [0, 30, 0] } : {}}
                        transition={{ duration: 0.2 }}
                        className="text-4xl"
                      >
                        ⚔️
                      </motion.div>
                      <span className="text-[9px] text-slate-400 font-mono">Paladin Lvl 99</span>
                    </div>

                    <div className="text-xl font-black text-amber-500 animate-pulse">VS</div>

                    <div className="text-center">
                      <motion.div
                        animate={warriorState === 'attack' ? { x: [0, 5, -5, 0], scale: [1, 0.9, 1] } : {}}
                        transition={{ duration: 0.2 }}
                        className="text-4xl"
                      >
                        👹
                      </motion.div>
                      <div className="w-12 bg-slate-800 h-1 rounded-full overflow-hidden mt-1 mx-auto">
                        <div className="bg-red-500 h-full transition-all" style={{ width: `${monsterHealth}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Solar cells */}
                {activeAd.id === 'ad-3' && (
                  <div className="text-center flex flex-col items-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="text-5xl text-yellow-400"
                    >
                      ☀️
                    </motion.div>
                    <h4 className="font-black text-cyan-400 text-sm mt-2">SolaVolt Eco Power</h4>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">
                      Clean solar energy with $0 down setup!
                    </p>
                  </div>
                )}

                {/* 4. Quantum Card */}
                {activeAd.id === 'ad-4' && (
                  <div className="text-center flex flex-col items-center">
                    <div className="w-40 h-24 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl border-2 border-white/20 p-3 flex flex-col justify-between shadow-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold">QUANTUM</span>
                        <span className="text-xs">💳</span>
                      </div>
                      <span className="font-mono text-xs tracking-widest text-left">•••• 4829</span>
                    </div>
                    <h4 className="font-black text-purple-300 text-xs mt-2">Instant Virtual Cards</h4>
                  </div>
                )}

                {/* 5. CyberRacer */}
                {activeAd.id === 'ad-5' && (
                  <div className="text-center flex flex-col items-center">
                    <motion.div
                      animate={{ x: [-20, 20, -20] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-5xl"
                    >
                      🏎️
                    </motion.div>
                    <h4 className="font-black text-pink-400 text-xs mt-2">CyberRacer Nitro Online</h4>
                  </div>
                )}

                {/* 6. VIP Pass */}
                {activeAd.id === 'ad-6' && (
                  <div className="text-center flex flex-col items-center">
                    <span className="text-5xl animate-bounce">👑</span>
                    <h4 className="font-black text-amber-300 text-sm mt-1">SlapEarn VIP Partner</h4>
                    <p className="text-[10px] text-amber-100 mt-0.5">Refill slaps 2x faster!</p>
                  </div>
                )}
              </div>

              {/* Bottom Info bar */}
              <div className="z-10 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-xs text-white">{activeAd.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{activeAd.tagline}</p>
                </div>

                {!isPlaying && adFinished ? (
                  <button
                    onClick={handleClosePlayer}
                    id="ad-collect-reward-btn"
                    className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black rounded-lg transition-all"
                  >
                    Collect SP
                  </button>
                ) : (
                  <span className="text-[9px] font-mono text-slate-400">
                    Watching Commercial...
                  </span>
                )}
              </div>

              {/* Completion Overlay */}
              {!isPlaying && adFinished && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center border-2 border-slate-900 mb-2 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    <CheckCircle className="w-7 h-7 stroke-[2.5px]" />
                  </div>
                  <h4 className="text-base font-black text-white">Ad Watched Completely!</h4>
                  <p className="text-slate-300 text-xs mt-1">
                    Credited <strong>+{activeAd.reward} SP & +3 Slaps Refilled</strong>!
                  </p>
                  <button
                    onClick={handleClosePlayer}
                    id="finish-and-exit-ad-btn"
                    className="mt-3 px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-black text-xs border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] active:scale-95 transition-all"
                  >
                    Back to Video Ads
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

