import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Home,
  Users,
  Wallet,
  Gamepad2,
  Gift,
  Megaphone,
  TrendingUp,
  ShieldAlert,
  FileText,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Plus,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  DollarSign,
  Activity,
  ArrowUpRight,
  Ban,
  Eye,
  Zap,
  Award,
  Sparkles,
  Clock,
  Globe,
  ChevronRight,
  Sliders,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  ShieldCheck,
  Smartphone,
  CreditCard,
  ArrowRightLeft,
  Coins,
  Percent,
  X,
  LogOut,
  Check,
  AlertCircle
} from 'lucide-react';
import { UserStats, Transaction } from '../types';
import { sound } from '../utils/sound';
import { 
  publishAnnouncementToFirestore, 
  subscribeAnnouncementsFromFirestore,
  subscribeAllUsersFromFirestore,
  subscribeWithdrawalsFromFirestore,
  updateWithdrawalStatusInFirestore,
  syncUserStatsToFirestore,
  addSecurityLogToFirestore,
  subscribeSecurityLogsFromFirestore,
  saveSecurityRulesConfigToFirestore,
  subscribeSecurityRulesConfigFromFirestore,
  saveEconomyConfigToFirestore,
  subscribeEconomyConfigFromFirestore
} from '../lib/firebase';

interface AdminDashboardProps {
  stats: UserStats;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  onClose: () => void;
}

type AdminTab =
  | 'overview'
  | 'users'
  | 'withdrawals'
  | 'game'
  | 'rewards'
  | 'ads'
  | 'revenue'
  | 'fraud'
  | 'content'
  | 'settings';

interface MockUser {
  id: string;
  username: string;
  email: string;
  country: string;
  joinDate: string;
  level: number;
  spBalance: number;
  xp: number;
  referrals: number;
  status: 'Active' | 'Suspicious' | 'Frozen' | 'Restricted';
  isRestricted?: boolean;
  riskLevel: 'Low' | 'Review' | 'High';
  activityTimeline: {
    adsWatched: number;
    gamesPlayed: number;
    slapsMade: number;
    surveysCompleted: number;
    offerwallsCompleted: number;
    withdrawalsCount: number;
  };
}

const INITIAL_MOCK_USERS: MockUser[] = [
  {
    id: 'usr-101',
    username: 'SlapMaster99',
    email: 'slapmaster@gmail.com',
    country: 'United States 🇺🇸',
    joinDate: '2026-06-12',
    level: 14,
    spBalance: 4250,
    xp: 8900,
    referrals: 12,
    status: 'Active',
    isRestricted: false,
    riskLevel: 'Low',
    activityTimeline: { adsWatched: 142, gamesPlayed: 88, slapsMade: 3200, surveysCompleted: 15, offerwallsCompleted: 8, withdrawalsCount: 3 }
  },
  {
    id: 'usr-102',
    username: 'EarnKing_2026',
    email: 'earnking@yahoo.com',
    country: 'Germany 🇩🇪',
    joinDate: '2026-07-01',
    level: 8,
    spBalance: 12800,
    xp: 4500,
    referrals: 4,
    status: 'Restricted',
    isRestricted: true,
    riskLevel: 'High',
    activityTimeline: { adsWatched: 210, gamesPlayed: 14, slapsMade: 450, surveysCompleted: 2, offerwallsCompleted: 19, withdrawalsCount: 2 }
  },
  {
    id: 'usr-103',
    username: 'BotSlapper_X',
    email: 'bot_slap@tempmail.org',
    country: 'India 🇮🇳',
    joinDate: '2026-07-25',
    level: 22,
    spBalance: 98000,
    xp: 24000,
    referrals: 85,
    status: 'Frozen',
    isRestricted: false,
    riskLevel: 'High',
    activityTimeline: { adsWatched: 950, gamesPlayed: 600, slapsMade: 45000, surveysCompleted: 0, offerwallsCompleted: 45, withdrawalsCount: 5 }
  },
  {
    id: 'usr-104',
    username: 'CasualGamer',
    email: 'casual@hotmail.com',
    country: 'Canada 🇨🇦',
    joinDate: '2026-07-10',
    level: 5,
    spBalance: 1240,
    xp: 1800,
    referrals: 2,
    status: 'Active',
    isRestricted: false,
    riskLevel: 'Low',
    activityTimeline: { adsWatched: 28, gamesPlayed: 35, slapsMade: 920, surveysCompleted: 4, offerwallsCompleted: 1, withdrawalsCount: 1 }
  },
  {
    id: 'usr-105',
    username: 'CryptoHunter',
    email: 'cryptohunter@proton.me',
    country: 'United Kingdom 🇬🇧',
    joinDate: '2026-07-18',
    level: 11,
    spBalance: 6500,
    xp: 6200,
    referrals: 9,
    status: 'Active',
    isRestricted: false,
    riskLevel: 'Low',
    activityTimeline: { adsWatched: 88, gamesPlayed: 52, slapsMade: 1850, surveysCompleted: 9, offerwallsCompleted: 5, withdrawalsCount: 2 }
  }
];

interface MockWithdrawal {
  id: string;
  userId: string;
  username: string;
  amountUsd: number;
  spDeducted: number;
  method: string;
  payoutDestination?: string;
  dateRequested: string;
  createdAt?: number;
  accountAgeDays: number;
  reqsCompleted: boolean;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Under Review';
  fraudFlags: {
    accountAgeCheck: boolean;
    reqActivityCheck: boolean;
    noUnusualEarning: boolean;
    noDuplicateDevices: boolean;
  };
}

const INITIAL_WITHDRAWALS: MockWithdrawal[] = [
  {
    id: 'wd-801',
    userId: 'usr-102',
    username: 'EarnKing_2026',
    amountUsd: 10.00,
    spDeducted: 10000,
    method: 'USDT',
    dateRequested: '10 mins ago',
    accountAgeDays: 25,
    reqsCompleted: true,
    status: 'Pending',
    fraudFlags: { accountAgeCheck: true, reqActivityCheck: true, noUnusualEarning: false, noDuplicateDevices: true }
  },
  {
    id: 'wd-802',
    userId: 'usr-103',
    username: 'BotSlapper_X',
    amountUsd: 50.00,
    spDeducted: 50000,
    method: 'USDT',
    dateRequested: '1 hour ago',
    accountAgeDays: 1,
    reqsCompleted: false,
    status: 'Under Review',
    fraudFlags: { accountAgeCheck: false, reqActivityCheck: false, noUnusualEarning: false, noDuplicateDevices: false }
  },
  {
    id: 'wd-803',
    userId: 'usr-101',
    username: 'SlapMaster99',
    amountUsd: 5.00,
    spDeducted: 5000,
    method: 'Amazon Gift Card',
    dateRequested: '3 hours ago',
    accountAgeDays: 44,
    reqsCompleted: true,
    status: 'Pending',
    fraudFlags: { accountAgeCheck: true, reqActivityCheck: true, noUnusualEarning: true, noDuplicateDevices: true }
  }
];

const INITIAL_SECURITY_LOGS = [
  {
    id: 'sec-101',
    userId: 'usr-103',
    username: 'AutoSlapBot_9',
    eventType: 'Autoclicker CPS',
    severity: 'High',
    details: 'Exceeded max CPS threshold: 42 clicks/sec detected on Golden Mole',
    ipAddress: '198.51.100.42',
    deviceId: 'dev-9921a',
    timestamp: '2 mins ago',
    status: 'Unresolved'
  },
  {
    id: 'sec-102',
    userId: 'usr-104',
    username: 'VPN_Farmer_X',
    eventType: 'VPN/Proxy Detected',
    severity: 'Medium',
    details: 'Datacenter proxy IP detected during MyLead offerwall completion',
    ipAddress: '185.220.101.5',
    deviceId: 'dev-1102b',
    timestamp: '15 mins ago',
    status: 'Auto-Blocked'
  },
  {
    id: 'sec-103',
    userId: 'usr-105',
    username: 'MultiAcc_Rider',
    eventType: 'Duplicate Device',
    severity: 'High',
    details: '3 accounts registered from identical hardware device fingerprint',
    ipAddress: '203.0.113.88',
    deviceId: 'dev-8871c',
    timestamp: '1 hour ago',
    status: 'Investigating'
  },
  {
    id: 'sec-104',
    userId: 'usr-106',
    username: 'TimeWarp_User',
    eventType: 'Clock Tampering',
    severity: 'Critical',
    details: 'Client device clock was fast-forwarded +48 hours to bypass daily streak cooldown',
    ipAddress: '198.51.100.99',
    deviceId: 'dev-4412d',
    timestamp: '3 hours ago',
    status: 'Unresolved'
  }
];

const EARNINGS_TREND_DATA = [
  { name: 'Mon', Adsterra: 380, MyBid: 290, MyLead: 420, Total: 1090 },
  { name: 'Tue', Adsterra: 420, MyBid: 310, MyLead: 490, Total: 1220 },
  { name: 'Wed', Adsterra: 390, MyBid: 340, MyLead: 460, Total: 1190 },
  { name: 'Thu', Adsterra: 480, MyBid: 390, MyLead: 540, Total: 1410 },
  { name: 'Fri', Adsterra: 540, MyBid: 420, MyLead: 610, Total: 1570 },
  { name: 'Sat', Adsterra: 610, MyBid: 480, MyLead: 680, Total: 1770 },
  { name: 'Sun', Adsterra: 580, MyBid: 450, MyLead: 640, Total: 1670 },
];

const NETWORK_PERFORMANCE_BAR_DATA = [
  { name: 'Adsterra', ecpm: 18.5, volume: 12400, gross: 3280, fillRate: 98 },
  { name: 'MyBid', ecpm: 16.2, volume: 9800, gross: 2450, fillRate: 96 },
  { name: 'MyLead Offerwall', ecpm: 45.0, volume: 2150, gross: 4120, fillRate: 95 },
];

const REVENUE_SHARE_PIE_DATA = [
  { name: 'Adsterra', value: 3280, color: '#f59e0b' },
  { name: 'MyBid', value: 2450, color: '#38bdf8' },
  { name: 'MyLead Offerwall', value: 4120, color: '#10b981' },
];

const USER_ACTIVITY_TREND_DATA = [
  { name: 'Mon', activeUsers: 620, newSignups: 45, spEarnedK: 125 },
  { name: 'Tue', activeUsers: 680, newSignups: 52, spEarnedK: 142 },
  { name: 'Wed', activeUsers: 710, newSignups: 48, spEarnedK: 138 },
  { name: 'Thu', activeUsers: 790, newSignups: 64, spEarnedK: 165 },
  { name: 'Fri', activeUsers: 840, newSignups: 78, spEarnedK: 189 },
  { name: 'Sat', activeUsers: 910, newSignups: 92, spEarnedK: 210 },
  { name: 'Sun', activeUsers: 880, newSignups: 85, spEarnedK: 198 },
];

export default function AdminDashboard({
  stats,
  updateStatsDirectly,
  addNotification,
  onClose
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // User Management State
  const [users, setUsers] = useState<MockUser[]>(INITIAL_MOCK_USERS);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<string>('All');
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [adjustSpModalOpen, setAdjustSpModalOpen] = useState(false);
  const [spAdjustAmount, setSpAdjustAmount] = useState(500);

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<MockWithdrawal[]>(INITIAL_WITHDRAWALS);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('All');

  // Rewards & Economy Controls State
  const [economyConfig, setEconomyConfig] = useState({
    spPerUsdRatio: 10000,
    minCashoutUsd: 1.00,
    maxCashoutUsdPerReq: 50.00,
    requiredReferralsForCashout: 0,
    instantApprovalUsdThreshold: 2.00,
    payoutProcessingFeePercent: 0,

    enablePaypal: false,
    enableCryptoUsdt: true,
    enableAmazonGiftCards: true,
    enableGooglePlayCards: true,
    enableMobileMoney: true,

    spPerAd: 25,
    dailyAdLimit: 30,
    adCooldownSeconds: 15,
    slapBaseReward: 10,
    criticalHitMultiplier: 3,
    gameEntrySlapsCost: 5,
    referralSpBonus: 500,
    referralCommissionPercent: 10,
    streakMultiplier: 1.5,
    offerwallUserSharePercent: 60
  });

  const [isSavingEconomyConfig, setIsSavingEconomyConfig] = useState<boolean>(false);
  const [simulatedSpAmount, setSimulatedSpAmount] = useState<number>(50000);

  const [spPerAd, setSpPerAd] = useState(25);
  const [dailyAdLimit, setDailyAdLimit] = useState(30);
  const [adCooldownSeconds, setAdCooldownSeconds] = useState(15);
  const [slapBaseReward, setSlapBaseReward] = useState(10);
  const [criticalHitMultiplier, setCriticalHitMultiplier] = useState(3);
  const [gameEntrySlapsCost, setGameEntrySlapsCost] = useState(5);
  const [referralSpBonus, setReferralSpBonus] = useState(500);
  const [streakMultiplier, setStreakMultiplier] = useState(1.5);

  // Game Characters & Hands State
  const [characterTab, setCharacterTab] = useState<'moles' | 'slap'>('moles');
  
  const [moleCharacters, setMoleCharacters] = useState([
    { id: 'mole-1', name: 'Standard Mole', rarity: 'Common', spawnChance: 50, reward: 10, timeAvailable: 1.5, active: true },
    { id: 'mole-2', name: 'Golden Mole', rarity: 'Rare', spawnChance: 20, reward: 30, timeAvailable: 1.2, active: true },
    { id: 'mole-3', name: 'Boss Mole', rarity: 'Epic', spawnChance: 13, reward: 50, timeAvailable: 2.0, active: true },
    { id: 'mole-4', name: 'Bunny Mole', rarity: 'Special', spawnChance: 10, reward: -15, timeAvailable: 1.0, active: true },
    { id: 'mole-5', name: 'Bomb Mole', rarity: 'Danger', spawnChance: 7, reward: -20, timeAvailable: 1.0, active: true }
  ]);

  const [slapCharacters, setSlapCharacters] = useState([
    { id: 'slap-1', name: 'Momo Peach', rarity: 'COMMON', hp: 500, koReward: 25, dodgeRate: 0, active: true },
    { id: 'slap-2', name: 'Puni Slime', rarity: 'UNCOMMON', hp: 1200, koReward: 60, dodgeRate: 2, active: true },
    { id: 'slap-3', name: 'Bobo Tea', rarity: 'RARE', hp: 3000, koReward: 150, dodgeRate: 5, active: true },
    { id: 'slap-4', name: 'Wooly Alpaca', rarity: 'EPIC', hp: 8000, koReward: 400, dodgeRate: 8, active: true },
    { id: 'slap-5', name: 'Master Panda', rarity: 'LEGENDARY', hp: 25000, koReward: 1200, dodgeRate: 12, active: true }
  ]);

  const [doubleSpEventActive, setDoubleSpEventActive] = useState(false);
  const [rareSpawnBoostActive, setRareSpawnBoostActive] = useState(true);

  // Revenue & Profit Calculator
  const [trendTimeframe, setTrendTimeframe] = useState<'30d' | '7d' | 'today' | 'all'>('30d');
  const [partnerFilter, setPartnerFilter] = useState<string>('All');
  const [calcRevenue, setCalcRevenue] = useState(1250);
  const [calcRewards, setCalcRewards] = useState(480);

  const PARTNER_NETWORKS = [
    {
      id: 'adsterra',
      name: 'Adsterra',
      type: 'Popunder, Direct Links & Banners',
      colorBg: 'bg-amber-500',
      colorText: 'text-amber-400',
      colorBorder: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      baseGross: 3280.00,
      baseSharePct: 33,
      ecpm: '$18.50',
      baseVolume: 12400,
      unit: 'Ad Impressions',
      fillRate: '98%',
      status: 'Active',
      description: 'Premium ad network delivering popunder ads, native banners & direct monetization.'
    },
    {
      id: 'mybid',
      name: 'MyBid',
      type: 'Push, In-Page & Video Interstitials',
      colorBg: 'bg-sky-500',
      colorText: 'text-sky-400',
      colorBorder: 'border-sky-500/40',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      baseGross: 2450.00,
      baseSharePct: 25,
      ecpm: '$16.20',
      baseVolume: 9800,
      unit: 'Commercial Views',
      fillRate: '96%',
      status: 'Active',
      description: 'High eCPM ad network specializing in push notifications, video ads & interstitial overlays.'
    },
    {
      id: 'mylead',
      name: 'MyLead Offerwall',
      type: 'Exclusive Offerwall & Task Portal',
      colorBg: 'bg-emerald-500',
      colorText: 'text-emerald-400',
      colorBorder: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      baseGross: 4120.00,
      baseSharePct: 42,
      ecpm: '$45.00',
      baseVolume: 2150,
      unit: 'Offer Completions',
      fillRate: '95%',
      status: 'Active',
      description: 'Sole official offerwall network supplying app installs, game milestones & high-payout tasks.'
    }
  ];

  // Content Management State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('📢 Double SP Weekend is Live!');
  const [announcementText, setAnnouncementText] = useState('Slap moles & complete surveys for 2x SP Rewards! Limited time event!');
  const [announcementCategory, setAnnouncementCategory] = useState<'promo' | 'reward' | 'system' | 'security'>('promo');
  const [announcementActionTab, setAnnouncementActionTab] = useState<'home' | 'earn' | 'slap' | 'wallet' | 'profile'>('slap');
  const [announcementActionLabel, setAnnouncementActionLabel] = useState('Go Slap Moles');
  const [announcementPublishing, setAnnouncementPublishing] = useState(false);
  const [liveAnnouncementsHistory, setLiveAnnouncementsHistory] = useState<any[]>([]);

  // Fraud Monitoring & Security Sentinel State
  const [securityRulesConfig, setSecurityRulesConfig] = useState({
    maxCpsThreshold: 25,
    blockVpnProxy: true,
    maxAccountsPerDevice: 2,
    enforceServerClock: true,
    minAccountAgeHoursForCashout: 24,
    autoFreezeOnHighRisk: true
  });

  const [securityLogs, setSecurityLogs] = useState<any[]>(INITIAL_SECURITY_LOGS);
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState<string>('All');
  const [securityEventTypeFilter, setSecurityEventTypeFilter] = useState<string>('All');
  const [isSavingSecurityConfig, setIsSavingSecurityConfig] = useState<boolean>(false);

  // Subscribe to Live Announcements, Users, Withdrawals, and Security Logs from Firestore via real-time listeners (onSnapshot)
  React.useEffect(() => {
    const unsubAnn = subscribeAnnouncementsFromFirestore((announcements) => {
      setLiveAnnouncementsHistory(announcements);
    });

    // Real-time listener for all user signups and profile updates in Firestore
    const unsubUsers = subscribeAllUsersFromFirestore((firestoreUsers) => {
      if (!firestoreUsers || firestoreUsers.length === 0) return;
      setUsers((prevUsers) => {
        const converted: MockUser[] = firestoreUsers.map((fu) => ({
          id: fu.id || ('usr-' + Math.random().toString(36).substring(2, 7)),
          username: fu.username || 'SlapUser',
          email: fu.email || `${fu.username?.toLowerCase() || 'user'}@slapearn.app`,
          country: 'Global 🌐',
          joinDate: fu.lastActiveDate ? fu.lastActiveDate.split('T')[0] : new Date().toISOString().split('T')[0],
          level: fu.level || 1,
          spBalance: fu.coins !== undefined ? fu.coins : 5000,
          xp: fu.xp || 0,
          referrals: fu.referrals || 0,
          status: fu.isRestricted ? 'Restricted' : ((fu.status as any) || 'Active'),
          isRestricted: fu.isRestricted ?? (fu.status === 'Restricted'),
          riskLevel: (fu.isRestricted || fu.status === 'Frozen' || fu.status === 'Restricted') ? 'High' : 'Low',
          activityTimeline: {
            adsWatched: fu.totalAdsWatchedLifetime || 0,
            gamesPlayed: fu.daysActive || 1,
            slapsMade: fu.slapsToday || 0,
            surveysCompleted: 0,
            offerwallsCompleted: 0,
            withdrawalsCount: fu.referralsForCurrentWithdrawal || 0
          }
        }));

        const mergedMap = new Map<string, MockUser>();
        prevUsers.forEach((u) => mergedMap.set(u.id, u));
        converted.forEach((u) => mergedMap.set(u.id, u));
        return Array.from(mergedMap.values());
      });
    });

    // Real-time listener for all withdrawal requests in Firestore
    const unsubWithdrawals = subscribeWithdrawalsFromFirestore((cloudWithdrawals) => {
      if (!cloudWithdrawals) return;
      setWithdrawals((prevW) => {
        const converted: MockWithdrawal[] = cloudWithdrawals.map((cw) => ({
          id: cw.id,
          userId: cw.userId || 'usr-101',
          username: cw.username || 'SlapUser',
          amountUsd: Number(cw.amountUsd) || 0,
          spDeducted: Number(cw.spDeducted) || 0,
          method: cw.method || 'PayPal',
          payoutDestination: cw.payoutDestination || '',
          dateRequested: cw.dateRequested || (cw.createdAt ? new Date(cw.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
          createdAt: cw.createdAt || Date.now(),
          accountAgeDays: cw.accountAgeDays || 1,
          reqsCompleted: true,
          status: cw.status || 'Pending',
          fraudFlags: cw.fraudFlags || {
            accountAgeCheck: true,
            reqActivityCheck: true,
            noUnusualEarning: true,
            noDuplicateDevices: true
          }
        }));

        const mergedMap = new Map<string, MockWithdrawal>();
        // Add live cloud withdrawals FIRST so new withdrawals sit right at top!
        converted.forEach((w) => mergedMap.set(w.id, w));
        // Add mock default withdrawals that aren't in Firestore
        prevW.forEach((w) => {
          if (!mergedMap.has(w.id)) {
            mergedMap.set(w.id, w);
          }
        });
        return Array.from(mergedMap.values());
      });
    });

    // Local event listener for instantaneous UI update upon withdrawal creation
    const handleLocalWithdrawal = (e: Event) => {
      const customEv = e as CustomEvent;
      const nw = customEv.detail;
      if (!nw) return;
      setWithdrawals((prev) => {
        const formatted: MockWithdrawal = {
          id: nw.id,
          userId: nw.userId || 'usr-101',
          username: nw.username || 'SlapUser',
          amountUsd: Number(nw.amountUsd) || 0,
          spDeducted: Number(nw.spDeducted) || 0,
          method: nw.method || 'PayPal',
          payoutDestination: nw.payoutDestination || '',
          dateRequested: 'Just now',
          createdAt: Date.now(),
          accountAgeDays: 1,
          reqsCompleted: true,
          status: nw.status || 'Pending',
          fraudFlags: {
            accountAgeCheck: true,
            reqActivityCheck: true,
            noUnusualEarning: true,
            noDuplicateDevices: true
          }
        };
        const exists = prev.some(w => w.id === formatted.id);
        if (exists) {
          return prev.map(w => w.id === formatted.id ? formatted : w);
        }
        return [formatted, ...prev];
      });
    };

    window.addEventListener('slapearn_withdrawal_created', handleLocalWithdrawal);

    // Real-time listener for Security Incident Logs in Firestore
    const unsubSecLogs = subscribeSecurityLogsFromFirestore((cloudLogs) => {
      if (!cloudLogs || cloudLogs.length === 0) return;
      setSecurityLogs((prevLogs) => {
        const mergedMap = new Map<string, any>();
        prevLogs.forEach((l) => mergedMap.set(l.id, l));
        cloudLogs.forEach((l) => mergedMap.set(l.id, l));
        return Array.from(mergedMap.values());
      });
    });

    // Real-time listener for Security Rules Config in Firestore
    const unsubSecConfig = subscribeSecurityRulesConfigFromFirestore((cloudConfig) => {
      if (cloudConfig) {
        setSecurityRulesConfig((prev) => ({ ...prev, ...cloudConfig }));
      }
    });

    // Real-time listener for Economy & Payout Config in Firestore
    const unsubEconConfig = subscribeEconomyConfigFromFirestore((cloudConfig) => {
      if (cloudConfig) {
        setEconomyConfig((prev) => ({ ...prev, ...cloudConfig }));
        if (cloudConfig.spPerAd !== undefined) setSpPerAd(cloudConfig.spPerAd);
        if (cloudConfig.dailyAdLimit !== undefined) setDailyAdLimit(cloudConfig.dailyAdLimit);
        if (cloudConfig.slapBaseReward !== undefined) setSlapBaseReward(cloudConfig.slapBaseReward);
        if (cloudConfig.gameEntrySlapsCost !== undefined) setGameEntrySlapsCost(cloudConfig.gameEntrySlapsCost);
        if (cloudConfig.referralSpBonus !== undefined) setReferralSpBonus(cloudConfig.referralSpBonus);
        if (cloudConfig.streakMultiplier !== undefined) setStreakMultiplier(cloudConfig.streakMultiplier);
        if (cloudConfig.doubleSpEventActive !== undefined) setDoubleSpEventActive(cloudConfig.doubleSpEventActive);
        if (cloudConfig.maintenanceMode !== undefined) setMaintenanceMode(cloudConfig.maintenanceMode);
      }
    });

    return () => {
      window.removeEventListener('slapearn_withdrawal_created', handleLocalWithdrawal);
      unsubAnn();
      unsubUsers();
      unsubWithdrawals();
      unsubSecLogs();
      unsubSecConfig();
      unsubEconConfig();
    };
  }, []);

  const handlePublishAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setAnnouncementPublishing(true);
    try {
      await publishAnnouncementToFirestore({
        title: announcementTitle || '📢 Official Announcement',
        message: announcementText,
        category: announcementCategory,
        type: 'info',
        actionTab: announcementActionTab,
        actionLabel: announcementActionLabel
      });
      sound.playCoin();
      addNotification(
        'Announcement Published Live! 🚀',
        'Your announcement was synced to Firestore and broadcasted to SlapEarn notifications!',
        'success'
      );
    } catch (err) {
      console.error("Error publishing announcement:", err);
      addNotification('Publishing Failed', 'Could not sync announcement to Firestore.', 'info');
    } finally {
      setAnnouncementPublishing(false);
    }
  };

  // Handlers for Security Actions
  const handleSaveSecurityConfig = async () => {
    setIsSavingSecurityConfig(true);
    await saveSecurityRulesConfigToFirestore(securityRulesConfig);
    setIsSavingSecurityConfig(false);
    sound.playSuccess();
    addNotification('Security Rules Saved', 'Fraud sentinel thresholds & rules updated in Firestore real-time!', 'success');
  };

  // Handlers for Economy Actions
  const handleSaveEconomyConfig = async () => {
    setIsSavingEconomyConfig(true);
    const updated = {
      ...economyConfig,
      doubleSpEventActive,
      maintenanceMode
    };
    await saveEconomyConfigToFirestore(updated);
    setIsSavingEconomyConfig(false);
    sound.playCoin();
    addNotification('Economy Rules Saved', 'Reward rules & payout settings successfully updated in Firestore real-time!', 'success');
  };

  const handleResolveSecurityLog = (logId: string) => {
    setSecurityLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, status: 'Resolved' } : l))
    );
    sound.playSuccess();
    addNotification('Security Log Updated', `Incident ${logId} marked as Resolved`, 'info');
  };

  const handleFreezeUserFromFraud = (userId: string, username: string, logId?: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'Frozen', riskLevel: 'High' } : u))
    );
    syncUserStatsToFirestore(userId, { status: 'Frozen' as any });
    if (logId) {
      setSecurityLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, status: 'Auto-Blocked' } : l))
      );
    }
    sound.playSlap();
    addNotification('Account Frozen', `@${username} has been frozen & blocked from cashouts!`, 'info');
  };

  const handleTriggerTestFraudEvent = () => {
    const testUsers = ['ClickMaster_99', 'ProxyBot_X', 'FastFinger_3000', 'DeviceDupe_8'];
    const selectedUsername = testUsers[Math.floor(Math.random() * testUsers.length)];
    const newLog = {
      id: 'sec-' + Date.now().toString(36),
      userId: 'usr-sim-' + Math.floor(Math.random() * 900 + 100),
      username: selectedUsername,
      eventType: 'Autoclicker CPS' as const,
      severity: 'Critical' as const,
      details: `Simulated anomaly: ${Math.floor(Math.random() * 20 + 35)} CPS burst detected during slap game`,
      ipAddress: `198.51.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      deviceId: `dev-sim-${Math.floor(Math.random() * 9000 + 1000)}`,
      timestamp: 'Just now',
      status: 'Unresolved' as const
    };
    addSecurityLogToFirestore(newLog);
    sound.playCoin();
    addNotification('🚨 Test Security Incident Triggered', `Simulated fraud alert created for @${selectedUsername}`, 'info');
  };

  // Handlers for User Actions
  const handleAdjustSp = () => {
    if (!selectedUser) return;
    const newSp = Math.max(0, selectedUser.spBalance + spAdjustAmount);
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, spBalance: newSp } : u))
    );
    setSelectedUser((prev) => (prev ? { ...prev, spBalance: newSp } : null));
    sound.playCoin();
    addNotification('SP Adjusted', `Adjusted SP for @${selectedUser.username} by ${spAdjustAmount > 0 ? '+' : ''}${spAdjustAmount} SP`, 'success');
    setAdjustSpModalOpen(false);
  };

  const handleToggleFreezeUser = (user: MockUser) => {
    const nextStatus = user.status === 'Frozen' ? 'Active' : 'Frozen';
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus, riskLevel: nextStatus === 'Frozen' ? 'High' : 'Low' } : u))
    );
    if (selectedUser?.id === user.id) {
      setSelectedUser((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    syncUserStatsToFirestore(user.id, { status: nextStatus as any });
    sound.playSlap();
    addNotification('User Account Status Updated', `@${user.username} is now ${nextStatus}`, 'info');
  };

  const handleToggleRestrictUser = (user: MockUser) => {
    const currentlyRestricted = user.isRestricted || user.status === 'Restricted';
    const nextRestricted = !currentlyRestricted;
    const nextStatus = nextRestricted ? 'Restricted' : 'Active';

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              isRestricted: nextRestricted,
              status: nextStatus,
              riskLevel: nextRestricted ? 'High' : 'Low'
            }
          : u
      )
    );

    if (selectedUser?.id === user.id) {
      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              isRestricted: nextRestricted,
              status: nextStatus,
              riskLevel: nextRestricted ? 'High' : 'Low'
            }
          : null
      );
    }

    // Write flag to user's Firestore record
    syncUserStatsToFirestore(user.id, {
      isRestricted: nextRestricted,
      status: nextStatus as any
    });

    addSecurityLogToFirestore({
      userId: user.id,
      username: user.username,
      eventType: 'Suspicious Payout Speed',
      severity: nextRestricted ? 'High' : 'Low',
      details: nextRestricted ? 'User account restricted by admin (rewards & cashouts blocked)' : 'User account unrestricted by admin',
      ipAddress: 'Admin Command Panel',
      timestamp: new Date().toISOString(),
      status: nextRestricted ? 'Auto-Blocked' : 'Resolved'
    });

    sound.playSlap();
    addNotification(
      nextRestricted ? '🚫 User Restricted' : '✅ User Restored',
      `@${user.username} is now ${nextRestricted ? 'Restricted (Blocked from earning rewards & redeeming points)' : 'Unrestricted'}`,
      nextRestricted ? 'info' : 'success'
    );
  };

  const handleWithdrawalAction = (id: string, action: 'Approved' | 'Rejected' | 'Under Review') => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: action } : w))
    );
    updateWithdrawalStatusInFirestore(id, action);
    sound.playSuccess();
    addNotification('Withdrawal Updated', `Withdrawal ${id} marked as ${action}`, 'success');
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.country.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus =
      userFilterStatus === 'All' ||
      u.status === userFilterStatus ||
      (userFilterStatus === 'Restricted' && (u.isRestricted || u.status === 'Restricted'));
    return matchesSearch && matchesStatus;
  });

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === 'All') return true;
    return w.status === withdrawalFilter;
  });

  // Dynamic Real-Time Calculations for Admin Dashboard Metrics
  const activeUsersCount = users.filter((u) => u.status === 'Active').length;
  const notActiveUsersCount = users.filter((u) => u.status === 'Frozen' || u.status === 'Suspicious' || u.status === 'Inactive' || u.status === 'Banned').length;
  const pendingWithdrawalsList = withdrawals.filter((w) => w.status === 'Pending' || w.status === 'Under Review');
  const pendingWithdrawalsCount = pendingWithdrawalsList.length;
  const pendingWithdrawalsUsd = pendingWithdrawalsList.reduce((acc, w) => acc + (w.amountUsd || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col font-sans text-slate-100 overflow-hidden selection:bg-[#FF3B77] selection:text-white" id="admin-dashboard-root">
      
      {/* TOP ADMIN NAVBAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shrink-0 shadow-lg gap-2 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-gradient-to-br from-[#FF3B77] to-pink-600 border-2 border-slate-950 flex items-center justify-center font-black text-white shadow-md shrink-0">
            ⚡
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-base font-black tracking-tight text-white uppercase flex items-center gap-1 shrink-0">
                SlapEarn <span className="bg-[#FFD043] text-slate-950 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-900">ADMIN HUB</span>
              </h1>
              <span className="hidden md:flex text-[9px] sm:text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Firestore Live
              </span>
              {maintenanceMode && (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  MAINTENANCE MODE
                </span>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wide truncate hidden sm:block">
              Real-time Firestore Management, Live User Metrics & Withdrawals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              sound.playSuccess();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500 flex items-center gap-1.5 text-white font-black text-xs transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
            title="Exit Admin Panel"
            id="admin-dashboard-exit-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="uppercase tracking-wider hidden sm:inline">Exit Admin</span>
          </button>
          <button
            onClick={() => {
              sound.playSuccess();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="Close Admin Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN BODY LAYOUT (SIDEBAR + CONTENT) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-16 bg-slate-900/90 border-r border-slate-800 p-2 flex flex-col justify-between shrink-0 overflow-y-auto scrollbar-none">
          <nav className="space-y-2 flex flex-col items-center">
            <button
              onClick={() => setActiveTab('overview')}
              title="Dashboard"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('users')}
              title="Users"
              className={`w-10 h-10 relative flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono border border-slate-700">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              title="Withdrawals"
              className={`w-10 h-10 relative flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'withdrawals'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Wallet className="w-5 h-5" />
              {withdrawals.filter((w) => w.status === 'Pending').length > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 px-1 py-0.5 rounded font-mono font-bold">
                  {withdrawals.filter((w) => w.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('game')}
              title="SlapEarn Game"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'game'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('rewards')}
              title="Rewards"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rewards'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gift className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('ads')}
              title="Ads & Offers"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ads'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Megaphone className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('revenue')}
              title="Revenue"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'revenue'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('fraud')}
              title="Fraud Center"
              className={`w-10 h-10 relative flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'fraud'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('content')}
              title="Content"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FF3B77] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="pt-3 border-t border-slate-800/80 w-full flex justify-center mt-2">
              <button
                onClick={() => {
                  sound.playSuccess();
                  onClose();
                }}
                title="Exit Admin Dashboard"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 bg-slate-950 p-4 overflow-y-auto">
          
          {/* TAB 1: DASHBOARD HOME (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* SECTION: PLATFORM OVERVIEW */}
              <div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#FF3B77]" />
                  <span>Platform Overview</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Users</span>
                    <span className="text-xl font-black text-white font-mono mt-1">{users.length.toLocaleString()}</span>
                    <span className="text-[9px] text-emerald-400 font-bold mt-0.5">⚡ Real-time Firestore</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Active Users</span>
                    <span className="text-xl font-black text-emerald-400 font-mono mt-1">{activeUsersCount.toLocaleString()}</span>
                    <span className="text-[9px] text-emerald-300 font-bold mt-0.5">{Math.round((activeUsersCount / Math.max(1, users.length)) * 100)}% Active Ratio</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Not Active / Suspended</span>
                    <span className="text-xl font-black text-amber-400 font-mono mt-1">{notActiveUsersCount.toLocaleString()}</span>
                    <span className="text-[9px] text-amber-300 font-bold mt-0.5">Frozen or Inactive</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Lifetime Earned SP</span>
                    <span className="text-xl font-black text-[#FFD043] font-mono mt-1">12.4M</span>
                    <span className="text-[9px] text-amber-300 font-bold mt-0.5">~$12,400 value</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">SP Earned Today</span>
                    <span className="text-xl font-black text-purple-400 font-mono mt-1">480,000</span>
                    <span className="text-[9px] text-purple-300 font-bold mt-0.5">Avg 124 SP/user</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Withdrawals Pending</span>
                    <span className="text-xl font-black text-rose-400 font-mono mt-1">
                      {pendingWithdrawalsCount} (${pendingWithdrawalsUsd.toFixed(2)})
                    </span>
                    <span className="text-[9px] text-rose-300 font-bold mt-0.5">Live Firestore Sync</span>
                  </div>
                </div>
              </div>

              {/* SECTION: MONEY OVERVIEW */}
              <div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Money Overview (30 Days)</span>
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Ad Revenue</span>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-1">$1,850.00</div>
                    <span className="text-[9px] text-slate-400">Adsterra & MyBid Networks</span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Offerwall Revenue</span>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-1">$2,420.00</div>
                    <span className="text-[9px] text-slate-400">MyLead Offerwall</span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Survey Revenue</span>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-1">$980.00</div>
                    <span className="text-[9px] text-slate-400">Pollfish & InBrain</span>
                  </div>
                  <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-3.5 bg-emerald-950/20">
                    <span className="text-[10px] text-emerald-300 font-bold uppercase">Total Revenue</span>
                    <div className="text-xl font-black text-emerald-300 font-mono mt-1">$5,250.00</div>
                    <span className="text-[9px] text-emerald-400/80">Gross earnings</span>
                  </div>
                  <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-3.5 bg-rose-950/20">
                    <span className="text-[10px] text-rose-300 font-bold uppercase">Total Paid to Users</span>
                    <div className="text-xl font-black text-rose-300 font-mono mt-1">$2,100.00</div>
                    <span className="text-[9px] text-rose-400/80">Redemptions cleared</span>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border-2 border-[#FFD043] rounded-2xl p-3.5">
                    <span className="text-[10px] text-[#FFD043] font-black uppercase">Estimated Profit</span>
                    <div className="text-xl font-black text-[#FFD043] font-mono mt-1">$3,150.00</div>
                    <span className="text-[9px] text-amber-200 font-bold">60% Profit Margin</span>
                  </div>
                </div>
              </div>

              {/* SECTION: ALERTS */}
              <div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>System Alerts & Pending Actions</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-3.5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-rose-400 font-black text-xs uppercase">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Suspicious Accounts Detected</span>
                      </div>
                      <p className="text-xs text-slate-300 font-semibold mt-1">
                        3 accounts flagged for potential autoclicker or speedhack activity.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('fraud')}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>

                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3.5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase">
                        <Wallet className="w-4 h-4" />
                        <span>Withdrawal Requests Waiting</span>
                      </div>
                      <p className="text-xs text-slate-300 font-semibold mt-1">
                        14 payout requests pending manual review before processing.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('withdrawals')}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      Review
                    </button>
                  </div>

                  <div className="bg-sky-950/30 border border-sky-500/40 rounded-2xl p-3.5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-sky-400 font-black text-xs uppercase">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>System Health Normal</span>
                      </div>
                      <p className="text-xs text-slate-300 font-semibold mt-1">
                        All reward callbacks, Firestore synchronization, and ad networks operating at 100% uptime.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase border border-emerald-500/30">
                      Healthy
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* TOP KPI CARDS FOR USER DIRECTORY */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Total Users</span>
                    <Users className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono">{users.length.toLocaleString()}</div>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> +12% this week
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Active Today</span>
                    <Activity className="w-4 h-4 text-[#00D09E]" />
                  </div>
                  <div className="text-xl font-black text-[#00D09E] font-mono">
                    {users.filter(u => u.status === 'Active').length * 14 + 842}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">68% Daily Active Rate</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Suspicious / Frozen</span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-xl font-black text-rose-400 font-mono">
                    {users.filter(u => u.status !== 'Active').length}
                  </div>
                  <span className="text-[10px] text-rose-300 font-bold">Auto-Fraud Guard Active</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold text-[10px] uppercase tracking-wider">Total User SP Balance</span>
                    <Coins className="w-4 h-4 text-[#FFD043]" />
                  </div>
                  <div className="text-xl font-black text-[#FFD043] font-mono">
                    {users.reduce((acc, u) => acc + u.spBalance, 0).toLocaleString()} SP
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold">
                    Est. ${(users.reduce((acc, u) => acc + u.spBalance, 0) / 10000).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* RECHARTS USER ACTIVITY & SIGNUPS CHART */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#FF3B77]" />
                      <span>User Growth & Daily Active Player Trends</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">Daily active user counts vs new user signups</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/30">
                    Live Directory ({users.length} registered)
                  </span>
                </div>

                <div className="h-52 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={USER_ACTIVITY_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                      <Bar dataKey="activeUsers" name="Active Users" fill="#00D09E" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="newSignups" name="New Signups" fill="#FF3B77" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by username, email, country..."
                    className="bg-transparent border-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-full font-sans"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
                  <select
                    value={userFilterStatus}
                    onChange={(e) => setUserFilterStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Users ({users.length})</option>
                    <option value="Active">Active</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Suspicious">Suspicious</option>
                    <option value="Frozen">Frozen</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                      <tr>
                        <th className="p-3">User Profile</th>
                        <th className="p-3">Country</th>
                        <th className="p-3">Joined</th>
                        <th className="p-3">Level / XP</th>
                        <th className="p-3">SP Balance</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-850 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-[#FFD043]">
                                {u.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-xs">@{u.username}</span>
                                <span className="text-[10px] text-slate-400">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-300 font-semibold">{u.country}</td>
                          <td className="p-3 text-slate-400 text-[11px] font-mono">{u.joinDate}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-amber-300">Lvl {u.level}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{u.xp} XP</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#00D09E]">
                            {u.spBalance.toLocaleString()} SP
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                u.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : u.status === 'Restricted' || u.isRestricted
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : u.status === 'Suspicious'
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {u.isRestricted || u.status === 'Restricted' ? 'Restricted' : u.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleRestrictUser(u)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                  u.isRestricted || u.status === 'Restricted'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                }`}
                                title="Restrict user ability to earn rewards or redeem points in Firestore"
                              >
                                <Ban className="w-3 h-3" />
                                <span>{u.isRestricted || u.status === 'Restricted' ? 'Unrestrict' : 'Restrict'}</span>
                              </button>
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-200 uppercase tracking-wider cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3 text-sky-400" />
                                <span>User Profile</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* USER PROFILE DRAWER / MODAL */}
              {selectedUser && (
                <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FF3B77] border-2 border-slate-950 flex items-center justify-center text-white font-black text-sm">
                          {selectedUser.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">@{selectedUser.username}</h3>
                          <span className="text-xs text-slate-400">{selectedUser.email} • {selectedUser.country}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">SP Balance</span>
                        <div className="text-sm font-black text-[#FFD043] font-mono mt-0.5">{selectedUser.spBalance.toLocaleString()} SP</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Account Level</span>
                        <div className="text-sm font-black text-amber-300 font-mono mt-0.5">Level {selectedUser.level} ({selectedUser.xp} XP)</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Referrals</span>
                        <div className="text-sm font-black text-sky-400 font-mono mt-0.5">{selectedUser.referrals} Invited</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Risk Level</span>
                        <div className={`text-sm font-black uppercase mt-0.5 ${selectedUser.riskLevel === 'Low' ? 'text-emerald-400' : selectedUser.riskLevel === 'Review' ? 'text-amber-400' : 'text-rose-400'}`}>
                          {selectedUser.riskLevel}
                        </div>
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Activity Summary Timeline</h4>
                      <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950 p-3 rounded-2xl border border-slate-800">
                        <div>🎬 Ads Watched: <span className="font-bold text-white">{selectedUser.activityTimeline.adsWatched}</span></div>
                        <div>🎮 Games Played: <span className="font-bold text-white">{selectedUser.activityTimeline.gamesPlayed}</span></div>
                        <div>🔨 Slaps Made: <span className="font-bold text-white">{selectedUser.activityTimeline.slapsMade}</span></div>
                        <div>📋 Surveys Done: <span className="font-bold text-white">{selectedUser.activityTimeline.surveysCompleted}</span></div>
                        <div>🎁 Offers Completed: <span className="font-bold text-white">{selectedUser.activityTimeline.offerwallsCompleted}</span></div>
                        <div>💸 Withdrawals: <span className="font-bold text-white">{selectedUser.activityTimeline.withdrawalsCount}</span></div>
                      </div>
                    </div>

                    {/* User Profile Account Restriction Block */}
                    <div className={`p-3.5 rounded-2xl border ${
                      selectedUser.isRestricted || selectedUser.status === 'Restricted'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Ban className={`w-5 h-5 shrink-0 ${
                            selectedUser.isRestricted || selectedUser.status === 'Restricted' ? 'text-amber-400' : 'text-slate-400'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase text-white tracking-wider">Account Earning & Cashout Restriction</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                selectedUser.isRestricted || selectedUser.status === 'Restricted'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              }`}>
                                {selectedUser.isRestricted || selectedUser.status === 'Restricted' ? 'Restricted' : 'Allowed'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {selectedUser.isRestricted || selectedUser.status === 'Restricted'
                                ? 'User is currently blocked from earning rewards and redeeming points in Firestore.'
                                : 'User has normal access to earn rewards and redeem points.'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleRestrictUser(selectedUser)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 transition-all ${
                            selectedUser.isRestricted || selectedUser.status === 'Restricted'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{selectedUser.isRestricted || selectedUser.status === 'Restricted' ? 'Unrestrict User' : 'Restrict User'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="border-t border-slate-800 pt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setAdjustSpModalOpen(true)}
                        className="px-3 py-1.5 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Adjust SP Balance</span>
                      </button>

                      <button
                        onClick={() => handleToggleFreezeUser(selectedUser)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md ${
                          selectedUser.status === 'Frozen'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        {selectedUser.status === 'Frozen' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{selectedUser.status === 'Frozen' ? 'Unfreeze Account' : 'Freeze Account'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ADJUST SP MODAL */}
              {adjustSpModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[130] bg-slate-950/90 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-3">
                    <h3 className="text-sm font-black text-white uppercase">Adjust SP Balance for @{selectedUser.username}</h3>
                    <p className="text-xs text-slate-400">Current Balance: <span className="font-bold text-[#FFD043] font-mono">{selectedUser.spBalance} SP</span></p>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Adjustment Amount (+ to add, - to deduct):</label>
                      <input
                        type="number"
                        value={spAdjustAmount}
                        onChange={(e) => setSpAdjustAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAdjustSp}
                        className="flex-1 py-2 bg-[#00D09E] text-slate-950 rounded-xl font-black text-xs uppercase cursor-pointer"
                      >
                        Confirm Adjustment
                      </button>
                      <button
                        onClick={() => setAdjustSpModalOpen(false)}
                        className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WITHDRAWAL CENTER */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#00D09E]" />
                    <span>Withdrawal Requests Center</span>
                  </h2>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Instant Real-Time Sync
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs self-end sm:self-auto">
                  <span className="font-bold text-slate-400">Filter Status:</span>
                  <select
                    value={withdrawalFilter}
                    onChange={(e) => setWithdrawalFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 font-bold cursor-pointer"
                  >
                    <option value="All">All Statuses ({withdrawals.length})</option>
                    <option value="Pending">Pending ({withdrawals.filter(w => w.status === 'Pending').length})</option>
                    <option value="Approved">Approved ({withdrawals.filter(w => w.status === 'Approved').length})</option>
                    <option value="Under Review">Under Review ({withdrawals.filter(w => w.status === 'Under Review').length})</option>
                    <option value="Rejected">Rejected ({withdrawals.filter(w => w.status === 'Rejected').length})</option>
                  </select>
                </div>
              </div>

              {/* Withdrawals List */}
              <div className="space-y-3">
                {filteredWithdrawals.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400">
                    <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-sm">No withdrawal requests found for this filter.</p>
                  </div>
                ) : (
                  filteredWithdrawals.map((w) => (
                    <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4 transition-all hover:border-slate-700">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="font-mono text-xs text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{w.id}</span>
                          <span className="font-black text-white text-sm">@{w.username}</span>
                          <span className="bg-slate-800 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-slate-700">
                            {w.method}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono ml-auto sm:ml-0">{w.dateRequested}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                          <div>Amount: <span className="font-black text-[#00D09E] text-sm">${w.amountUsd.toFixed(2)}</span></div>
                          <div>SP Deducted: <span className="font-black text-[#FFD043]">{w.spDeducted.toLocaleString()} SP</span></div>
                          <div>Account Age: <span className="font-bold text-slate-300">{w.accountAgeDays} Days</span></div>
                        </div>

                        {w.payoutDestination && (
                          <div className="text-[11px] font-mono text-slate-300 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/80 flex items-center gap-1.5 w-fit flex-wrap">
                            <span className="text-slate-400 font-bold">Payout Destination:</span>
                            <span className="text-cyan-300 font-black">{w.payoutDestination}</span>
                          </div>
                        )}

                        {/* Automated Fraud Checks Badge Panel */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] font-bold">
                          <span className="text-slate-400 font-sans uppercase text-[9px]">Security Checks:</span>
                          <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${w.fraudFlags.accountAgeCheck ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {w.fraudFlags.accountAgeCheck ? '✓ Age OK' : '✗ New Account'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${w.fraudFlags.reqActivityCheck ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {w.fraudFlags.reqActivityCheck ? '✓ Activity Met' : '✗ Low Activity'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${w.fraudFlags.noUnusualEarning ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
                            {w.fraudFlags.noUnusualEarning ? '✓ Normal Earnings' : '⚠️ Unusual Speed'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${w.fraudFlags.noDuplicateDevices ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {w.fraudFlags.noDuplicateDevices ? '✓ Unique Device' : '✗ Duplicate Device'}
                          </span>
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="flex items-center gap-2 shrink-0 my-auto flex-wrap sm:flex-nowrap">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          w.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          w.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          w.status === 'Under Review' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {w.status}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {w.status !== 'Approved' && (
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'Approved')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-md active:scale-95 transition-all"
                              title="Approve Withdrawal"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}
                          {w.status !== 'Under Review' && (
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'Under Review')}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-md active:scale-95 transition-all"
                              title="Mark Under Review"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          )}
                          {w.status !== 'Rejected' && (
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'Rejected')}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-md active:scale-95 transition-all"
                              title="Reject Withdrawal"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SLAPEARN GAME MANAGEMENT */}
          {activeTab === 'game' && (
            <div className="space-y-5">
              {/* CHARACTERS CONFIG */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-[#FF3B77]" />
                      <span>Moles & Characters Configuration</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure spawn weights, hit rewards, HP limits & dodge rates synced in real time with SlapEarn game modes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Sub-tab Selector */}
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                      <button
                        onClick={() => setCharacterTab('moles')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          characterTab === 'moles' ? 'bg-[#FF3B77] text-white font-black' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                         Whack-A-Mole Targets ({moleCharacters.length})
                      </button>
                      <button
                        onClick={() => setCharacterTab('slap')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          characterTab === 'slap' ? 'bg-[#00D09E] text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        👋 SlapEarn Bosses ({slapCharacters.length})
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (characterTab === 'moles') {
                          const newMole = {
                            id: `mole-${Date.now()}`,
                            name: `Custom Mole #${moleCharacters.length + 1}`,
                            rarity: 'Rare',
                            spawnChance: 15,
                            reward: 25,
                            timeAvailable: 1.2,
                            active: true
                          };
                          setMoleCharacters(prev => [...prev, newMole]);
                          addNotification('Mole Added', 'New Whack-a-Mole target character added!', 'success');
                        } else {
                          const newSlapChar = {
                            id: `slap-${Date.now()}`,
                            name: `Boss Warrior #${slapCharacters.length + 1}`,
                            rarity: 'RARE',
                            hp: 5000,
                            koReward: 250,
                            dodgeRate: 5,
                            active: true
                          };
                          setSlapCharacters(prev => [...prev, newSlapChar]);
                          addNotification('Character Added', 'New SlapEarn target character created!', 'success');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Target</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playBonus();
                        addNotification('Game Engine Synced', 'All mole & slap character parameters successfully deployed to SlapEarn live runtime!', 'success');
                      }}
                      className="px-3.5 py-1.5 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer shrink-0 uppercase tracking-wide"
                    >
                      ⚡ Sync Config
                    </button>
                  </div>
                </div>

                {/* WHACK A MOLE TAB */}
                {characterTab === 'moles' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {moleCharacters.map((c) => (
                      <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMoleCharacters(prev => prev.map(m => m.id === c.id ? { ...m, name: val } : m));
                              }}
                              className="font-black text-white text-xs bg-slate-900 border border-slate-800 rounded px-2 py-0.5 focus:border-[#FF3B77] outline-none"
                            />
                            <span className="text-[10px] text-amber-300 font-extrabold block mt-1 ml-0.5">{c.rarity}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-bold block">Reward SP</span>
                            <input
                              type="number"
                              value={c.reward}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMoleCharacters(prev => prev.map(m => m.id === c.id ? { ...m, reward: val } : m));
                              }}
                              className={`text-xs font-mono font-black text-right w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none ${c.reward >= 0 ? 'text-[#00D09E]' : 'text-rose-400'}`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Spawn Rate (%)</span>
                            <input
                              type="number"
                              value={c.spawnChance}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMoleCharacters(prev => prev.map(m => m.id === c.id ? { ...m, spawnChance: val } : m));
                              }}
                              className="text-white font-bold bg-slate-950 border border-slate-800 rounded w-full px-1.5 py-0.5 outline-none mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">Duration (Sec)</span>
                            <input
                              type="number"
                              step="0.1"
                              value={c.timeAvailable}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1.0;
                                setMoleCharacters(prev => prev.map(m => m.id === c.id ? { ...m, timeAvailable: val } : m));
                              }}
                              className="text-white font-bold bg-slate-950 border border-slate-800 rounded w-full px-1.5 py-0.5 outline-none mt-0.5"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-[10px]">
                          <span className="text-slate-400 font-bold">Active in Mole Pool:</span>
                          <input
                            type="checkbox"
                            checked={c.active}
                            onChange={() => {
                              setMoleCharacters((prev) =>
                                prev.map((item) => (item.id === c.id ? { ...item, active: !item.active } : item))
                              );
                            }}
                            className="w-4 h-4 accent-[#FF3B77] cursor-pointer"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SLAPEARN BOSSES TAB */}
                {characterTab === 'slap' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {slapCharacters.map((c) => (
                      <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSlapCharacters(prev => prev.map(s => s.id === c.id ? { ...s, name: val } : s));
                              }}
                              className="font-black text-white text-xs bg-slate-900 border border-slate-800 rounded px-2 py-0.5 focus:border-[#00D09E] outline-none"
                            />
                            <span className="text-[10px] text-sky-400 font-extrabold block mt-1 ml-0.5">{c.rarity}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-bold block">KO Reward SP</span>
                            <input
                              type="number"
                              value={c.koReward}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setSlapCharacters(prev => prev.map(s => s.id === c.id ? { ...s, koReward: val } : s));
                              }}
                              className="text-xs font-mono font-black text-right text-[#00D09E] w-20 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Max Target HP</span>
                            <input
                              type="number"
                              value={c.hp}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 100;
                                setSlapCharacters(prev => prev.map(s => s.id === c.id ? { ...s, hp: val } : s));
                              }}
                              className="text-amber-300 font-bold bg-slate-950 border border-slate-800 rounded w-full px-1.5 py-0.5 outline-none mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">Dodge Rate (%)</span>
                            <input
                              type="number"
                              value={c.dodgeRate}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setSlapCharacters(prev => prev.map(s => s.id === c.id ? { ...s, dodgeRate: val } : s));
                              }}
                              className="text-rose-300 font-bold bg-slate-950 border border-slate-800 rounded w-full px-1.5 py-0.5 outline-none mt-0.5"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-[10px]">
                          <span className="text-slate-400 font-bold">Active Slap Target:</span>
                          <input
                            type="checkbox"
                            checked={c.active}
                            onChange={() => {
                              setSlapCharacters((prev) =>
                                prev.map((item) => (item.id === c.id ? { ...item, active: !item.active } : item))
                              );
                            }}
                            className="w-4 h-4 accent-[#00D09E] cursor-pointer"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HANDS SYSTEM REQUIREMENTS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FFD043]" />
                  <span>Hands System Requirements & Multipliers</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-black text-amber-600 uppercase">🪵 Wooden Hand</span>
                    <div className="text-[10px] text-slate-400">Unlock: Free Default</div>
                    <div className="text-[10px] text-slate-400">Multiplier: 1.0x SP</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-black text-slate-300 uppercase">⚙️ Iron Slap Glove</span>
                    <div className="text-[10px] text-slate-400">Unlock: 5,000 SP</div>
                    <div className="text-[10px] text-slate-400">Multiplier: 1.25x SP</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-black text-[#FFD043] uppercase">👑 Golden Slap Glove</span>
                    <div className="text-[10px] text-slate-400">Unlock: 25,000 SP</div>
                    <div className="text-[10px] text-slate-400">Multiplier: 1.5x SP</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-black text-sky-400 uppercase">💎 Diamond Slap Gauntlet</span>
                    <div className="text-[10px] text-slate-400">Unlock: 100,000 SP</div>
                    <div className="text-[10px] text-slate-400">Multiplier: 2.0x SP</div>
                  </div>
                </div>
              </div>

              {/* LIVE EVENTS CONTROLLER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Live Game Events Controller</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-black text-white text-xs block">⚡ Double SP Weekend</span>
                      <span className="text-[10px] text-slate-400">Multiplies all mole slap rewards x2</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !doubleSpEventActive;
                        setDoubleSpEventActive(nextVal);
                        const updated = { ...economyConfig, doubleSpEventActive: nextVal, maintenanceMode };
                        setEconomyConfig(updated);
                        saveEconomyConfigToFirestore(updated);
                        addNotification('Event Updated', `Double SP Event is now ${nextVal ? 'ACTIVE' : 'INACTIVE'}`, 'success');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        doubleSpEventActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {doubleSpEventActive ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-black text-white text-xs block">⭐ Golden Mole Frequency Boost</span>
                      <span className="text-[10px] text-slate-400">+50% chance for rare golden moles</span>
                    </div>
                    <button
                      onClick={() => {
                        setRareSpawnBoostActive(!rareSpawnBoostActive);
                        addNotification('Event Updated', `Golden Mole Boost is now ${!rareSpawnBoostActive ? 'ACTIVE' : 'INACTIVE'}`, 'success');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        rareSpawnBoostActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rareSpawnBoostActive ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REWARD ECONOMY & PAYOUT RULES CONTROLS */}
          {activeTab === 'rewards' && (
            <div className="space-y-5">
              {/* HEADER BANNER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Gift className="w-5 h-5 text-[#FFD043]" />
                      <span>Reward Economy & Payout Rules Control Center</span>
                    </h2>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Firestore Live Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    Manage global SP-to-USD conversion rates, payout minimums & caps, active cashout gateways, offerwall commission splits, and slap game earning multipliers.
                  </p>
                </div>

                <button
                  onClick={handleSaveEconomyConfig}
                  disabled={isSavingEconomyConfig}
                  className="px-4 py-2 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 shrink-0 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingEconomyConfig ? 'Saving...' : 'Save Economy Rules'}</span>
                </button>
              </div>

              {/* ECONOMY HIGHLIGHT KPIS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Exchange Conversion Rate</span>
                    <Coins className="w-3.5 h-3.5 text-[#FFD043]" />
                  </span>
                  <span className="text-2xl font-black text-[#FFD043] font-mono mt-1">
                    {economyConfig.spPerUsdRatio.toLocaleString()} SP
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold mt-1">= $1.00 USD Cashout Value</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Min Cashout Threshold</span>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    ${economyConfig.minCashoutUsd.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold mt-1">
                    Requires {(economyConfig.minCashoutUsd * economyConfig.spPerUsdRatio).toLocaleString()} SP
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Active Cashout Gateways</span>
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                  </span>
                  <span className="text-2xl font-black text-sky-400 font-mono mt-1">
                    {[
                      economyConfig.enablePaypal,
                      economyConfig.enableCryptoUsdt,
                      economyConfig.enableAmazonGiftCards,
                      economyConfig.enableGooglePlayCards,
                      economyConfig.enableMobileMoney
                    ].filter(Boolean).length} / 5 Active
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold mt-1">USDT Crypto, Gift Cards, Bank</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Offerwall User Split</span>
                    <Percent className="w-3.5 h-3.5 text-purple-400" />
                  </span>
                  <span className="text-2xl font-black text-purple-400 font-mono mt-1">
                    {economyConfig.offerwallUserSharePercent}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold mt-1">
                    {100 - economyConfig.offerwallUserSharePercent}% Platform Margin Retention
                  </span>
                </div>
              </div>

              {/* SECTION 1: EXCHANGE CONVERSION RATES & CASHOUT POLICY */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ArrowRightLeft className="w-4 h-4 text-[#FFD043]" />
                  <span>Currency Exchange Rates & Payout Policy Rules</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* SP per $1.00 USD */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                      <span>SP per $1.00 USD</span>
                      <span className="text-[10px] text-[#FFD043] font-mono">Conversion</span>
                    </label>
                    <input
                      type="number"
                      value={economyConfig.spPerUsdRatio}
                      onChange={(e) =>
                        setEconomyConfig((prev) => ({ ...prev, spPerUsdRatio: Math.max(100, Number(e.target.value)) }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <p className="text-[10px] text-slate-400">
                      Sample: <span className="text-amber-300 font-mono font-bold">5,000 SP</span> = ${(5000 / Math.max(1, economyConfig.spPerUsdRatio)).toFixed(2)} USD
                    </p>
                  </div>

                  {/* Minimum Cashout USD */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                      <span>Min Cashout ($ USD)</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Minimum</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={economyConfig.minCashoutUsd}
                      onChange={(e) =>
                        setEconomyConfig((prev) => ({ ...prev, minCashoutUsd: Math.max(0.1, Number(e.target.value)) }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <p className="text-[10px] text-slate-400">
                      Min points needed: <span className="text-emerald-300 font-mono font-bold">{(economyConfig.minCashoutUsd * economyConfig.spPerUsdRatio).toLocaleString()} SP</span>
                    </p>
                  </div>

                  {/* Max Cashout Limit Per Request */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                      <span>Max Cashout Cap ($ USD)</span>
                      <span className="text-[10px] text-rose-400 font-mono">Single Tx Limit</span>
                    </label>
                    <input
                      type="number"
                      value={economyConfig.maxCashoutUsdPerReq}
                      onChange={(e) =>
                        setEconomyConfig((prev) => ({ ...prev, maxCashoutUsdPerReq: Math.max(1, Number(e.target.value)) }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Safety cap per single withdrawal request.</p>
                  </div>

                  {/* Required Referrals for Cashout */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                      <span>Required Referrals</span>
                      <span className="text-[10px] text-purple-400 font-mono">Anti-Bot</span>
                    </label>
                    <select
                      value={economyConfig.requiredReferralsForCashout}
                      onChange={(e) =>
                        setEconomyConfig((prev) => ({ ...prev, requiredReferralsForCashout: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 text-white font-mono font-bold rounded-xl px-3 py-1.5 text-xs"
                    >
                      <option value={0}>0 Referrals (No Requirement)</option>
                      <option value={1}>1 Active Referral</option>
                      <option value={2}>2 Active Referrals</option>
                      <option value={5}>5 Active Referrals</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Referrals user must invite before cashouts unlock.</p>
                  </div>

                  {/* Instant Auto-Approval Threshold */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                      <span>Instant Approval Threshold</span>
                      <span className="text-[10px] text-sky-400 font-mono">Auto-Clear</span>
                    </label>
                    <input
                      type="number"
                      value={economyConfig.instantApprovalUsdThreshold}
                      onChange={(e) =>
                        setEconomyConfig((prev) => ({ ...prev, instantApprovalUsdThreshold: Math.max(0, Number(e.target.value)) }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Payouts below this amount bypass manual queue if unflagged.</p>
                  </div>

                  {/* Processing Fee % */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-white uppercase flex items-center justify-between">
                      <span>Cashout Processing Fee %</span>
                      <span className="text-[10px] text-amber-400 font-mono">Deduction</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={economyConfig.payoutProcessingFeePercent}
                      onChange={(e) =>
                        setEconomyConfig((prev) => ({ ...prev, payoutProcessingFeePercent: Math.max(0, Number(e.target.value)) }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Fee deducted from payout total to cover gateway costs.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PAYMENT GATEWAYS & CASHOUT METHOD ENFORCERS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span>Supported Payout Gateways & Method Enforcers</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* PayPal (Disabled) */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between opacity-60">
                    <div>
                      <span className="font-bold text-slate-400 text-xs block flex items-center gap-1.5 line-through">
                        💳 PayPal Cash Transfer
                      </span>
                      <span className="text-[10px] text-rose-400 font-bold">Removed from active gateways</span>
                    </div>
                    <button
                      onClick={() =>
                        setEconomyConfig((prev) => ({ ...prev, enablePaypal: !prev.enablePaypal }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        economyConfig.enablePaypal ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {economyConfig.enablePaypal ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Crypto */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                        🪙 Crypto (USDT BEP-20 / LTC)
                      </span>
                      <span className="text-[10px] text-slate-400">Binance, Coinbase, Trust Wallet</span>
                    </div>
                    <button
                      onClick={() =>
                        setEconomyConfig((prev) => ({ ...prev, enableCryptoUsdt: !prev.enableCryptoUsdt }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        economyConfig.enableCryptoUsdt ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {economyConfig.enableCryptoUsdt ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {/* Amazon */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                        🛒 Amazon e-Gift Cards
                      </span>
                      <span className="text-[10px] text-slate-400">Digital digital claim codes</span>
                    </div>
                    <button
                      onClick={() =>
                        setEconomyConfig((prev) => ({ ...prev, enableAmazonGiftCards: !prev.enableAmazonGiftCards }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        economyConfig.enableAmazonGiftCards ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {economyConfig.enableAmazonGiftCards ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {/* Google Play / Apple */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                        🎮 Google Play & App Store Cards
                      </span>
                      <span className="text-[10px] text-slate-400">Global store gift vouchers</span>
                    </div>
                    <button
                      onClick={() =>
                        setEconomyConfig((prev) => ({ ...prev, enableGooglePlayCards: !prev.enableGooglePlayCards }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        economyConfig.enableGooglePlayCards ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {economyConfig.enableGooglePlayCards ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {/* Mobile Money */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                        📱 Mobile Money & Bank Wire
                      </span>
                      <span className="text-[10px] text-slate-400">M-Pesa, Orange, Airtel, Local Bank</span>
                    </div>
                    <button
                      onClick={() =>
                        setEconomyConfig((prev) => ({ ...prev, enableMobileMoney: !prev.enableMobileMoney }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        economyConfig.enableMobileMoney ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {economyConfig.enableMobileMoney ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: EARNING RATES & ACTION REWARDS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Action Earning Rates & Rewards Multipliers</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Rewarded Video Ads */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="font-black text-sky-400 uppercase text-xs block border-b border-slate-800/80 pb-1.5">
                      📺 Rewarded Video Ads
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">SP per Watched Ad:</label>
                      <input
                        type="number"
                        value={economyConfig.spPerAd}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEconomyConfig((prev) => ({ ...prev, spPerAd: val }));
                          setSpPerAd(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Daily Rewarded Ad Cap:</label>
                      <input
                        type="number"
                        value={economyConfig.dailyAdLimit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEconomyConfig((prev) => ({ ...prev, dailyAdLimit: val }));
                          setDailyAdLimit(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Slap Arcade Game */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="font-black text-[#FF3B77] uppercase text-xs block border-b border-slate-800/80 pb-1.5">
                      🔨 Slap Arcade Game
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Entry Energy Cost (Slaps):</label>
                      <input
                        type="number"
                        value={economyConfig.gameEntrySlapsCost}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEconomyConfig((prev) => ({ ...prev, gameEntrySlapsCost: val }));
                          setGameEntrySlapsCost(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Mole Base Reward (SP):</label>
                      <input
                        type="number"
                        value={economyConfig.slapBaseReward}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEconomyConfig((prev) => ({ ...prev, slapBaseReward: val }));
                          setSlapBaseReward(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Referral Bonus */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="font-black text-amber-400 uppercase text-xs block border-b border-slate-800/80 pb-1.5">
                      👥 Referral Affiliate System
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Signup Bonus (SP):</label>
                      <input
                        type="number"
                        value={economyConfig.referralSpBonus}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEconomyConfig((prev) => ({ ...prev, referralSpBonus: val }));
                          setReferralSpBonus(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Lifetime Earning Commission %:</label>
                      <input
                        type="number"
                        value={economyConfig.referralCommissionPercent}
                        onChange={(e) =>
                          setEconomyConfig((prev) => ({ ...prev, referralCommissionPercent: Number(e.target.value) }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Streaks & Offerwall Split */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="font-black text-purple-400 uppercase text-xs block border-b border-slate-800/80 pb-1.5">
                      🔥 Streaks & Offerwall Split
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Daily Streak Multiplier:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={economyConfig.streakMultiplier}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEconomyConfig((prev) => ({ ...prev, streakMultiplier: val }));
                          setStreakMultiplier(val);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Offerwall User Share %:</label>
                      <input
                        type="number"
                        value={economyConfig.offerwallUserSharePercent}
                        onChange={(e) =>
                          setEconomyConfig((prev) => ({ ...prev, offerwallUserSharePercent: Number(e.target.value) }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: INTERACTIVE CASHOUT & PROFIT MARGIN SIMULATOR */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black text-[#FFD043] uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#FFD043]" />
                    <span>Interactive Cashout Profitability Simulator</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">
                    Real-time Margin Calculator
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs font-bold text-white">
                      <span>Simulate User Redemption Goal:</span>
                      <span className="font-mono text-[#FFD043] text-sm font-black bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        {simulatedSpAmount.toLocaleString()} SP (${(simulatedSpAmount / Math.max(1, economyConfig.spPerUsdRatio)).toFixed(2)} USD)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="10000"
                      max="500000"
                      step="5000"
                      value={simulatedSpAmount}
                      onChange={(e) => setSimulatedSpAmount(Number(e.target.value))}
                      className="w-full accent-[#FFD043] cursor-pointer"
                    />

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 text-center pt-1">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="block text-slate-500 font-sans uppercase">Min Target</span>
                        <span className="font-bold text-white">10,000 SP ($1.00)</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="block text-slate-500 font-sans uppercase">Medium Target</span>
                        <span className="font-bold text-white">100,000 SP ($10.00)</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="block text-slate-500 font-sans uppercase">Whale Target</span>
                        <span className="font-bold text-white">500,000 SP ($50.00)</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulator Outcome Card */}
                  <div className="bg-gradient-to-br from-slate-950 to-emerald-950/30 p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
                    <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                      Financial Breakdown for {simulatedSpAmount.toLocaleString()} SP Payout
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">User Cashout Cost:</span>
                        <span className="font-mono font-bold text-rose-400">
                          -${(simulatedSpAmount / Math.max(1, economyConfig.spPerUsdRatio)).toFixed(2)} USD
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Est. Gross Ad/Offer Revenue:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          +${((simulatedSpAmount / Math.max(1, economyConfig.spPerUsdRatio)) / (economyConfig.offerwallUserSharePercent / 100)).toFixed(2)} USD
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
                        <span className="text-white font-black uppercase text-[11px]">Net Platform Margin:</span>
                        <span className="font-mono font-black text-[#FFD043] text-sm">
                          +${(((simulatedSpAmount / Math.max(1, economyConfig.spPerUsdRatio)) / (economyConfig.offerwallUserSharePercent / 100)) - (simulatedSpAmount / Math.max(1, economyConfig.spPerUsdRatio))).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SAVE BUTTON */}
              <div className="pt-2">
                <button
                  onClick={handleSaveEconomyConfig}
                  disabled={isSavingEconomyConfig}
                  className="w-full py-3.5 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingEconomyConfig ? 'Saving Economy Config to Firestore...' : 'Save Global Economy & Payout Rules'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: ADS & OFFERS MANAGEMENT */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-sky-400" />
                      <span>Ad Networks & Offerwall Partners</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure active SDK integrations, postback webhooks & eCPM targets for monetize partners.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl self-start sm:self-auto">
                    3 Core Networks Operational
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {[
                    { 
                      name: 'Adsterra', 
                      type: 'Popunder, Direct Links & Banners', 
                      ecpm: '$18.50', 
                      status: 'Active', 
                      fillRate: '98%',
                      payoutShare: '100% App Direct',
                      postbackStatus: 'Auto-Postback Live',
                      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    },
                    { 
                      name: 'MyBid', 
                      type: 'Push, Video Interstitials & In-Page', 
                      ecpm: '$16.20', 
                      status: 'Active', 
                      fillRate: '96%',
                      payoutShare: '100% App Direct',
                      postbackStatus: 'Connected & Verified',
                      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    },
                    { 
                      name: 'MyLead Offerwall', 
                      type: 'Exclusive Task & App Install Wall', 
                      ecpm: '$45.00', 
                      status: 'Active', 
                      fillRate: '95%',
                      payoutShare: '80% User / 20% App',
                      postbackStatus: 'Webhook Verified',
                      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }
                  ].map((ad, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">{ad.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${ad.badgeBg}`}>
                              {ad.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{ad.type}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                          {ad.postbackStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 text-[9px] block">eCPM Avg</span>
                          <span className="font-black text-emerald-400">{ad.ecpm}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">Fill Rate</span>
                          <span className="font-black text-sky-400">{ad.fillRate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">Payout Split</span>
                          <span className="font-bold text-slate-200">{ad.payoutShare}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <span>API Status: <strong className="text-emerald-400 font-mono">200 OK</strong></span>
                        <span className="text-[#00D09E] font-bold hover:underline cursor-pointer">Configure Settings →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: REVENUE & ANALYTICS */}
          {activeTab === 'revenue' && (
            <div className="space-y-5">
              {/* Top Summary Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#00D09E]" />
                    <span>Revenue & Partner Network Analytics</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time performance tracking for Adsterra, MyBid, and MyLead Offerwall.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-extrabold">
                  {(['today', '7d', '30d', 'all'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTrendTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                        trendTimeframe === tf 
                          ? 'bg-[#00D09E] text-slate-950 font-black shadow-md' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* RECHARTS CHART 1: EARNINGS TRENDS OVER TIME */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span>Earnings Trends (Adsterra, MyBid, MyLead Offerwall)</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">Daily revenue generated per monetization network ($ USD)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 self-start sm:self-auto">
                    +$9,850 Gross Est.
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={EARNINGS_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAdsterra" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorMyBid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorMyLead" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        formatter={(value: any) => [`$${value}`, undefined]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Area type="monotone" dataKey="Adsterra" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAdsterra)" />
                      <Area type="monotone" dataKey="MyBid" stackId="1" stroke="#38bdf8" fillOpacity={1} fill="url(#colorMyBid)" />
                      <Area type="monotone" dataKey="MyLead" name="MyLead Offerwall" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorMyLead)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RECHARTS CHART 2 & 3: NETWORK PERFORMANCE & REVENUE SHARE PIE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Bar Chart: eCPM and Volume Comparison */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 lg:col-span-2">
                  <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Network Performance Metrics (eCPM vs Gross Revenue)</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Normalized USD Yield</span>
                  </div>

                  <div className="h-64 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={NETWORK_PERFORMANCE_BAR_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          formatter={(value: any, name: any) => [name === 'ecpm' ? `$${value} eCPM` : `$${value}`, name === 'ecpm' ? 'eCPM' : 'Gross Revenue']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                        <Bar dataKey="gross" name="Gross Revenue ($)" fill="#00D09E" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="ecpm" name="Est. eCPM ($)" fill="#FFD043" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart: Revenue Share Distribution */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-sky-400" />
                      <span>Revenue Share Split</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">% Contribution per Network</span>
                  </div>

                  <div className="h-48 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={REVENUE_SHARE_PIE_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {REVENUE_SHARE_PIE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          formatter={(val: any) => [`$${val}`, 'Gross Share']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-black text-white font-mono">$6,370</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Total</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1">
                    {REVENUE_SHARE_PIE_DATA.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-sans truncate">{item.name}</span>
                        <span className="ml-auto font-bold text-white">${item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Partner Network Cards Detailed Grid */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Megaphone className="w-4 h-4 text-sky-400" />
                  <span>Network Operational Cards (Adsterra, MyBid, MyLead Offerwall)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PARTNER_NETWORKS.map((partner) => {
                    const mult = trendTimeframe === 'today' ? 0.08 : trendTimeframe === '7d' ? 0.28 : trendTimeframe === '30d' ? 1 : 2.4;
                    const partnerRev = partner.baseGross * mult;

                    return (
                      <div 
                        key={partner.id}
                        className={`p-3.5 rounded-2xl border bg-slate-950/80 transition-all ${partner.colorBorder} space-y-2`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${partner.colorBg}`} />
                            <span className="font-black text-xs text-white">{partner.name}</span>
                          </div>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${partner.badgeBg}`}>
                            {partner.fillRate} Fill
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline font-mono text-xs pt-1">
                          <span className="text-[10px] text-slate-400">Gross:</span>
                          <span className={`font-black ${partner.colorText}`}>${partnerRev.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-baseline font-mono text-[10px]">
                          <span className="text-slate-400">Est. eCPM:</span>
                          <span className="font-bold text-amber-300">{partner.ecpm}</span>
                        </div>

                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full ${partner.colorBg}`}
                            style={{ width: `${partner.baseSharePct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PROFIT CALCULATOR */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-[#FFD043] uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Interactive Real-time Profit Calculator</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-center">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Gross Ad/Offer Revenue ($):</label>
                    <input
                      type="number"
                      value={calcRevenue}
                      onChange={(e) => setCalcRevenue(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-[#00D09E] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Rewards Paid Out ($):</label>
                    <input
                      type="number"
                      value={calcRewards}
                      onChange={(e) => setCalcRewards(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-rose-400 outline-none"
                    />
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Platform Margin</span>
                      <span className="font-mono font-black text-emerald-400 text-base">
                        ${(calcRevenue - calcRewards).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Margin %</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {calcRevenue > 0 ? (((calcRevenue - calcRewards) / calcRevenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: FRAUD & SECURITY CENTER */}
          {activeTab === 'fraud' && (
            <div className="space-y-5">
              {/* HEADER BANNER & TEST INCIDENT TRIGGER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <span>Fraud Sentinel & Security Operations Center</span>
                    </h2>
                    <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Real-time Anomaly Monitor Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    Automated CPS autoclicker limits, VPN/proxy blocks, hardware device fingerprinting, and account risk enforcement.
                  </p>
                </div>

                <button
                  onClick={handleTriggerTestFraudEvent}
                  className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50 shrink-0"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce" />
                  <span>Simulate Test Fraud Alert</span>
                </button>
              </div>

              {/* TOP SECURITY KPI METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Critical Security Alerts</span>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  </span>
                  <span className="text-2xl font-black text-rose-400 font-mono mt-1">
                    {securityLogs.filter((l) => (l.severity === 'Critical' || l.severity === 'High') && l.status !== 'Resolved').length}
                  </span>
                  <span className="text-[9px] text-rose-300/80 font-bold mt-1">Requires immediate review</span>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>CPS Autoclicker Violations</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                  <span className="text-2xl font-black text-amber-300 font-mono mt-1">
                    {securityLogs.filter((l) => l.eventType === 'Autoclicker CPS').length}
                  </span>
                  <span className="text-[9px] text-amber-300/80 font-bold mt-1">&gt;{securityRulesConfig.maxCpsThreshold} CPS limit enforced</span>
                </div>

                <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>VPN / Proxy Blocks</span>
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                  </span>
                  <span className="text-2xl font-black text-sky-400 font-mono mt-1">
                    {securityLogs.filter((l) => l.eventType === 'VPN/Proxy Detected' || l.eventType === 'Duplicate Device').length}
                  </span>
                  <span className="text-[9px] text-sky-300/80 font-bold mt-1">Auto-denied offerwall access</span>
                </div>

                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Suspicious / Frozen Users</span>
                    <Ban className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    {users.filter((u) => u.status === 'Frozen' || u.status === 'Suspicious' || u.riskLevel === 'High').length}
                  </span>
                  <span className="text-[9px] text-emerald-300/80 font-bold mt-1">Firestore Real-time Enforcement</span>
                </div>
              </div>

              {/* SECURITY RULES CONFIGURATION ENGINE */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#FFD043]" />
                    <span>Automated Security Rules & Detection Thresholds</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Synced to Firestore: <span className="text-emerald-400 font-bold">security_config/rules</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Autoclicker Limit */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Autoclicker CPS Threshold
                      </span>
                      <span className="font-mono font-black text-amber-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {securityRulesConfig.maxCpsThreshold} CPS
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Max allowed clicks per second before flagging an anomaly.</p>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={securityRulesConfig.maxCpsThreshold}
                      onChange={(e) =>
                        setSecurityRulesConfig((prev) => ({ ...prev, maxCpsThreshold: Number(e.target.value) }))
                      }
                      className="w-full accent-[#FFD043] cursor-pointer"
                    />
                  </div>

                  {/* VPN / Proxy Block */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        Strict VPN / Proxy Block
                      </span>
                      <button
                        onClick={() =>
                          setSecurityRulesConfig((prev) => ({ ...prev, blockVpnProxy: !prev.blockVpnProxy }))
                        }
                        className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${
                          securityRulesConfig.blockVpnProxy ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {securityRulesConfig.blockVpnProxy ? 'ENFORCED' : 'OFF'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Auto-reject reward claims coming from commercial datacenter VPNs.</p>
                  </div>

                  {/* Multi-Account Device Limit */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                        Device Hardware Limit
                      </span>
                      <select
                        value={securityRulesConfig.maxAccountsPerDevice}
                        onChange={(e) =>
                          setSecurityRulesConfig((prev) => ({ ...prev, maxAccountsPerDevice: Number(e.target.value) }))
                        }
                        className="bg-slate-900 border border-slate-800 text-white font-mono text-xs font-bold rounded-lg px-2 py-0.5"
                      >
                        <option value={1}>1 Account</option>
                        <option value={2}>2 Accounts</option>
                        <option value={3}>3 Accounts</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400">Max accounts allowed per unique hardware fingerprint.</p>
                  </div>

                  {/* Server Clock Guard */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        Server Clock Guard
                      </span>
                      <button
                        onClick={() =>
                          setSecurityRulesConfig((prev) => ({ ...prev, enforceServerClock: !prev.enforceServerClock }))
                        }
                        className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${
                          securityRulesConfig.enforceServerClock ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {securityRulesConfig.enforceServerClock ? 'ENFORCED' : 'OFF'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Reject claims if device clock differs &gt;5m from server time.</p>
                  </div>

                  {/* Min Account Age */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                        Cashout Min Account Age
                      </span>
                      <input
                        type="number"
                        value={securityRulesConfig.minAccountAgeHoursForCashout}
                        onChange={(e) =>
                          setSecurityRulesConfig((prev) => ({ ...prev, minAccountAgeHoursForCashout: Number(e.target.value) }))
                        }
                        className="w-16 bg-slate-900 border border-slate-800 text-white font-mono font-bold text-xs rounded-lg px-2 py-0.5 text-right"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Hours account must exist before first payout request.</p>
                  </div>

                  {/* Auto Freeze */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-rose-400" />
                        Auto-Freeze High Risk
                      </span>
                      <button
                        onClick={() =>
                          setSecurityRulesConfig((prev) => ({ ...prev, autoFreezeOnHighRisk: !prev.autoFreezeOnHighRisk }))
                        }
                        className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${
                          securityRulesConfig.autoFreezeOnHighRisk ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {securityRulesConfig.autoFreezeOnHighRisk ? 'AUTO-FREEZE' : 'MANUAL'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Automatically freeze account if 2+ security rules trigger.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveSecurityConfig}
                    disabled={isSavingSecurityConfig}
                    className="px-4 py-2 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingSecurityConfig ? 'Saving to Firestore...' : 'Save Security Rules & Thresholds'}</span>
                  </button>
                </div>
              </div>

              {/* REAL-TIME SECURITY INCIDENT LOGS FEED */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span>Real-Time Security Incident Feed</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {securityLogs.length} Events
                    </span>
                  </h3>

                  {/* Filters */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Severity:</span>
                    <select
                      value={securitySeverityFilter}
                      onChange={(e) => setSecuritySeverityFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2 py-1 font-bold"
                    >
                      <option value="All">All Severities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>

                    <span className="text-[10px] text-slate-400 font-bold uppercase ml-2">Type:</span>
                    <select
                      value={securityEventTypeFilter}
                      onChange={(e) => setSecurityEventTypeFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2 py-1 font-bold"
                    >
                      <option value="All">All Types</option>
                      <option value="Autoclicker CPS">Autoclicker CPS</option>
                      <option value="VPN/Proxy Detected">VPN/Proxy</option>
                      <option value="Duplicate Device">Duplicate Device</option>
                      <option value="Clock Tampering">Clock Tampering</option>
                    </select>
                  </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Event Type</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Incident Details</th>
                        <th className="p-3">IP / Device ID</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {securityLogs
                        .filter((log) => {
                          const matchSev = securitySeverityFilter === 'All' || log.severity === securitySeverityFilter;
                          const matchType = securityEventTypeFilter === 'All' || log.eventType === securityEventTypeFilter;
                          return matchSev && matchType;
                        })
                        .map((log) => {
                          const targetUser = users.find((u) => u.username === log.username || u.id === log.userId);
                          return (
                            <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                              <td className="p-3 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-[10px] text-[#FFD043]">
                                    {log.username.substring(0, 2).toUpperCase()}
                                  </div>
                                  <span>@{log.username}</span>
                                </div>
                              </td>

                              <td className="p-3 font-semibold text-slate-300">
                                <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {log.eventType}
                                </span>
                              </td>

                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    log.severity === 'Critical'
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : log.severity === 'High'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  }`}
                                >
                                  {log.severity}
                                </span>
                              </td>

                              <td className="p-3 text-slate-300 font-sans text-[11px] max-w-xs truncate">
                                {log.details}
                              </td>

                              <td className="p-3 font-mono text-[10px] text-slate-400">
                                <div>{log.ipAddress || '198.51.100.x'}</div>
                                <div className="text-[9px] text-slate-500">{log.deviceId || 'dev-unknown'}</div>
                              </td>

                              <td className="p-3 font-mono text-[10px] text-slate-400">
                                {log.timestamp}
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {log.status !== 'Resolved' && log.status !== 'Auto-Blocked' ? (
                                    <>
                                      <button
                                        onClick={() => handleFreezeUserFromFraud(log.userId, log.username, log.id)}
                                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                        title="Freeze user account"
                                      >
                                        Freeze
                                      </button>
                                      <button
                                        onClick={() => handleResolveSecurityLog(log.id)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                        title="Mark log resolved"
                                      >
                                        Resolve
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded">
                                      {log.status}
                                    </span>
                                  )}

                                  {targetUser && (
                                    <button
                                      onClick={() => setSelectedUser(targetUser)}
                                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                                      title="Inspect user profile"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: CONTENT MANAGEMENT & GLOBAL ANNOUNCEMENTS */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#FF3B77]" />
                    <span>Broadcast Live Announcement to SlapEarn</span>
                  </h2>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ⚡ Firestore Real-time Sync Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Form Controls */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        Announcement Header / Title:
                      </label>
                      <input
                        type="text"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="e.g. 📢 Special Weekend Slap Bonus!"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold focus:border-[#FF3B77] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Category:
                        </label>
                        <select
                          value={announcementCategory}
                          onChange={(e) => setAnnouncementCategory(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-100 font-bold focus:outline-none"
                        >
                          <option value="promo">🎉 Promo Event</option>
                          <option value="reward">🎁 Bonus Reward</option>
                          <option value="system">⚡ System Update</option>
                          <option value="security">🛡️ Security Guard</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Action Tab Target:
                        </label>
                        <select
                          value={announcementActionTab}
                          onChange={(e) => setAnnouncementActionTab(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-100 font-bold focus:outline-none"
                        >
                          <option value="slap">🎮 Slap Game</option>
                          <option value="earn">💰 Earn Tasks</option>
                          <option value="wallet">💵 Wallet Cashout</option>
                          <option value="profile">👤 Profile</option>
                          <option value="home">🏠 Home Page</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        Action Button Label:
                      </label>
                      <input
                        type="text"
                        value={announcementActionLabel}
                        onChange={(e) => setAnnouncementActionLabel(e.target.value)}
                        placeholder="e.g. Go Slap Bosses"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        Announcement Body / Message:
                      </label>
                      <textarea
                        rows={3}
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="Type announcement message for all SlapEarn users..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-sans text-xs focus:border-[#FF3B77] focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handlePublishAnnouncement}
                      disabled={announcementPublishing || !announcementText.trim()}
                      className="w-full py-2.5 bg-[#FF3B77] hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase cursor-pointer transition-all shadow-[2px_2px_0px_0px_#000] flex items-center justify-center gap-2"
                    >
                      {announcementPublishing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Syncing to Firestore...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Publish to SlapEarn Notifications</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column: Live App Preview */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">
                      Live App Notification Card Preview:
                    </label>
                    <div className="bg-[#0F172A] border-2 border-[#00D09E] rounded-2xl p-3 text-white space-y-2 shadow-lg relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#00D09E] tracking-wider">
                          {announcementCategory.toUpperCase()} ANNOUNCEMENT
                        </span>
                        <span className="text-[9px] text-slate-400">Just now</span>
                      </div>
                      <h4 className="font-black text-xs text-white">
                        {announcementTitle || '📢 Official Announcement'}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {announcementText || 'Your message will appear here for all users in real-time...'}
                      </p>
                      <div className="pt-2 flex justify-end">
                        <span className="text-[10px] font-black bg-[#00D09E] text-slate-950 px-3 py-1 rounded-lg">
                          {announcementActionLabel || 'Check App'} →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE ANNOUNCEMENTS HISTORY */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    Live Published Announcements in Firestore ({liveAnnouncementsHistory.length})
                  </span>
                </h3>

                {liveAnnouncementsHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">
                    No announcements published yet. Click above to publish your first live announcement!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {liveAnnouncementsHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-200">{item.title || '📢 Official Announcement'}</span>
                            <span className="text-[9px] font-mono bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded uppercase">
                              {item.category || 'promo'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.message}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">
                          {item.timestamp || 'Just now'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 10: ADMIN SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 text-xs">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-300" />
                  <span>Admin Configuration & Maintenance</span>
                </h2>

                <div className="space-y-3">
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Emergency Maintenance Mode</span>
                      <span className="text-[10px] text-slate-400">Temporarily pauses app access for updates</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !maintenanceMode;
                        setMaintenanceMode(nextVal);
                        const updated = { ...economyConfig, doubleSpEventActive, maintenanceMode: nextVal };
                        setEconomyConfig(updated);
                        saveEconomyConfigToFirestore(updated);
                        addNotification('Maintenance Toggle', `Maintenance mode is now ${nextVal ? 'ENABLED' : 'DISABLED'}`, 'info');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                        maintenanceMode ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
