import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayCircle, RotateCw, ClipboardList, Users, Hand, X, Gift, Trophy, Sparkles, Clock } from 'lucide-react';
import { UserStats, Transaction } from '../types';
import { sound } from '../utils/sound';

interface EarnViewProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

export default function EarnView({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification }: EarnViewProps) {
  const [activeModal, setActiveModal] = useState<'ad' | 'wheel' | 'survey' | 'referral' | null>(null);

  // Video Ad states
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);
  const [adFinished, setAdFinished] = useState<boolean>(false);

  // Wheel states
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinDegrees, setSpinDegrees] = useState<number>(0);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [isPointerWobbling, setIsPointerWobbling] = useState<boolean>(false);

  // Wheel Cooldown tracking state
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  const lastSpinTime = stats.lastWheelSpin ? new Date(stats.lastWheelSpin).getTime() : 0;
  const timeSinceLastSpin = now - lastSpinTime;
  const isWheelOnCooldown = timeSinceLastSpin < COOLDOWN_MS;
  const cooldownRemaining = COOLDOWN_MS - timeSinceLastSpin;

  const formatRemainingTime = (ms: number) => {
    if (ms <= 0) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  // Survey states
  const [surveyStep, setSurveyStep] = useState<number>(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Referral states
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Start Video Ad
  const startAd = () => {
    const currentWatched = stats.adsWatchedToday ?? 0;
    if (currentWatched >= 20) {
      sound.playError();
      addNotification('Daily Ad Limit Reached', 'You can only watch 20 ads per day.', 'info');
      return;
    }

    sound.playSlap();
    setActiveModal('ad');
    setIsAdPlaying(true);
    setAdFinished(false);
    setAdCountdown(5);

    let remaining = 5;
    const timer = setInterval(() => {
      remaining -= 1;
      setAdCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        setIsAdPlaying(false);
        setAdFinished(true);
        sound.playSuccess();
        // Decrement slapsToday by 3 (which increases available slaps by 3)
        // Increment adsWatchedToday by 1
        updateStatsDirectly({
          slapsToday: Math.max(0, stats.slapsToday - 3),
          adsWatchedToday: (stats.adsWatchedToday ?? 0) + 1
        });
        addNotification('Ad Completed!', '+3 slaps available!', 'success');
      }
    }, 1000);
  };

  // Start Wheel Spin
  const startSpin = () => {
    if (isSpinning) return;
    
    // 5-hour cooldown check
    if (isWheelOnCooldown) {
      sound.playError();
      addNotification('Lucky Wheel Cooldown', 'You can only spin once every 5 hours!', 'info');
      return;
    }

    sound.playSlap();
    setIsSpinning(true);
    setSpinResult(null);

    // Save spin timestamp right now
    updateStatsDirectly({
      lastWheelSpin: new Date().toISOString()
    });

    // Let's divide into 6 segments:
    // 0-60: +10 SP (Segment 0)
    // 61-120: +5 slaps (Segment 1)
    // 121-180: +20 slaps (Segment 2)
    // 181-240: +15 slaps (Segment 3)
    // 241-300: +25 slaps (Segment 4)
    // 301-360: Try Again (Segment 5)
    const segments = [
      { text: '+10 SP', action: () => updateCoinsAndXp(10, 2, 'Daily Check-in', 'Wheel SP Prize') },
      { text: '+5 slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 5) }) },
      { text: '+20 slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 20) }) },
      { text: '+15 slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 15) }) },
      { text: '+25 slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 25) }) },
      { text: 'Try Again', action: () => {} }
    ];

    // True weighted randomization of land segments:
    // +10 SP: 25% | +5 slaps: 25% | +20 slaps: 15% | +15 slaps: 15% | +25 slaps: 10% | Try Again: 10%
    const weights = [0.25, 0.25, 0.15, 0.15, 0.10, 0.10];
    let r = Math.random();
    let selectedIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        selectedIndex = i;
        break;
      }
    }

    // Add a natural offset so it lands in a natural, organic location within the 60deg slice (e.g. ±12 degrees from center)
    const offset = (Math.random() - 0.5) * 24; 
    const targetAngle = 360 - (selectedIndex * 60) - 30 + offset;
    
    // Accumulate spin rotation starting from current spinDegrees
    const currentRotation = spinDegrees;
    const baseRotation = currentRotation - (currentRotation % 360);
    const totalRotation = baseRotation + 2880 + targetAngle;
    setSpinDegrees(totalRotation);

    // Dynamic mechanical click synthesizer for incredible realistic feedback
    const playClick = () => {
      if (sound.getMuteStatus()) return;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.02);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } catch (e) {}
    };

    // Slowing click sequence simulation matching ease-out
    let tickDelay = 35;
    const runTicks = () => {
      if (tickDelay > 650) return;
      playClick();
      setIsPointerWobbling(true);
      setTimeout(() => setIsPointerWobbling(false), Math.min(tickDelay / 2, 60));
      tickDelay = tickDelay * 1.115;
      setTimeout(runTicks, tickDelay);
    };
    runTicks();

    setTimeout(() => {
      setIsSpinning(false);
      setSpinResult(segments[selectedIndex].text);
      segments[selectedIndex].action();
      sound.playSuccess();
      addNotification('Lucky Spin Winner!', `You won: ${segments[selectedIndex].text}!`, 'success');
    }, 5000);
  };

  // Submit Survey step
  const submitSurveyStep = () => {
    if (!selectedAnswer) return;
    sound.playSlap();

    if (surveyStep < 3) {
      setSurveyStep(surveyStep + 1);
      setSelectedAnswer(null);
    } else {
      // Completed survey!
      updateCoinsAndXp(50, 10, 'Survey', 'Finished Micro-Survey');
      sound.playSuccess();
      setActiveModal(null);
      addNotification('Survey Completed!', 'Earned +50 SP!', 'success');
      // Reset
      setSurveyStep(1);
      setSelectedAnswer(null);
    }
  };

  // Handle Copy Referral
  const copyReferral = () => {
    navigator.clipboard.writeText('https://slapearn.app/ref/' + stats.coins);
    setIsCopied(true);
    sound.playSuccess();
    addNotification('Link Copied!', '+100 SP Referral Bonus Added!', 'success');
    updateCoinsAndXp(100, 5, 'Offerwall', 'Invite Link Copy Bonus');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col text-slate-900 select-none pb-8" id="earn-view">
      
      {/* Title */}
      <div className="pl-1 mb-2.5">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Earn more
        </h2>
      </div>

      {/* Banner Card matching the screenshot style */}
      <div 
        className="bg-[#FFEED1] rounded-[24px] border-4 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center mb-3.5"
        id="earn-banner-alert"
      >
        <p className="text-[#845309] font-black text-[13px] leading-snug flex items-start gap-2">
          <Hand className="w-5 h-5 text-[#845309] stroke-[2.5px] shrink-0 mt-0.5" />
          <span>
            Ads & the wheel refill your slaps. Surveys, offerwalls & referrals pay SP straight to your wallet.
          </span>
        </p>
      </div>

      {/* Earn Tasks List Container */}
      <div className="flex flex-col gap-2.5">
        
        {/* TASK 1: Watch video ad */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-[#FF3B77] border-4 border-slate-900 rounded-[20px] flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
              <PlayCircle className="w-7 h-7 text-white stroke-[2.5px]" />
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-slate-950 font-black text-[15px] sm:text-[16px] leading-tight">Watch a video ad</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[#FF3B77] font-black text-[13px]">+3 slaps</span>
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  Watched today: {stats.adsWatchedToday ?? 0}/20
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={startAd}
            disabled={(stats.adsWatchedToday ?? 0) >= 20}
            className={`font-black text-sm px-5 py-2 rounded-[16px] border-3 border-slate-900 text-slate-950 transition-all ${
              (stats.adsWatchedToday ?? 0) >= 20
                ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed shadow-none'
                : 'bg-white hover:bg-[#FFEED1] active:scale-95 shadow-[1.5px_2px_0px_0px_rgba(15,23,42,1)]'
            }`}
          >
            {(stats.adsWatchedToday ?? 0) >= 20 ? 'Full' : 'Start'}
          </button>
        </div>

        {/* TASK 2: Spin the wheel */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-[#FFD043] border-4 border-slate-900 rounded-[20px] flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
              <RotateCw className="w-7 h-7 text-slate-950 stroke-[2.5px]" />
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-slate-950 font-black text-[15px] sm:text-[16px] leading-tight">Spin the wheel</span>
              <div className="flex flex-col mt-0.5">
                <span className="text-[#FF3B77] font-black text-[12px]">Bonus prizes</span>
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  1 spin every 5 hours
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => { sound.playSlap(); setActiveModal('wheel'); }}
            className={`font-black text-xs px-4 py-2 rounded-[16px] border-3 border-slate-900 text-slate-950 active:scale-95 transition-all shadow-[1.5px_2px_0px_0px_rgba(15,23,42,1)] ${
              isWheelOnCooldown 
                ? 'bg-[#FFF0F4] border-slate-400 hover:bg-[#FFE5EC] text-[#FF2B6D]' 
                : 'bg-white hover:bg-[#FFEED1]'
            }`}
          >
            {isWheelOnCooldown ? formatRemainingTime(cooldownRemaining) : 'Start'}
          </button>
        </div>

        {/* TASK 3: Complete a survey */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-[#4965FF] border-4 border-slate-900 rounded-[20px] flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
              <ClipboardList className="w-7 h-7 text-white stroke-[2.5px]" />
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-slate-950 font-black text-[15px] sm:text-[16px] leading-tight">Complete a survey</span>
              <span className="text-slate-400 font-black text-[13px] mt-0.5">+50 SP</span>
            </div>
          </div>

          <button
            onClick={() => { sound.playSlap(); setActiveModal('survey'); }}
            className="font-black text-sm px-5 py-2 rounded-[16px] border-3 border-slate-900 bg-white hover:bg-[#FFEED1] text-slate-950 active:scale-95 transition-all"
          >
            Start
          </button>
        </div>

        {/* TASK 4: Referrals */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-[#A855F7] border-4 border-slate-900 rounded-[20px] flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
              <Users className="w-7 h-7 text-white stroke-[2.5px]" />
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-slate-950 font-black text-[15px] sm:text-[16px] leading-tight">Invite friends</span>
              <span className="text-slate-400 font-black text-[13px] mt-0.5">+100 SP</span>
            </div>
          </div>

          <button
            onClick={() => { sound.playSlap(); setActiveModal('referral'); }}
            className="font-black text-sm px-5 py-2 rounded-[16px] border-3 border-slate-900 bg-white hover:bg-[#FFEED1] text-slate-950 active:scale-95 transition-all"
          >
            Start
          </button>
        </div>

      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isAdPlaying && !isSpinning) setActiveModal(null); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900"
            >
              
              {/* Close Button */}
              {!isAdPlaying && !isSpinning && (
                <button 
                  onClick={() => setActiveModal(null)}
                  className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                >
                  <X className="w-5 h-5 text-slate-900" />
                </button>
              )}

              {/* 1. VIDEO AD MODAL */}
              {activeModal === 'ad' && (
                <div className="flex flex-col items-center py-4">
                  {isAdPlaying ? (
                    <>
                      <div className="w-16 h-16 bg-[#FF3B77] text-white rounded-full flex items-center justify-center animate-bounce border-3 border-slate-900 mb-4 shadow-[2px_2.5px_0px_0px_#000]">
                        <PlayCircle className="w-9 h-9" />
                      </div>
                      <h3 className="text-xl font-black text-slate-950">Watching Sponsor Ad</h3>
                      <p className="text-slate-500 font-bold text-xs mt-2 text-center leading-relaxed">
                        Hold tight! Your slap refill will trigger in:
                      </p>
                      
                      {/* Big clock ticker */}
                      <div className="flex items-center gap-2 mt-6 bg-[#FFEAF0] border-3 border-slate-900 px-6 py-3 rounded-2xl text-2xl font-black text-[#FF3B77] shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
                        <Clock className="w-6 h-6 stroke-[3px] animate-spin" />
                        <span>{adCountdown}s</span>
                      </div>
                    </>
                  ) : adFinished ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center border-3 border-slate-900 mb-4 shadow-[2px_2.5px_0px_0px_#000]">
                        <Sparkles className="w-9 h-9" />
                      </div>
                      <h3 className="text-2xl font-black text-emerald-600 text-center">Reward Unlocked!</h3>
                      <p className="text-slate-600 font-bold text-sm mt-2 text-center leading-relaxed px-2">
                        You successfully refilled <strong className="text-slate-900 font-black">+3 slaps available</strong> for today. Go slap!
                      </p>
                      <button
                        onClick={() => setActiveModal(null)}
                        className="mt-6 w-full font-black text-sm py-3 rounded-2xl border-4 border-slate-900 bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
                      >
                        Awesome!
                      </button>
                    </>
                  ) : null}
                </div>
              )}

              {/* 2. SPIN THE WHEEL MODAL */}
              {activeModal === 'wheel' && (
                <div className="flex flex-col items-center py-3 overflow-visible">
                  {/* Inline CSS styling for smooth animations and blinks */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes light-blink-even {
                      0%, 100% { background-color: #FFF; box-shadow: 0 0 4px #FFF, 0 0 8px #FFF; }
                      50% { background-color: #FFD043; box-shadow: 0 0 10px #FFD043, 0 0 16px #FFD043; }
                    }
                    @keyframes light-blink-odd {
                      0%, 100% { background-color: #FFD043; box-shadow: 0 0 10px #FFD043, 0 0 16px #FFD043; }
                      50% { background-color: #FFF; box-shadow: 0 0 4px #FFF, 0 0 8px #FFF; }
                    }
                    @keyframes float-gentle {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-3px); }
                    }
                    @keyframes bounce-slow {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-4px); }
                    }
                    .animate-bounce-slow {
                      animation: bounce-slow 2s ease-in-out infinite;
                    }
                  `}} />

                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">Lucky Wheel</h3>
                  <p className="text-slate-500 font-bold text-xs text-center mt-1 mb-8">
                    Spin daily to claim free slaps and SP!
                  </p>

                  {/* High Quality Arcade Wheel Frame */}
                  <div className="relative w-72 h-72 rounded-full border-6 border-slate-950 bg-slate-900 shadow-[0_10px_0_0_#0f172a,0_16px_28px_rgba(15,23,42,0.25)] flex items-center justify-center overflow-visible select-none animate-[float-gentle_4s_ease-in-out_infinite]">
                    
                    {/* Blinking outer lights (12 lightbulbs) */}
                    {[...Array(12)].map((_, i) => {
                      const angle = i * 30;
                      return (
                        <div
                          key={i}
                          className="absolute w-2 h-2 rounded-full border border-slate-950/20 z-10"
                          style={{
                            transform: `rotate(${angle}deg) translateY(-134px)`,
                            animation: i % 2 === 0 ? 'light-blink-even 0.8s infinite' : 'light-blink-odd 0.8s infinite',
                          }}
                        />
                      );
                    })}

                    {/* Pointer arrow with wobble animation */}
                    <motion.div
                      animate={{ rotate: isPointerWobbling ? [180, 162, 198, 180] : 180 }}
                      transition={{ duration: 0.12, ease: "easeInOut" }}
                      className="absolute -top-4 left-[calc(50%-12px)] w-6 h-9 bg-rose-500 border-3 border-slate-950 rounded-b-2xl z-30 shadow-md origin-top"
                    />

                    {/* Circular segmented wheel with perfect CSS transitions */}
                    <div
                      style={{
                        transform: `rotate(${spinDegrees}deg)`,
                        transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
                        transformOrigin: 'center center'
                      }}
                      className="w-64 h-64 rounded-full border-4 border-slate-950 bg-white shadow-inner overflow-hidden relative flex items-center justify-center z-0"
                    >
                      {/* Segment Lines & labels */}
                      <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#FF3B77 0deg 60deg, #FFD043 60deg 120deg, #4965FF 120deg 180deg, #A855F7 180deg 240deg, #00D09E 240deg 300deg, #FFFDF6 300deg 360deg)' }} />
                      
                      {/* Inner border ring */}
                      <div className="absolute inset-4 rounded-full border-2 border-slate-950/20 pointer-events-none" />

                      {/* Precise overlapping-proof radial text placement */}
                      {[
                        { text: '+10 SP', color: 'text-white' },
                        { text: '+5 Slaps', color: 'text-slate-950' },
                        { text: '+20 Slaps', color: 'text-white' },
                        { text: '+15 Slaps', color: 'text-white' },
                        { text: '+25 Slaps', color: 'text-white' },
                        { text: 'Try Again', color: 'text-slate-950' }
                      ].map((seg, i) => {
                        const angle = i * 60 + 30;
                        return (
                          <span
                            key={i}
                            className={`absolute font-black text-[11px] tracking-tight ${seg.color} drop-shadow-[0_1px_1.5px_rgba(15,23,42,0.15)] select-none`}
                            style={{
                              left: '50%',
                              top: '50%',
                              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-84px)`,
                              transformOrigin: 'center center',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {seg.text}
                          </span>
                        );
                      })}
                    </div>

                    {/* Wheel Center Peg Button */}
                    <button
                      onClick={startSpin}
                      disabled={isSpinning || isWheelOnCooldown}
                      className="absolute w-16 h-16 bg-[#FFFDF6] border-4 border-slate-950 rounded-full flex flex-col items-center justify-center font-black text-slate-950 hover:bg-[#FFEED1] z-20 shadow-[0_4px_0_0_#0f172a] hover:shadow-[0_2px_0_0_#0f172a] active:shadow-none hover:translate-y-[2px] active:translate-y-[4px] disabled:translate-y-0 disabled:shadow-[0_4px_0_0_#0f172a] disabled:opacity-80 active:scale-95 transition-all text-center leading-none"
                    >
                      <span className="text-[11px] font-black tracking-tight text-slate-950">
                        {isSpinning ? 'SPIN' : isWheelOnCooldown ? 'WAIT' : 'SPIN!'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                        {isSpinning ? '...' : isWheelOnCooldown ? '🔒' : 'DAILY'}
                      </span>
                    </button>
                  </div>

                  {/* Winner Display or Cooldown message */}
                  <div className="mt-8 h-12 flex items-center justify-center w-full">
                    {isSpinning ? (
                      <span className="text-xs text-[#FF3B77] font-black uppercase tracking-widest animate-pulse">
                        Best of luck! Spinning...
                      </span>
                    ) : spinResult ? (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#FFEAF0] border-3 border-slate-950 px-6 py-2.5 rounded-full font-black text-[#FF3B77] shadow-[2.5px_3px_0px_0px_rgba(15,23,42,1)]"
                      >
                        🎉 You Won: {spinResult}!
                      </motion.div>
                    ) : isWheelOnCooldown ? (
                      <div className="bg-[#FFE5EC] border-3 border-slate-950 px-5 py-2.5 rounded-full font-black text-[#FF2B6D] flex items-center gap-1.5 shadow-[2.5px_3px_0px_0px_rgba(15,23,42,1)] text-xs animate-bounce-slow">
                        <Clock className="w-4 h-4 text-[#FF2B6D]" />
                        <span>Next spin in: <span className="font-mono font-bold">{formatRemainingTime(cooldownRemaining)}</span></span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">Land on hot items for bonus rewards!</span>
                    )}
                  </div>
                </div>
              )}

              {/* 3. SURVEY MODAL */}
              {activeModal === 'survey' && (
                <div className="flex flex-col py-2">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black bg-[#4965FF] text-white px-3 py-1 rounded-full">
                      Step {surveyStep} of 3
                    </span>
                    <span className="text-xs font-bold text-slate-400">Reward: +50 SP</span>
                  </div>

                  {surveyStep === 1 && (
                    <div>
                      <h4 className="text-lg font-black text-slate-950 leading-tight">
                        How did you find SlapEarn?
                      </h4>
                      <div className="flex flex-col gap-2.5 mt-4">
                        {['Friend invitation', 'Social media (X, Telegram)', 'Search engines', 'Other slappers'].map((ans) => (
                          <button
                            key={ans}
                            onClick={() => setSelectedAnswer(ans)}
                            className={`w-full text-left font-bold text-sm px-4 py-3 rounded-xl border-3 border-slate-900 transition-all ${
                              selectedAnswer === ans ? 'bg-[#FDDF77] text-slate-950' : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {ans}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {surveyStep === 2 && (
                    <div>
                      <h4 className="text-lg font-black text-slate-950 leading-tight">
                        What features do you enjoy most?
                      </h4>
                      <div className="flex flex-col gap-2.5 mt-4">
                        {['Daily check-in bonuses', 'Cute Neko girl mascot', 'Tapping to compete & earn', 'Instant mobile checkouts'].map((ans) => (
                          <button
                            key={ans}
                            onClick={() => setSelectedAnswer(ans)}
                            className={`w-full text-left font-bold text-sm px-4 py-3 rounded-xl border-3 border-slate-900 transition-all ${
                              selectedAnswer === ans ? 'bg-[#FDDF77] text-slate-950' : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {ans}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {surveyStep === 3 && (
                    <div>
                      <h4 className="text-lg font-black text-slate-950 leading-tight">
                        Rate your experience with our Neko Girl mascot:
                      </h4>
                      <div className="flex flex-col gap-2.5 mt-4">
                        {['Absolutely adorable! (10/10)', 'Very cute and responsive', 'Can be improved', 'No strong opinion'].map((ans) => (
                          <button
                            key={ans}
                            onClick={() => setSelectedAnswer(ans)}
                            className={`w-full text-left font-bold text-sm px-4 py-3 rounded-xl border-3 border-slate-900 transition-all ${
                              selectedAnswer === ans ? 'bg-[#FDDF77] text-slate-950' : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {ans}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Step Button */}
                  <button
                    onClick={submitSurveyStep}
                    disabled={!selectedAnswer}
                    className={`mt-6 w-full font-black text-sm py-3.5 rounded-2xl border-4 border-slate-900 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 ${
                      selectedAnswer ? 'bg-[#FF3B77] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border-slate-300'
                    }`}
                  >
                    {surveyStep === 3 ? 'Finish Survey' : 'Next Question'}
                  </button>
                </div>
              )}

              {/* 4. REFERRAL MODAL */}
              {activeModal === 'referral' && (
                <div className="flex flex-col items-center py-2 text-center">
                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center border-3 border-slate-900 mb-4 shadow-[2px_2px_0px_0px_#000]">
                    <Users className="w-8 h-8 text-[#A855F7]" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">Refer & Earn</h3>
                  <p className="text-slate-500 font-bold text-xs mt-1 px-4 leading-relaxed">
                    Share your unique link with friends. You both get <span className="text-[#FF3B77] font-black">+100 SP</span> when they join!
                  </p>

                  {/* Mock invite stats */}
                  <div className="grid grid-cols-2 gap-3 w-full mt-5 bg-white border-3 border-slate-900 rounded-2xl p-3">
                    <div className="flex flex-col border-r-2 border-slate-100">
                      <span className="text-xs text-slate-400 font-bold">Total Invites</span>
                      <span className="text-xl font-black text-slate-900 mt-0.5">0</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">SP Earned</span>
                      <span className="text-xl font-black text-[#FF3B77] mt-0.5">0 SP</span>
                    </div>
                  </div>

                  {/* Copy link box */}
                  <div className="w-full mt-5">
                    <div className="bg-slate-100 text-xs font-mono py-2.5 px-3 rounded-lg text-slate-600 border border-slate-200 select-all truncate mb-3">
                      https://slapearn.app/ref/{stats.coins}
                    </div>

                    <button
                      onClick={copyReferral}
                      className="w-full font-black text-sm py-3.5 rounded-2xl border-4 border-slate-900 bg-[#A855F7] text-white hover:bg-purple-600 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
                    >
                      {isCopied ? 'Copied Link!' : 'Copy Invitation Link'}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
