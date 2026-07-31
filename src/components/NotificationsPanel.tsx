import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Gift,
  ShieldCheck,
  Check,
  Trash2,
  BellOff,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  Smartphone
} from 'lucide-react';
import { sound } from '../utils/sound';
import { subscribeAnnouncementsFromFirestore } from '../lib/firebase';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'reward' | 'system' | 'security' | 'promo';
  timestamp: string;
  read: boolean;
  type?: 'success' | 'info' | 'warning';
  actionTab?: 'home' | 'earn' | 'slap' | 'wallet' | 'profile';
  actionLabel?: string;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'pwa-app-ready',
    title: 'SlapEarn PWA App Ready 📱',
    message: 'Install SlapEarn on your mobile device home screen for instant slaps and fast cashouts!',
    category: 'system',
    timestamp: 'Just now',
    read: false,
    type: 'success',
    actionTab: 'home',
    actionLabel: 'Install App'
  },
  {
    id: 'daily-slaps-reset',
    title: '50 Slaps Energy Refilled ⚡',
    message: 'Your daily slaps meter is full! Slap boss characters to collect SP coins and level up.',
    category: 'reward',
    timestamp: '15m ago',
    read: false,
    type: 'success',
    actionTab: 'slap',
    actionLabel: 'Go Slap Bosses'
  },
  {
    id: 'cashout-rate-update',
    title: 'USDT Crypto Cashout Active 💲',
    message: 'Redemption rate: 5,000 SP = 0.5 USDT. Instant withdrawals available via USDT Tether.',
    category: 'promo',
    timestamp: '1h ago',
    read: false,
    type: 'info',
    actionTab: 'wallet',
    actionLabel: 'View Wallet'
  },
  {
    id: 'security-guard-active',
    title: 'Security & Anti-Cheat Active 🛡️',
    message: 'Atomic network time synchronization and proxy safeguards are active to keep earnings secure.',
    category: 'security',
    timestamp: '3h ago',
    read: true,
    type: 'info'
  }
];

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'home' | 'earn' | 'slap' | 'wallet' | 'profile') => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('slapearn_notifications_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'reward' | 'system' | 'security'>('all');
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('slapearn_push_enabled') === 'true';
  });

  // Sync with localStorage and notify parent of unread count
  useEffect(() => {
    try {
      localStorage.setItem('slapearn_notifications_history', JSON.stringify(notifications));
    } catch {
      // ignore
    }
    const count = notifications.filter((n) => !n.read).length;
    if (onUnreadCountChange) {
      onUnreadCountChange(count);
    }
  }, [notifications, onUnreadCountChange]);

  // Real-time listener for Firestore Announcements published from Admin Dashboard
  useEffect(() => {
    const unsubscribe = subscribeAnnouncementsFromFirestore((cloudAnnouncements) => {
      if (!cloudAnnouncements || cloudAnnouncements.length === 0) return;

      setNotifications((prevNotifs) => {
        let updated = [...prevNotifs];
        let hasNew = false;

        cloudAnnouncements.forEach((ann) => {
          const exists = updated.some((item) => item.id === ann.id);
          if (!exists) {
            hasNew = true;
            updated.unshift({
              id: ann.id,
              title: ann.title || '📢 Official Announcement',
              message: ann.message,
              category: ann.category || 'promo',
              timestamp: ann.timestamp || 'Just now',
              read: false,
              type: ann.type || 'info',
              actionTab: ann.actionTab || 'home',
              actionLabel: ann.actionLabel || 'Check App'
            });
          }
        });

        if (hasNew) {
          try {
            sound.playCoin();
          } catch {
            // ignore
          }
        }

        return updated;
      });
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    sound.playSlap();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    sound.playSlap();
    setNotifications([]);
  };

  const handleToggleRead = (id: string) => {
    sound.playSlap();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    sound.playSlap();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleTogglePush = async () => {
    sound.playSlap();
    if (!pushEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setPushEnabled(true);
        localStorage.setItem('slapearn_push_enabled', 'true');
      } else {
        alert('Push notifications permission was denied in your browser settings.');
      }
    } else {
      const next = !pushEnabled;
      setPushEnabled(next);
      localStorage.setItem('slapearn_push_enabled', String(next));
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'reward') return n.category === 'reward' || n.category === 'promo';
    return n.category === activeTab;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950 backdrop-blur-xs"
        />

        {/* Panel Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#0F172A] border-4 border-[#00D09E] rounded-[28px] p-4 sm:p-5 max-w-md w-full relative shadow-[0_12px_35px_rgba(0,0,0,0.8)] z-10 text-white flex flex-col max-h-[85vh]"
          id="notifications-panel-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#00D09E]/20 border-2 border-[#00D09E] flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-[#00D09E] stroke-[2.5]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-950">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 leading-none">
                  Notifications & Alerts
                </h3>
                <p className="text-slate-400 font-bold text-[11px] mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Controls Bar */}
          <div className="flex items-center justify-between py-2.5 px-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                  unreadCount > 0
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-[#00D09E] cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Mark Read</span>
              </button>

              <button
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                  notifications.length > 0
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-rose-400 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3 h-3 stroke-[2.5]" />
                <span>Clear All</span>
              </button>
            </div>

            {/* Push Switch Toggle */}
            <button
              onClick={handleTogglePush}
              className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                pushEnabled
                  ? 'bg-[#00D09E]/20 border-[#00D09E] text-[#00D09E]'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle Browser Push Alerts"
            >
              {pushEnabled ? <Sparkles className="w-3 h-3 text-[#00D09E]" /> : <BellOff className="w-3 h-3 text-slate-400" />}
              <span>{pushEnabled ? 'Push ON' : 'Push OFF'}</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 mb-3 shrink-0">
            <button
              onClick={() => { sound.playSlap(); setActiveTab('all'); }}
              className={`flex-1 py-1.5 text-center font-black text-[11px] rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#00D09E] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => { sound.playSlap(); setActiveTab('reward'); }}
              className={`flex-1 py-1.5 text-center font-black text-[11px] rounded-lg transition-all cursor-pointer ${
                activeTab === 'reward'
                  ? 'bg-[#00D09E] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rewards
            </button>
            <button
              onClick={() => { sound.playSlap(); setActiveTab('system'); }}
              className={`flex-1 py-1.5 text-center font-black text-[11px] rounded-lg transition-all cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-[#00D09E] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              System
            </button>
            <button
              onClick={() => { sound.playSlap(); setActiveTab('security'); }}
              className={`flex-1 py-1.5 text-center font-black text-[11px] rounded-lg transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-[#00D09E] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Security
            </button>
          </div>

          {/* Notifications Feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500">
                <BellOff className="w-10 h-10 stroke-[1.5] mb-2 text-slate-600" />
                <p className="font-bold text-xs">No notifications here!</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Check back later for rewards & updates.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleRead(item.id)}
                  className={`p-3 rounded-2xl border transition-all relative group cursor-pointer ${
                    !item.read
                      ? 'bg-slate-900/90 border-[#00D09E]/60 shadow-[0_0_12px_rgba(0,208,158,0.15)]'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-80'
                  }`}
                >
                  {!item.read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#00D09E] animate-ping" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Category Icon */}
                    <div className="shrink-0 mt-0.5">
                      {item.category === 'reward' || item.category === 'promo' ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                          <Gift className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : item.category === 'security' ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/50 flex items-center justify-center">
                          <Info className="w-4 h-4 text-sky-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-black text-xs truncate ${!item.read ? 'text-white' : 'text-slate-300'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug font-medium">
                        {item.message}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.timestamp}
                        </span>

                        {item.actionTab && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playSlap();
                              onClose();
                              if (onNavigateTab && item.actionTab) {
                                onNavigateTab(item.actionTab);
                              }
                            }}
                            className="bg-[#00D09E]/10 hover:bg-[#00D09E]/20 text-[#00D09E] border border-[#00D09E]/40 font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <span>{item.actionLabel || 'View'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition-opacity"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-800 mt-2 text-center shrink-0">
            <p className="text-[10px] font-bold text-slate-400">
              ⚡ Notifications auto-update when you earn SP coins, level up, or claim daily rewards!
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
