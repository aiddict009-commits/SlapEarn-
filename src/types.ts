export interface Transaction {
  id: string;
  type: 'earn' | 'redeem' | 'bonus';
  amount: number;
  title: string;
  category: 'Daily Check-in' | 'Slap Game' | 'Survey' | 'Ad' | 'Offerwall' | 'Redemption' | 'Level Up';
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
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
  brand: 'paypal' | 'amazon' | 'googleplay' | 'steam' | 'bitcoin';
  rates: { coins: number; value: number }[];
  logo: string;
  color: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  reward: number;
}
