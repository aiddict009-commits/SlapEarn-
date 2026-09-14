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
  Info,
  Lock,
  Check,
  Sparkles,
  Shield,
  AlertTriangle,
  Ban,
  FileText
} from 'lucide-react';
import { sound } from '../utils/sound';
import { UserStats, Transaction } from '../types';
import { TITLE_TIERS, TitleTier, getTitleTierForLevel } from '../utils/titles';

interface ProfileViewProps {
  stats: UserStats;
  xpProgressPercent: number;
  xpThreshold: number;
  transactions: Transaction[];
  isMuted?: boolean;
  onToggleMute?: () => void;
  onLogout?: () => void;
  addNotification?: (title: string, message: string, type: 'success' | 'info') => void;
  updateStatsDirectly?: (newStats: Partial<UserStats>) => void;
  updateCoinsAndXp?: (coinReward: number, xpReward: number, category: Transaction['category'], title: string) => void;
  onOpenNotifications?: () => void;
  authUser?: { email: string; username: string } | null;
  isAdmin?: boolean;
  onOpenAdminHub?: () => void;
  onNavigateTab?: (tab: 'home' | 'earn' | 'slap' | 'wallet' | 'profile') => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
}

export default function ProfileView({ 
  stats, 
  xpProgressPercent, 
  xpThreshold, 
  transactions,
  isMuted = false,
  onToggleMute,
  onLogout,
  addNotification,
  updateStatsDirectly,
  updateCoinsAndXp,
  onOpenNotifications,
  authUser,
  isAdmin = false,
  onOpenAdminHub,
  onNavigateTab,
  onOpenLegal
}: ProfileViewProps) {
  
  // State for modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isSoundEffectsOpen, setIsSoundEffectsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState<boolean>(false);

  // Currently equipped title and frame (automatically unlocked and upgraded as player levels up)
  const currentLevelTier = getTitleTierForLevel(stats.level);
  const currentTitle = stats.equippedTitle || currentLevelTier.title;
  const equippedBadgeObj = TITLE_TIERS.find((b) => b.title === currentTitle) || currentLevelTier;
  const equippedFrame = stats.equippedFrame || equippedBadgeObj.frameType || 'none';
  const hasGoldenName = equippedBadgeObj.hasGoldenName || currentTitle === 'Legend' || currentTitle === 'Grand Master';

  // Dynamic values with clean zero defaults for new accounts
  const bestCombo = stats.bestCombo ?? 0;
  const daysActive = stats.daysActive ?? 0;
  const referrals = stats.referrals ?? 0;

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
    setIsLogoutOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('slapearn_stats');
      localStorage.removeItem('slapearn_transactions');
      localStorage.removeItem('slapearn_auth_user');
      addNotification?.('Account Reset', 'You have logged out successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 text-slate-900 select-none pb-8" id="profile-view-scroll">
      
      {/* Profile Header Avatar */}
      <div className="flex flex-col items-center mt-1.5 mb-1.5" id="profile-avatar-sec">
        
        {/* Crown ornament for Grand Master */}
        {equippedFrame === 'gold_animated' && (
          <div className="relative -mb-4 z-20 animate-bounce text-3xl drop-shadow-[0_4px_8px_rgba(245,158,11,0.6)]">
            👑
          </div>
        )}

        {/* Smile Avatar Badge with Dynamic Frame */}
        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all ${
          equippedFrame === 'bronze'
            ? 'bg-gradient-to-br from-[#d97706] via-[#b45309] to-[#78350f] p-1.5 border-4 border-[#78350f] shadow-[0_0_15px_rgba(217,119,6,0.5)]'
            : equippedFrame === 'silver'
            ? 'bg-gradient-to-br from-[#e2e8f0] via-[#94a3b8] to-[#475569] p-1.5 border-4 border-[#64748b] shadow-[0_0_15px_rgba(148,163,184,0.6)]'
            : equippedFrame === 'gold_animated'
            ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 p-1.5 border-4 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-pulse'
            : 'bg-[#FFD043] border-4 border-slate-900 shadow-[3.5px_4px_0px_0px_rgba(15,23,42,1)]'
        }`}>
          {/* Smiling Face Mascot Avatar Circle */}
          <div className="w-20 h-20 bg-amber-300 border-4 border-slate-900 rounded-full flex items-center justify-center relative shadow-inner">
            <span className="text-4xl select-none leading-none">😊</span>
          </div>
        </div>
        
        {/* Name with Golden Gradient Option */}
        <h3 className={`text-2xl font-black tracking-tight mt-2 ${
          hasGoldenName 
            ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]'
            : 'text-slate-950'
        }`}>
          {authUser?.username || 'Slap Champ'}
        </h3>
        {authUser?.email && (
          <span className="text-[11px] font-bold text-slate-500 font-mono -mt-0.5">
            {authUser.email}
          </span>
        )}

        {/* Equipped Title Badge Pill - Auto Upgraded by Level */}
        <div className="flex items-center gap-1.5 mt-1 px-3 py-1 bg-slate-900 border-2 border-slate-950 rounded-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <span className="text-sm">{equippedBadgeObj.icon}</span>
          <span className="text-amber-300 font-black text-xs tracking-wider uppercase">{equippedBadgeObj.title} Title</span>
          <span className="text-emerald-400 font-bold text-[9px] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">Auto-Unlocked</span>
        </div>

        <p className="text-slate-400 font-bold text-xs mt-1 text-center">
          Level {stats.level} • Perk: <span className="text-amber-400 font-black">{equippedBadgeObj.rewardText}</span>
        </p>

        {/* Account Restricted Status Banner in User Profile */}
        {(stats.isRestricted || stats.status === 'Restricted' || stats.status === 'Frozen') && (
          <div className="mt-3 w-full max-w-sm bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-3 text-rose-900 flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-left">
              <span className="font-black text-rose-950 block uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-rose-600" /> Account Restricted
              </span>
              <span className="text-rose-800 text-[11px] font-semibold leading-tight block">
                Your account ability to earn rewards and redeem points is restricted by admin.
              </span>
            </div>
          </div>
        )}
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

      {/* Four Stats Cards Row Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" id="stats-grid-row">
        {/* Lifetime Ads Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-2.5 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-[#FF3B77] leading-none">
            {stats.totalAdsWatchedLifetime || 0}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Lifetime ads
          </span>
        </div>

        {/* Best Combo Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-2.5 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-slate-950 leading-none">
            {bestCombo}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Best combo
          </span>
        </div>

        {/* Days Active Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-2.5 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-slate-950 leading-none">
            {daysActive}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Days active
          </span>
        </div>

        {/* Referrals Card */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-2.5 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-center items-center h-20">
          <span className="text-xl font-black text-slate-950 leading-none">
            {referrals}
          </span>
          <span className="text-slate-400 font-bold text-[10px] sm:text-[11px] leading-tight mt-1">
            Referrals
          </span>
        </div>
      </div>

      {/* --- MORE WAYS TO EARN SECTION --- */}
      <div className="bg-white rounded-[28px] border-4 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3" id="more-ways-to-earn-section">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFD043] border-2 border-slate-900 flex items-center justify-center text-lg font-black shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
              🚀
            </div>
            <div>
              <h4 className="text-base font-black text-slate-950 tracking-tight leading-none">
                More Ways To Earn
              </h4>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                New opportunities coming soon
              </p>
            </div>
          </div>
          <div className="bg-slate-100 border-2 border-slate-900 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-500 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
            EMPTY
          </div>
        </div>

        {/* Empty Placeholder Frame */}
        <div className="min-h-[90px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-4 text-center bg-slate-50/60">
          <p className="text-xs font-bold text-slate-400">
            This space is reserved for More Ways To Earn.
          </p>
        </div>
      </div>

      {/* Action Settings Item Cards Stack */}
      <div className="flex flex-col gap-2.5" id="actions-stack-container">
        {/* Admin Dashboard Hub Toggle Button - ONLY VISIBLE TO VERIFIED ADMINS VIA CUSTOM CLAIM */}
        {isAdmin && (
          <button
            onClick={() => { 
              sound.playSuccess(); 
              onOpenAdminHub?.(); 
            }}
            className="bg-gradient-to-r from-[#FF3B77] via-pink-600 to-rose-600 rounded-[24px] border-4 border-slate-900 p-3.5 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-98 cursor-pointer transition-all w-full text-left"
            id="action-admin-dashboard-btn"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center font-black text-slate-950 text-base shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                ⚡
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-[15px] tracking-tight">Admin Dashboard</span>
                  <span className="bg-[#FFD043] text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded border border-slate-900 uppercase">
                    MASTER
                  </span>
                </div>
                <span className="text-pink-100 font-bold text-[10px]">
                  Economy, Revenue, Users, Fraud & Game Controls
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white stroke-[3px]" />
          </button>
        )}

        {/* Notifications Item */}
        <button
          onClick={() => { 
            sound.playSlap(); 
            if (onOpenNotifications) {
              onOpenNotifications();
            } else {
              setIsNotificationsOpen(true); 
            }
          }}
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

        {/* Terms & Privacy Item */}
        <button
          onClick={() => { 
            sound.playSlap(); 
            if (onOpenLegal) {
              onOpenLegal('terms');
            } else {
              window.location.href = '/terms';
            }
          }}
          className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-98 cursor-pointer transition-all w-full text-left"
          id="action-legal-btn"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-950 stroke-[2.5px]" />
            <span className="font-black text-slate-950 text-[14px]">Terms & Privacy Policy</span>
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
                    Need further assistance? Contact support at <a href="mailto:aiddict009@gmail.com" className="text-slate-950 font-black underline hover:text-[#FF3B77] transition-colors">aiddict009@gmail.com</a>
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
                Log out of account?
              </h3>
              <p className="text-slate-500 font-bold text-xs leading-relaxed px-2 mb-6">
                Are you sure you want to log out? You can log back in anytime with your username or email.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleConfirmLogout}
                  className="w-full font-black text-xs py-3.5 rounded-2xl border-4 border-slate-900 bg-rose-500 hover:bg-rose-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer"
                >
                  Yes, Log Out
                </button>
                <button
                  onClick={() => { sound.playSlap(); setIsLogoutOpen(false); }}
                  className="w-full font-black text-xs py-3.5 rounded-2xl border-4 border-slate-900 bg-white hover:bg-slate-50 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
