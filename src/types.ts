export interface Transaction {
  id: string;
  type: 'earn' | 'redeem' | 'bonus';
  amount: number;
  title: string;
  category: 'Daily Check-in' | 'Slap Game' | 'Survey' | 'Ad' | 'Offerwall' | 'Redemption' | 'Level Up';
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface SurveyProfile {
  dob?: string;
  dobLocked?: boolean;
  gender?: string;
  country?: string;
  countryLocked?: boolean;
  state?: string;
  city?: string;
  zipCode?: string;
  zipCodeLocked?: boolean;
  education?: string;
  employment?: string;
  occupation?: string;
  maritalStatus?: string;
  children?: string;
  income?: string;
  languages?: string[];
  interests?: string[];
  completedOnce?: boolean;
  lastUpdated?: string;
}

export interface UserStats {
  coins: number;
  totalEarned: number;
  xp: number;
  level: number;
  streak: number;
  lastCheckIn: string | null; // ISO Date String
  slapsToday: number;
  maxSlapsPerDay: number;
  bestCombo?: number;
  currentCombo?: number;
  daysActive?: number;
  referrals?: number;
  adsWatchedToday?: number;
  lastActiveDate?: string;
  lastWheelSpin?: string;
  selectedHand?: string;
  unlockedHands?: string[];
  equippedTitle?: string;
  equippedFrame?: string;
  unlockedBadges?: string[];
  freeSpins?: number;
  claimedTitleRewards?: string[];
  achievedTitles?: string[];
  referredByCode?: string;
  username?: string;
  email?: string;
  myReferralCode?: string;
  createdAt?: number;
  referredByRewardClaimed?: boolean;
  totalAdsWatchedLifetime?: number;
  referralsList?: Array<{ id: string; name: string; adsWatched: number; rewardClaimed: boolean; joinedAt: string }>;
  referralsForCurrentWithdrawal?: number;
  totalTasksCompleted?: number;
  surveyProfile?: SurveyProfile;
  slapsPlayedToday?: number;
  whackAMolePlayedToday?: number;
  totalDamageDealtToday?: number;
  charactersDefeatedToday?: number;
  spEarnedToday?: number;
  surveysCompletedToday?: number;
  offersCompletedToday?: number;
  claimedDailyChallenges?: string[];
  isRestricted?: boolean;
  status?: 'Active' | 'Suspicious' | 'Frozen' | 'Inactive' | 'Banned' | 'Restricted';
}

export interface BadgeItem {
  id: string;
  title: string;
  icon: string;
  rewardText: string;
  requirementText: string;
  frameType?: 'none' | 'bronze' | 'silver' | 'gold_animated';
  hasGoldenName?: boolean;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface Survey {
  id: string;
  title: string;
  reward: number;
  duration: string;
  category: string;
  questions: SurveyQuestion[];
  completed: boolean;
  sponsor: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  advertiser: string;
  tagline: string;
  duration: number; // in seconds
  reward: number;
  accentColor: string;
  logo: string;
}

export interface OfferStep {
  text: string;
  completed: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  reward: number;
  steps: OfferStep[];
  type: 'game' | 'app' | 'signup';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  logo: string;
  partner: string;
  status: 'available' | 'started' | 'completed' | 'claimed';
}

export interface RedemptionOption {
  id: string;
  name: string;
  brand: 'paypal' | 'usdt' | 'amazon' | 'googleplay' | 'mobilemoney' | 'steam' | 'bitcoin' | string;
  rates: { coins: number; value: number }[];
  logo: string;
  color: string;
}

export interface EconomyConfig {
  spPerUsdRatio: number;
  minCashoutUsd: number;
  maxCashoutUsdPerReq: number;
  requiredReferralsForCashout: number;
  instantApprovalUsdThreshold: number;
  payoutProcessingFeePercent: number;

  enablePaypal: boolean;
  enableCryptoUsdt: boolean;
  enableAmazonGiftCards: boolean;
  enableGooglePlayCards: boolean;
  enableMobileMoney: boolean;

  spPerAd: number;
  dailyAdLimit: number;
  adCooldownSeconds: number;
  slapBaseReward: number;
  criticalHitMultiplier: number;
  gameEntrySlapsCost: number;
  referralSpBonus: number;
  referralCommissionPercent: number;
  streakMultiplier: number;
  offerwallUserSharePercent: number;

  doubleSpEventActive?: boolean;
  maintenanceMode?: boolean;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  spPerUsdRatio: 10000,
  minCashoutUsd: 0.50,
  maxCashoutUsdPerReq: 50.00,
  requiredReferralsForCashout: 0,
  instantApprovalUsdThreshold: 2.00,
  payoutProcessingFeePercent: 0,

  enablePaypal: true,
  enableCryptoUsdt: true,
  enableAmazonGiftCards: true,
  enableGooglePlayCards: true,
  enableMobileMoney: true,

  spPerAd: 25,
  dailyAdLimit: 20,
  adCooldownSeconds: 15,
  slapBaseReward: 10,
  criticalHitMultiplier: 3,
  gameEntrySlapsCost: 5,
  referralSpBonus: 500,
  referralCommissionPercent: 10,
  streakMultiplier: 1.5,
  offerwallUserSharePercent: 60,

  doubleSpEventActive: false,
  maintenanceMode: false
};

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  reward: number;
}
