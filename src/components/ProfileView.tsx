import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  X, 
  CheckCircle, 
  PlayCircle,
  HelpCircle as QuestionIcon,
  ShieldCheck,
  Award,
  Users,
  Smartphone,
  Star,
  Info
} from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction } from '../types';

interface ProfileViewProps {
  stats: UserStats;
  xpProgressPercent: number;
  xpThreshold: number;
  transactions: Transaction[];
  isMuted?: boolean;
  onToggleMute?: () => void;
  addNotification?: (title: string, message: string, type: 'success' | 'info') => void;
}

export default function ProfileView({ 
  stats, 
  xpProgressPercent, 
  xpThreshold, 
  transactions,
  isMuted = false,
  onToggleMute,
  addNotification
}: ProfileViewProps) {
  
  // State for modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isSoundEffectsOpen, setIsSoundEffectsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState<boolean>(false);

  // Dynamic values with fallbacks to match the screenshot defaults exactly
  const bestCombo = stats.bestCombo ?? 18;
  const daysActive = stats.daysActive ?? 12;
  const referrals = stats.referrals ?? 3;

  const handleToggleSound = () => {
    sound.playSlap();
    if (onToggleMute) {
      onToggleMute();
    }
  };

  const handleTestSound = (type: 'slap' | 'success' | 'error' | 'levelUp') => {
    if (isMuted) {
      addNotification?.('Audio is Muted', 'Please enable sound effects to hear the test chime!', 'info');
      return;
    }
    switch (type) {
      case 'slap':
        sound.playSlap();
        break;
      case 'success':
        sound.playSuccess();
        break;
      case 'error':
        sound.playError();
        break;
      case 'levelUp':
        sound.playLevelUp();
        break;
    }
  };

  const handleConfirmLogout = () => {
    sound.playSuccess();
    localStorage.removeItem('slapearn_stats');
    localStorage.removeItem('slapearn_transactions');
    addNotification?.('Account Reset', 'You have logged out successfully!', 'success');
    setIsLogoutOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="flex flex-col gap-3.5 text-slate-900 select-none pb-8" id="profile-view-scroll">
      
      {/* Profile Header Avatar */}
      <div className="flex flex-col items-center mt-1.5 mb-1.5" id="profile-avatar-sec">
        {/* Smile Avatar Badge */}
        <div className="relative w-28 h-28 bg-[#FFD043] border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[3.5px_4px_0px_0px_rgba(15,23,42,1)]">
          {/* Green Smile Face Circle */}
          <div className="w-20 h-20 bg-[#00D09E] border-4 border-slate-900 rounded-full flex items-center justify-center relative">
            <svg viewBox="0 0 100 100" className="w-13 h-13 text-slate-950 fill-none stroke-current stroke-[8.5px] stroke-linecap-round">
              {/* Left Smiling Eye */}
              <path d="M22 42 Q31 30 40 42" />
              {/* Right Smiling Eye */}
              <path d="M60 42 Q69 30 78 42" />
              {/* Smiling mouth */}
              <path d="M30 65 Q50 82 70 65" />
            </svg>
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-slate-950 tracking-tight mt-2">
          Slap Champ
        </h3>
        <p className="text-slate-400 font-bold text-xs mt-0.5">
          Level {stats.level}
        </p>
      </div>

      {/* Level Progression Progress Bar */}
      <div className="w-full px-1" id="level-progression-container">
        <div className="flex justify-between items-center text-sm font-black text-slate-950 mb-1.5 px-1">
          <span>Level {stats.level}</span>
          <span>Level {stats.level + 1}</span>
        </div>
        
        {/* Progress Bar Container with heavy retro border */}
        <div className="w-full bg-white h-7 rounded-full overflow-hidden border-4 border-slate-900 relative shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <div
            className="bg-[#FF3B77] h-full transition-all duration-300 border-r-4 border-slate-900"
            style={{ width: `${xpProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Three Stats Cards Row Grid */}
      <div className="grid grid-cols-3 gap-3" id="stats-grid-row">
        {/* Best Combo Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-slate-950 leading-none">
            {bestCombo}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Best combo
          </span>
        </div>

        {/* Days Active Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-slate-950 leading-none">
            {daysActive}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Days active
          </span>
        </div>

        {/* Referrals Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-slate-950 leading-none">
            {referrals}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Referrals
          </span>
        </div>
      </div>

      {/* Action Settings Item Cards Stack */}
      <div className="flex flex-col gap-2.5" id="actions-stack-container">
        {/* Notifications Item */}
        <button
          onClick={() => { sound.playSlap(); setIsNotificationsOpen(true); }}
          className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-98 cursor-pointer transition-all w-full text-left"
          id="action-notifications-btn"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
            <span className="font-black text-slate-950 text-[14px]">Notifications</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
        </button>

        {/* Sound Effects Item */}
        <button
          onClick={() => { sound.playSlap(); setIsSoundEffectsOpen(true); }}
          className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-98 cursor-pointer transition-all w-full text-left"
          id="action-sound-btn"
        >
          <div className="flex items-center gap-3">
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
            ) : (
              <Volume2 className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
            )}
            <span className="font-black text-slate-950 text-[14px]">Sound effects</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
        </button>

        {/* Help & Support Item */}
        <button
          onClick={() => { sound.playSlap(); setIsHelpOpen(true); }}
          className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-98 cursor-pointer transition-all w-full text-left"
          id="action-help-btn"
        >
          <div className="flex items-center gap-3">
            <QuestionIcon className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
            <span className="font-black text-slate-950 text-[14px]">Help & support</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
        </button>

        {/* Log Out Item */}
        <button
          onClick={() => { sound.playSlap(); setIsLogoutOpen(true); }}
          className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-98 cursor-pointer transition-all w-full text-left"
          id="action-logout-btn"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
            <span className="font-black text-slate-950 text-[14px]">Log out</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
        </button>
      </div>

      {/* --- MODAL SYSTEM --- */}
      <AnimatePresence>
        
        {/* 1. Notifications Modal */}
        {isNotificationsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900"
            >
              <button 
                onClick={() => setIsNotificationsOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
              >
                <X className="w-5 h-5 text-slate-900" />
              </button>

              <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2 mb-1">
                <Bell className="w-6 h-6 text-[#FF3B77]" />
                System Alerts
              </h3>
              <p className="text-slate-400 font-bold text-xs mb-5">
                Stay updated with latest announcements
              </p>

              <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
                <div className="bg-white border-3 border-slate-900 rounded-2xl p-3.5 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 border-2 border-slate-900 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-950">Daily Check-in Reset</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">Your 50 daily slaps are refilled. Tap to maximize rewards!</p>
                  </div>
                </div>

                <div className="bg-white border-3 border-slate-900 rounded-2xl p-3.5 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFEAF0] border-2 border-slate-900 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-[#FF3B77]" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-950">Level Up Bonus Active</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">Leveling up grants extra SP coin vouchers instantly.</p>
                  </div>
                </div>

                <div className="bg-white border-3 border-slate-900 rounded-2xl p-3.5 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border-2 border-slate-900 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-950">Referral Program Live</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">Share SlapEarn with friends to receive bonus coins.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="mt-6 w-full font-black text-sm py-3 rounded-2xl border-4 border-slate-900 bg-[#FFD043] hover:bg-[#FFE066] text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
              >
                All caught up!
              </button>
            </motion.div>
          </div>
        )}

        {/* 2. Sound Effects Modal */}
        {isSoundEffectsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSoundEffectsOpen(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900"
            >
              <button 
                onClick={() => setIsSoundEffectsOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
              >
                <X className="w-5 h-5 text-slate-900" />
              </button>

              <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2 mb-1">
                <Volume2 className="w-6 h-6 text-[#FF3B77]" />
                Audio Settings
              </h3>
              <p className="text-slate-400 font-bold text-xs mb-5">
                Toggle and sample app sound feedback
              </p>

              {/* Main Audio Toggle Card */}
              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 flex items-center justify-between mb-5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div>
                  <h4 className="font-black text-sm text-slate-950">App Sounds</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Clicking & feedback chime</p>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`px-4 py-2 rounded-xl border-3 border-slate-900 font-black text-xs shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] transition-all ${
                    !isMuted 
                      ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-500' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {!isMuted ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              {/* Audio samples */}
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                Test audio clips
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTestSound('slap')}
                  className="bg-white border-3 border-slate-900 rounded-xl p-2.5 font-bold text-xs hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4 text-slate-500" />
                  <span>Slap chime</span>
                </button>

                <button
                  onClick={() => handleTestSound('success')}
                  className="bg-white border-3 border-slate-900 rounded-xl p-2.5 font-bold text-xs hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4 text-emerald-500" />
                  <span>Success bell</span>
                </button>

                <button
                  onClick={() => handleTestSound('error')}
                  className="bg-white border-3 border-slate-900 rounded-xl p-2.5 font-bold text-xs hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4 text-rose-500" />
                  <span>Error buzz</span>
                </button>

                <button
                  onClick={() => handleTestSound('levelUp')}
                  className="bg-white border-3 border-slate-900 rounded-xl p-2.5 font-bold text-xs hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4 text-amber-500" />
                  <span>Level-up fanfare</span>
                </button>
              </div>

              <button
                onClick={() => setIsSoundEffectsOpen(false)}
                className="mt-6 w-full font-black text-sm py-3 rounded-2xl border-4 border-slate-900 bg-[#FFD043] hover:bg-[#FFE066] text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
              >
                Close Settings
              </button>
            </motion.div>
          </div>
        )}

        {/* 3. Help & Support Modal */}
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900"
            >
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
              >
                <X className="w-5 h-5 text-slate-900" />
              </button>

              <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2 mb-1">
                <HelpCircle className="w-6 h-6 text-[#FF3B77]" />
                Help & Support
              </h3>
              <p className="text-slate-400 font-bold text-xs mb-5">
                Learn how to earn and cashout
              </p>

              <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <h4 className="font-black text-xs text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#FF3B77]" />
                    1. Tap to Earn
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed pl-5">
                    Tap the red cheek inside the slap arena as fast as you can to trigger slap combos. Each slap awards XP and points!
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-xs text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[#FF3B77]" />
                    2. Leveling Up
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed pl-5">
                    Earning XP fills your progression meter. Leveling up multiplies your coin rewards per slap and grants a 300 SP voucher!
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-xs text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    3. Security Audits
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed pl-5">
                    All cashout requests are audited by administrators to verify that slaps were made organically. Automated scripts result in account locks.
                  </p>
                </div>

                <div className="bg-amber-50 border-2 border-dashed border-amber-300 p-3 rounded-xl flex gap-2.5">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                    Need further assistance? Contact support at <strong className="text-slate-950">justinkatempa19@gmail.com</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsHelpOpen(false)}
                className="mt-6 w-full font-black text-sm py-3 rounded-2xl border-4 border-slate-900 bg-[#FFD043] hover:bg-[#FFE066] text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        )}

        {/* 4. Log Out Confirmation Modal */}
        {isLogoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutOpen(false)}
              className="absolute inset-0 bg-slate-950"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900 text-center"
            >
              {/* Cute Cat Face Illustration for Retro Aesthetic */}
              <div className="w-16 h-16 bg-[#FFEAF0] border-3 border-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] text-2xl">
                🐱
              </div>

              <h3 className="text-xl font-black text-slate-950 tracking-tight mb-2">
                Reset your account?
              </h3>
              <p className="text-slate-500 font-bold text-xs leading-relaxed px-2 mb-6">
                Are you sure you want to log out? This will completely clear your cached SlapPoints stats and local transaction ledger.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleConfirmLogout}
                  className="w-full font-black text-xs py-3.5 rounded-2xl border-4 border-slate-900 bg-rose-500 hover:bg-rose-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
                >
                  Yes, reset and log out
                </button>
                <button
                  onClick={() => { sound.playSlap(); setIsLogoutOpen(false); }}
                  className="w-full font-black text-xs py-3.5 rounded-2xl border-4 border-slate-900 bg-white hover:bg-slate-50 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
                >
                  No, keep playing
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
