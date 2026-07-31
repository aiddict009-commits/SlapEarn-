import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayCircle, RotateCw, ClipboardList, Users, Hand, X, Gift, Trophy, Sparkles, Clock, ArrowLeft, CheckCircle2, ChevronRight, ExternalLink, Flame, ShieldCheck, Zap, Star, Lock, Save, Calendar, MapPin, GraduationCap, Briefcase, Heart, DollarSign, Globe, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { UserStats, Transaction, EconomyConfig, DEFAULT_ECONOMY_CONFIG } from '../types';
import { sound } from '../utils/sound';
import { proxyGuard, NetworkSecurityStatus } from '../utils/proxyGuard';

interface OfferItem {
  id: string;
  title: string;
  rewardSp: number;
  time: string;
  type: string;
  description: string;
}

interface OfferwallPartner {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  icon: string;
  description: string;
  avgReward: string;
  estTime: string;
  offers: OfferItem[];
}

const OFFERWALL_PARTNERS: OfferwallPartner[] = [
  {
    id: 'mylead-opinion',
    name: 'MyLead Opinion Survey',
    badge: '⭐ HIGH-PAYING SURVEYS',
    badgeColor: 'bg-amber-400 text-slate-950',
    icon: '📝',
    description: 'High-paying consumer opinion surveys, market research polls, and brand preference studies.',
    avgReward: '850 – 3,200 SP',
    estTime: '4 – 12 mins',
    offers: [
      {
        id: 'mylead-op-1',
        title: 'Global Consumer Tech & Smart Devices Opinion 2026',
        rewardSp: 1850,
        time: '8 mins',
        type: 'Market Opinion',
        description: 'Complete the MyLead Opinion Survey regarding smartphones, wearables, and smart home gadgets.'
      },
      {
        id: 'mylead-op-2',
        title: 'Streaming Services & Digital Media Habits',
        rewardSp: 1200,
        time: '6 mins',
        type: 'Media Survey',
        description: 'Provide feedback on video streaming platforms, podcast preferences, and subscription services.'
      },
      {
        id: 'mylead-op-3',
        title: 'Automotive & Electric Vehicle Future Buyer Survey',
        rewardSp: 2500,
        time: '10 mins',
        type: 'Industry Research',
        description: 'Answer questions about electric vehicles, autonomous driving tech, and car ownership.'
      },
      {
        id: 'mylead-op-4',
        title: 'Fast Food & Daily Dining Preferences Study',
        rewardSp: 950,
        time: '4 mins',
        type: 'Consumer Poll',
        description: 'Quick MyLead Opinion survey on restaurant delivery apps and daily dining habits.'
      },
      {
        id: 'mylead-op-5',
        title: 'Travel, Hospitality & Airline Booking Experience',
        rewardSp: 1600,
        time: '7 mins',
        type: 'Travel Survey',
        description: 'Share your vacation planning routines, airline experiences, and hotel choices.'
      }
    ]
  },
  {
    id: 'mylead',
    name: 'MyLead Offerwall',
    badge: '🔥 OFFICIAL OFFERWALL',
    badgeColor: 'bg-emerald-500 text-slate-950',
    icon: '🚀',
    description: 'Exclusive app installs, high-paying surveys, and premium game tasks.',
    avgReward: '1,200 – 5,000 SP',
    estTime: '5 – 15 mins',
    offers: [
      {
        id: 'mylead-1',
        title: 'Play Realm of Heroes & Reach Town Hall Level 5',
        rewardSp: 3500,
        time: '15 mins',
        type: 'Game Task',
        description: 'Install the game via MyLead and build your kingdom to Level 5 town hall.'
      },
      {
        id: 'mylead-2',
        title: 'Global Shopping & E-Commerce Preferences 2026',
        rewardSp: 1250,
        time: '8 mins',
        type: 'Market Survey',
        description: 'Share your online shopping habits and brand preferences to earn 1,250 SP.'
      },
      {
        id: 'mylead-3',
        title: 'Try FinTech Smart Wallet for 3 Days',
        rewardSp: 2400,
        time: '10 mins',
        type: 'App Trial',
        description: 'Download the app via MyLead, create a free account, and explore features.'
      },
      {
        id: 'mylead-4',
        title: 'Digital Banking & Mobile Payments Survey',
        rewardSp: 1800,
        time: '9 mins',
        type: 'Finance Survey',
        description: 'Provide feedback on contactless payments and digital wallets.'
      },
      {
        id: 'mylead-5',
        title: 'Tech & AI Software Daily Usage Study',
        rewardSp: 2100,
        time: '12 mins',
        type: 'Tech Opinion',
        description: 'Evaluate AI productivity tools and software you use daily.'
      }
    ]
  }
];

interface EarnViewProps {
  stats: UserStats;
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  updateStatsDirectly: (newStats: Partial<UserStats>) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  economyConfig?: EconomyConfig;
}

export default function EarnView({ stats, updateCoinsAndXp, updateStatsDirectly, addNotification, economyConfig }: EarnViewProps) {
  const config = economyConfig || DEFAULT_ECONOMY_CONFIG;
  const spPerAd = config.spPerAd || 5;
  const referralSpBonus = config.referralSpBonus || 100;
  const doubleSpMultiplier = config.doubleSpEventActive ? 2 : 1;
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

  // Proxy & VPN Network Security Guard State
  const [proxyStatus, setProxyStatus] = useState<NetworkSecurityStatus>(() => proxyGuard.getStatus());
  const [isRecheckingProxy, setIsRecheckingProxy] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = proxyGuard.subscribe((status) => {
      setProxyStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleRecheckProxy = async () => {
    sound.playSuccess();
    setIsRecheckingProxy(true);
    const updated = await proxyGuard.checkConnection();
    setIsRecheckingProxy(false);

    if (!updated.isProxyDetected) {
      addNotification('Network Security Cleared!', 'No proxy or VPN detected. Offerwalls & surveys resumed!', 'success');
    } else {
      addNotification('Proxy/VPN Still Active', updated.reason || 'Public proxy or VPN header active.', 'info');
    }
  };

  // Offerwall & Survey states
  const [surveyTab, setSurveyTab] = useState<'offerwalls' | 'profile_survey'>('offerwalls');
  const [selectedOfferwall, setSelectedOfferwall] = useState<OfferwallPartner | null>(null);
  const [activeOfferPrompt, setActiveOfferPrompt] = useState<OfferItem | null>(null);
  const [offerCompleting, setOfferCompleting] = useState<boolean>(false);
  const [offerProgress, setOfferProgress] = useState<number>(0);
  const [offerCompletedSuccess, setOfferCompletedSuccess] = useState<boolean>(false);

  // Survey Profile Form States
  const initialProfile = stats.surveyProfile || {};
  const [profileDob, setProfileDob] = useState<string>(initialProfile.dob || '1998-05-15');
  const [profileDobLocked, setProfileDobLocked] = useState<boolean>(initialProfile.dobLocked || false);

  const [profileGender, setProfileGender] = useState<string>(initialProfile.gender || 'Prefer not to say');

  const [profileCountry, setProfileCountry] = useState<string>(initialProfile.country || 'United States');
  const [profileCountryLocked, setProfileCountryLocked] = useState<boolean>(initialProfile.countryLocked || false);

  const [profileState, setProfileState] = useState<string>(initialProfile.state || 'California');
  const [profileCity, setProfileCity] = useState<string>(initialProfile.city || 'Los Angeles');

  const [profileZipCode, setProfileZipCode] = useState<string>(initialProfile.zipCode || '90210');
  const [profileZipCodeLocked, setProfileZipCodeLocked] = useState<boolean>(initialProfile.zipCodeLocked || false);

  const [profileEducation, setProfileEducation] = useState<string>(initialProfile.education || "Bachelor's Degree");
  const [profileEmployment, setProfileEmployment] = useState<string>(initialProfile.employment || 'Full-Time');
  const [profileOccupation, setProfileOccupation] = useState<string>(initialProfile.occupation || 'Technology & IT');
  const [profileMaritalStatus, setProfileMaritalStatus] = useState<string>(initialProfile.maritalStatus || 'Single');
  const [profileChildren, setProfileChildren] = useState<string>(initialProfile.children || 'None');
  const [profileIncome, setProfileIncome] = useState<string>(initialProfile.income || '$50,000 - $74,999');

  const [profileLanguages, setProfileLanguages] = useState<string[]>(initialProfile.languages || ['English', 'Spanish']);
  const [profileInterests, setProfileInterests] = useState<string[]>(
    initialProfile.interests || ['Technology', 'Gaming', 'Finance']
  );

  // Sync profile when stats.surveyProfile updates
  useEffect(() => {
    if (stats.surveyProfile) {
      const p = stats.surveyProfile;
      if (p.dob !== undefined) setProfileDob(p.dob);
      if (p.dobLocked !== undefined) setProfileDobLocked(p.dobLocked);
      if (p.gender !== undefined) setProfileGender(p.gender);
      if (p.country !== undefined) setProfileCountry(p.country);
      if (p.countryLocked !== undefined) setProfileCountryLocked(p.countryLocked);
      if (p.state !== undefined) setProfileState(p.state);
      if (p.city !== undefined) setProfileCity(p.city);
      if (p.zipCode !== undefined) setProfileZipCode(p.zipCode);
      if (p.zipCodeLocked !== undefined) setProfileZipCodeLocked(p.zipCodeLocked);
      if (p.education !== undefined) setProfileEducation(p.education);
      if (p.employment !== undefined) setProfileEmployment(p.employment);
      if (p.occupation !== undefined) setProfileOccupation(p.occupation);
      if (p.maritalStatus !== undefined) setProfileMaritalStatus(p.maritalStatus);
      if (p.children !== undefined) setProfileChildren(p.children);
      if (p.income !== undefined) setProfileIncome(p.income);
      if (p.languages !== undefined) setProfileLanguages(p.languages);
      if (p.interests !== undefined) setProfileInterests(p.interests);
    }
  }, [stats.surveyProfile]);

  const calculateProfileCompletion = () => {
    let filled = 0;
    const totalFields = 14;

    if (profileDob.trim()) filled++;
    if (profileGender.trim()) filled++;
    if (profileCountry.trim()) filled++;
    if (profileState.trim()) filled++;
    if (profileCity.trim()) filled++;
    if (profileZipCode.trim()) filled++;
    if (profileEducation.trim()) filled++;
    if (profileEmployment.trim()) filled++;
    if (profileOccupation.trim()) filled++;
    if (profileMaritalStatus.trim()) filled++;
    if (profileChildren.trim()) filled++;
    if (profileIncome.trim()) filled++;
    if (profileLanguages.length > 0) filled++;
    if (profileInterests.length > 0) filled++;

    return Math.round((filled / totalFields) * 100);
  };

  const toggleLanguage = (lang: string) => {
    sound.playSlap();
    if (profileLanguages.includes(lang)) {
      if (profileLanguages.length > 1) {
        setProfileLanguages(profileLanguages.filter((l) => l !== lang));
      }
    } else {
      setProfileLanguages([...profileLanguages, lang]);
    }
  };

  const toggleInterest = (interest: string) => {
    sound.playSlap();
    if (profileInterests.includes(interest)) {
      if (profileInterests.length > 1) {
        setProfileInterests(profileInterests.filter((i) => i !== interest));
      }
    } else {
      setProfileInterests([...profileInterests, interest]);
    }
  };

  const handleSaveSurveyProfile = () => {
    if (proxyStatus.isProxyDetected) {
      sound.playError();
      addNotification(
        'Survey Submission Paused 🛡️',
        'Public Proxy / VPN connection detected! Please disable VPN and re-check connection to submit surveys.',
        'info'
      );
      return;
    }

    sound.playSuccess();

    // Lock DOB, Country, and ZIP Code when saved
    const isDobLocked = profileDobLocked || Boolean(profileDob.trim());
    const isCountryLocked = profileCountryLocked || Boolean(profileCountry.trim());
    const isZipLocked = profileZipCodeLocked || Boolean(profileZipCode.trim());

    setProfileDobLocked(isDobLocked);
    setProfileCountryLocked(isCountryLocked);
    setProfileZipCodeLocked(isZipLocked);

    const nowStr = new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isFirstTime = !stats.surveyProfile?.completedOnce;

    const newProfile = {
      dob: profileDob,
      dobLocked: isDobLocked,
      gender: profileGender,
      country: profileCountry,
      countryLocked: isCountryLocked,
      state: profileState,
      city: profileCity,
      zipCode: profileZipCode,
      zipCodeLocked: isZipLocked,
      education: profileEducation,
      employment: profileEmployment,
      occupation: profileOccupation,
      maritalStatus: profileMaritalStatus,
      children: profileChildren,
      income: profileIncome,
      languages: profileLanguages,
      interests: profileInterests,
      completedOnce: true,
      lastUpdated: nowStr
    };

    updateStatsDirectly({
      surveyProfile: newProfile
    });

    if (isFirstTime) {
      const nextTasks = (stats.totalTasksCompleted || 0) + 1;
      const nextSurveysToday = (stats.surveysCompletedToday || 0) + 1;
      updateStatsDirectly({ totalTasksCompleted: nextTasks, surveysCompletedToday: nextSurveysToday });
      updateCoinsAndXp(500, 25, 'Survey', 'Completed Survey Profile');
      addNotification(
        '🎉 Survey Profile Saved (+500 SP)!',
        'First-time profile bonus (+500 SP) credited! Info sent to partners for matching surveys.',
        'success'
      );
    } else {
      addNotification(
        'Survey Profile Updated!',
        'Saved latest info (no additional SP for profile edits). Date of Birth, Country, and ZIP remain locked.',
        'success'
      );
    }
  };

  const startOfferCompletion = (offer: OfferItem) => {
    if (proxyStatus.isProxyDetected) {
      sound.playError();
      addNotification(
        'Offerwall Paused 🛡️',
        'Public Proxy / VPN detected! Offerwalls and surveys are paused to prevent fraud. Disable VPN and re-check connection to resume.',
        'info'
      );
      return;
    }

    sound.playSlap();
    setActiveOfferPrompt(offer);
    setOfferCompleting(true);
    setOfferProgress(0);
    setOfferCompletedSuccess(false);

    let current = 0;
    const interval = setInterval(() => {
      current += 25;
      setOfferProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setOfferCompleting(false);
        setOfferCompletedSuccess(true);
        sound.playSuccess();

        const nextTasks = (stats.totalTasksCompleted || 0) + 1;
        const nextOffersToday = (stats.offersCompletedToday || 0) + 1;
        const nextSurveysToday = (offer.type && offer.type.toLowerCase().includes('survey')) ? (stats.surveysCompletedToday || 0) + 1 : (stats.surveysCompletedToday || 0);
        updateStatsDirectly({ 
          totalTasksCompleted: nextTasks, 
          offersCompletedToday: nextOffersToday,
          surveysCompletedToday: nextSurveysToday
        });
        updateCoinsAndXp(offer.rewardSp, Math.floor(offer.rewardSp / 10), 'Survey', `Offerwall: ${offer.title}`);
        addNotification(
          '🎉 Offerwall Reward Claimed!',
          `You completed "${offer.title}" and earned +${offer.rewardSp.toLocaleString()} SP!`,
          'success'
        );
      }
    }, 500);
  };

  // Referral states
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [inputRefCode, setInputRefCode] = useState<string>('');

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

        const nextLifetime = (stats.totalAdsWatchedLifetime || 0) + 1;
        const nextToday = (stats.adsWatchedToday ?? 0) + 1;

        let updateObj: Partial<UserStats> = {
          slapsToday: Math.max(0, stats.slapsToday - 3),
          adsWatchedToday: nextToday,
          totalAdsWatchedLifetime: nextLifetime
        };

        const awardedAdSp = spPerAd * doubleSpMultiplier;
        updateCoinsAndXp(awardedAdSp, 10, 'Ad', 'Watched Video Ad');

        // Check 20-ads milestone for referee reward
        if (nextLifetime >= 20 && !stats.referredByRewardClaimed && stats.referredByCode) {
          updateObj.referredByRewardClaimed = true;
          updateCoinsAndXp(referralSpBonus, 15, 'Ad', '20-Ads Referee Reward');
          addNotification(
            '🎉 20 Ads Milestone Reached!',
            `You watched your first 20 ads! You & your referrer both received +${referralSpBonus} SP!`,
            'success'
          );
        } else {
          addNotification('Ad Completed!', `+3 slaps refilled & +${awardedAdSp} SP earned!`, 'success');
        }

        updateStatsDirectly(updateObj);
      }
    }, 1000);
  };

  const hasFreeSpins = (stats.freeSpins || 0) > 0;

  // Start Wheel Spin
  const startSpin = () => {
    if (isSpinning) return;
    
    // 5-hour cooldown check unless player has free spins
    if (isWheelOnCooldown && !hasFreeSpins) {
      sound.playError();
      addNotification('Lucky Wheel Cooldown', 'You can only spin once every 5 hours!', 'info');
      return;
    }

    sound.playSlap();
    setIsSpinning(true);
    setSpinResult(null);

    // Deduct free spin if available, otherwise record last spin timestamp
    if (hasFreeSpins) {
      updateStatsDirectly({
        freeSpins: (stats.freeSpins || 0) - 1
      });
    } else {
      updateStatsDirectly({
        lastWheelSpin: new Date().toISOString()
      });
    }

    // 7 Lucky Wheel segments:
    // Segment 0: 🎁 +5 SP
    // Segment 1: ✋ +5 Slaps
    // Segment 2: 🎁 +10 SP
    // Segment 3: ✋ +15 Slaps
    // Segment 4: ✋ +25 Slaps
    // Segment 5: 😢 Try again
    // Segment 6: 🎁 +100 SP (0.5% landing chance)
    const segments = [
      { text: '🎁 +5 SP', action: () => updateCoinsAndXp(5, 1, 'Daily Check-in', 'Wheel SP Prize') },
      { text: '✋ +5 Slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 5) }) },
      { text: '🎁 +10 SP', action: () => updateCoinsAndXp(10, 2, 'Daily Check-in', 'Wheel SP Prize') },
      { text: '✋ +15 Slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 15) }) },
      { text: '✋ +25 Slaps', action: () => updateStatsDirectly({ slapsToday: Math.max(0, stats.slapsToday - 25) }) },
      { text: '😢 Try again', action: () => {} },
      { text: '🎁 +100 SP', action: () => updateCoinsAndXp(100, 20, 'Daily Check-in', 'Jackpot Wheel SP Prize') }
    ];

    // True weighted randomization of land segments (sums to 1.0):
    // 🎁 +5 SP: 25% | ✋ +5 Slaps: 25% | 🎁 +10 SP: 15% | ✋ +15 Slaps: 15% | ✋ +25 Slaps: 9.5% | 😢 Try again: 10% | 🎁 +100 SP: 0.5%
    const weights = [0.25, 0.25, 0.15, 0.15, 0.095, 0.10, 0.005];
    let r = Math.random();
    let selectedIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        selectedIndex = i;
        break;
      }
    }

    // Add a natural offset so it lands in an organic location within the 7-segment slice
    const sliceAngle = 360 / 7;
    const offset = (Math.random() - 0.5) * (sliceAngle * 0.4); 
    const targetAngle = 360 - (selectedIndex * sliceAngle) - (sliceAngle / 2) + offset;
    
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

  // Claim a referral reward when a referred friend reaches 20 ads
  const claimReferralReward = (refId: string) => {
    const currentWithdrawalRefs = stats.referralsForCurrentWithdrawal || 0;
    if (currentWithdrawalRefs >= 3) {
      sound.playError();
      addNotification(
        'Withdrawal Cap Reached',
        'You have reached the maximum 3 referral rewards for this withdrawal cycle. Complete a withdrawal to reset!',
        'info'
      );
      return;
    }

    const currentList = stats.referralsList || [];
    const target = currentList.find(r => r.id === refId);
    if (!target) return;

    if (target.adsWatched < 20) {
      sound.playError();
      addNotification('Not Eligible Yet', `${target.name} has only watched ${target.adsWatched}/20 ads so far!`, 'info');
      return;
    }

    if (target.rewardClaimed) {
      sound.playSuccess();
      addNotification('Already Claimed', 'Reward for this referral has already been claimed!', 'info');
      return;
    }

    const updatedList = currentList.map(r => r.id === refId ? { ...r, rewardClaimed: true } : r);
    const nextWithdrawalCount = currentWithdrawalRefs + 1;

    sound.playSuccess();
    updateCoinsAndXp(referralSpBonus, 15, 'Daily Check-in', `Referral Reward: ${target.name}`);
    updateStatsDirectly({
      referralsList: updatedList,
      referralsForCurrentWithdrawal: nextWithdrawalCount,
      referrals: (stats.referrals || 0) + 1
    });

    addNotification('🏆 Referral Bonus Claimed!', `Earned +${referralSpBonus} SP! (${nextWithdrawalCount} referrals claimed for this withdrawal)`, 'success');
  };

  // Simulate friend watching ads (for demonstration and testing)
  const simulateFriendAds = (refId: string) => {
    sound.playSlap();
    const currentList = stats.referralsList || [];
    const updatedList = currentList.map(r => {
      if (r.id === refId) {
        const nextAds = Math.min(20, r.adsWatched + 5);
        if (nextAds === 20 && r.adsWatched < 20) {
          addNotification('🎉 Friend Reached 20 Ads!', `${r.name} watched 20 ads! Both of you qualify for +100 SP!`, 'success');
        }
        return { ...r, adsWatched: nextAds };
      }
      return r;
    });

    updateStatsDirectly({ referralsList: updatedList });
  };

  // Invite new friend
  const addNewReferral = () => {
    sound.playSuccess();
    const names = ['Jordan T.', 'Emily R.', 'Michael B.', 'Jessica W.', 'Chris P.'];
    const randomName = names[Math.floor(Math.random() * names.length)] + ' #' + Math.floor(Math.random() * 900 + 100);
    const newRef = {
      id: 'ref-' + Date.now(),
      name: randomName,
      adsWatched: 0,
      rewardClaimed: false,
      joinedAt: 'Just now'
    };

    const updatedList = [newRef, ...(stats.referralsList || [])];
    updateStatsDirectly({
      referralsList: updatedList
    });

    addNotification('Friend Invited!', `${randomName} joined using your referral link!`, 'success');
  };

  // Input referee code
  const applyReferralCode = () => {
    if (!inputRefCode.trim()) return;
    sound.playSuccess();
    updateStatsDirectly({
      referredByCode: inputRefCode.trim().toUpperCase()
    });
    addNotification(
      'Referral Code Applied!',
      `Entered code ${inputRefCode.trim().toUpperCase()}. Watch your first 20 ads to get +100 SP bonus!`,
      'success'
    );
    setInputRefCode('');
  };

  // Handle Copy Referral
  const copyReferral = () => {
    navigator.clipboard.writeText('https://slapearn.app/ref/SLAP-' + stats.coins);
    setIsCopied(true);
    sound.playSuccess();
    addNotification('Link Copied!', 'Share link with friends to earn 100 SP once they watch 20 ads!', 'success');
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
                <span className="text-[#FF3B77] font-black text-[13px]">+3 slaps & +5 SP</span>
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <span>Today: {stats.adsWatchedToday ?? 0}/20</span>
                  <span>•</span>
                  <span className="text-[#FF3B77] font-black">Lifetime: {stats.totalAdsWatchedLifetime || 0} Ads</span>
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

        {/* TASK 3: Offerwalls and Surveys */}
        <div className="bg-white rounded-[24px] border-4 border-slate-900 p-3.5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-[#4965FF] border-4 border-slate-900 rounded-[20px] flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
              <ClipboardList className="w-7 h-7 text-white stroke-[2.5px]" />
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-slate-950 font-black text-[15px] sm:text-[16px] leading-tight">Offerwalls and Surveys</span>
              <span className="text-slate-400 font-black text-[13px] mt-0.5">Earn 1000+ SP</span>
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
              className={`bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-5 w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900 max-h-[90vh] overflow-y-auto ${
                activeModal === 'survey' ? 'max-w-md' : 'max-w-sm'
              }`}
            >
              
              {/* Close Button */}
              {!isAdPlaying && !isSpinning && !offerCompleting && (
                <button 
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedOfferwall(null);
                    setActiveOfferPrompt(null);
                    setOfferCompleting(false);
                    setOfferCompletedSuccess(false);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] z-20 cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-900" />
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
                      <div className="mt-3 bg-amber-50 border-2 border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                        <span>📺 Permanent Lifetime Watched Ads:</span>
                        <span className="text-[#FF3B77] font-black">{stats.totalAdsWatchedLifetime || 0}</span>
                      </div>
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
                      {/* Segment Lines & labels (7 slices) */}
                      <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#FF3B77 0deg 51.43deg, #FFD043 51.43deg 102.86deg, #4965FF 102.86deg 154.29deg, #A855F7 154.29deg 205.71deg, #00D09E 205.71deg 257.14deg, #FF8C00 257.14deg 308.57deg, #E11D48 308.57deg 360deg)' }} />
                      
                      {/* Inner border ring */}
                      <div className="absolute inset-4 rounded-full border-2 border-slate-950/20 pointer-events-none" />

                      {/* Precise overlapping-proof radial text placement for 7 segments */}
                      {[
                        { text: '🎁 +5 SP', color: 'text-white' },
                        { text: '✋ +5 Slaps', color: 'text-slate-950' },
                        { text: '🎁 +10 SP', color: 'text-white' },
                        { text: '✋ +15 Slaps', color: 'text-white' },
                        { text: '✋ +25 Slaps', color: 'text-white' },
                        { text: '😢 Try again', color: 'text-slate-950' },
                        { text: '🎁 +100 SP', color: 'text-amber-200 font-extrabold' }
                      ].map((seg, i) => {
                        const angle = i * (360 / 7) + (360 / 14);
                        return (
                          <span
                            key={i}
                            className={`absolute font-black text-[10px] tracking-tight ${seg.color} drop-shadow-[0_1px_2px_rgba(15,23,42,0.8)] select-none`}
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
                      disabled={isSpinning || (isWheelOnCooldown && !hasFreeSpins)}
                      className="absolute w-16 h-16 bg-[#FFFDF6] border-4 border-slate-950 rounded-full flex flex-col items-center justify-center font-black text-slate-950 hover:bg-[#FFEED1] z-20 shadow-[0_4px_0_0_#0f172a] hover:shadow-[0_2px_0_0_#0f172a] active:shadow-none hover:translate-y-[2px] active:translate-y-[4px] disabled:translate-y-0 disabled:shadow-[0_4px_0_0_#0f172a] disabled:opacity-80 active:scale-95 transition-all text-center leading-none cursor-pointer"
                    >
                      <span className="text-[11px] font-black tracking-tight text-slate-950">
                        {isSpinning ? 'SPIN' : (isWheelOnCooldown && !hasFreeSpins) ? 'WAIT' : 'SPIN!'}
                      </span>
                      <span className="text-[9px] font-bold text-amber-600 mt-0.5">
                        {isSpinning ? '...' : hasFreeSpins ? `${stats.freeSpins} Free` : isWheelOnCooldown ? '🔒' : 'DAILY'}
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
                    ) : hasFreeSpins ? (
                      <div className="bg-amber-100 border-3 border-slate-950 px-5 py-2 rounded-full font-black text-amber-900 text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                        🎁 {stats.freeSpins} Free Title Reward Spin{stats.freeSpins! > 1 ? 's' : ''} Ready!
                      </div>
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

              {/* 3. OFFERWALLS & SURVEYS PROMPT MODAL */}
              {activeModal === 'survey' && (
                <div className="flex flex-col py-1 text-slate-900">
                  {/* Top Header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-10 h-10 bg-[#4965FF] rounded-2xl border-3 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
                      <ClipboardList className="w-5 h-5 text-white stroke-[2.5px]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none">
                        Offerwalls & Surveys
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                        Complete partner offers & surveys to earn <strong className="text-[#4965FF] font-black">1,000+ SP</strong>!
                      </span>
                    </div>
                  </div>

                  {/* Network Request Security Proxy / VPN Warning Banner */}
                  {proxyStatus.isProxyDetected ? (
                    <div className="bg-rose-950 text-white border-3 border-rose-500 rounded-2xl p-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] mb-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shrink-0">
                          <ShieldAlert className="w-4 h-4 stroke-[2.5px] animate-bounce" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-xs uppercase tracking-tight text-white">Offerwalls & Surveys Paused</h4>
                            <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">VPN / Proxy Active</span>
                          </div>
                          <p className="text-[10px] text-rose-200 font-medium leading-tight mt-0.5">
                            Network request inspector flagged public proxy or VPN headers (<code className="font-mono text-amber-300">{proxyStatus.vpnType || 'X-Forwarded-For anomaly'}</code>). Tasks remain paused to prevent anti-fraud flags.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-2 text-[10px] text-slate-300 font-mono flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[9px] text-rose-300 font-extrabold uppercase">
                          <span>Detected Reason:</span>
                          <span className="text-amber-300">{proxyStatus.ip || 'Proxy IP'}</span>
                        </div>
                        <div className="text-slate-300 font-sans text-[10px]">
                          {proxyStatus.reason}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          onClick={handleRecheckProxy}
                          disabled={isRecheckingProxy}
                          className="flex-1 py-1.5 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCw className={`w-3.5 h-3.5 stroke-[2.5px] ${isRecheckingProxy ? 'animate-spin' : ''}`} />
                          <span>{isRecheckingProxy ? 'Checking IP...' : 'Re-Check Connection 🔄'}</span>
                        </button>

                        <button
                          onClick={() => proxyGuard.clearSecurityAlert()}
                          className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[9px] rounded-xl border border-slate-700 uppercase cursor-pointer shrink-0"
                          title="Dev override"
                        >
                          Dev Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl px-3 py-1.5 mb-3 flex items-center justify-between shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                      <div className="flex items-center gap-2 text-[11px] font-black text-emerald-950">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5px]" />
                        <span>Network Connection Verified Clean (No Proxy/VPN)</span>
                      </div>
                      <button
                        onClick={() => {
                          sound.playSlap();
                          proxyGuard.simulateVpnDetection();
                          addNotification('VPN Test Simulated', 'Proxy / VPN header anomaly triggered for testing!', 'info');
                        }}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-800 underline uppercase"
                      >
                        Test VPN Flag
                      </button>
                    </div>
                  )}

                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border-2 border-slate-900 mb-3 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                    <button
                      onClick={() => {
                        sound.playSlap();
                        setSurveyTab('offerwalls');
                        setSelectedOfferwall(null);
                        setActiveOfferPrompt(null);
                      }}
                      className={`py-1.5 text-xs font-black rounded-xl border-2 transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        surveyTab === 'offerwalls'
                          ? 'bg-[#4965FF] text-white border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      <span>🔥 Offerwalls</span>
                    </button>
                    <button
                      onClick={() => {
                        sound.playSlap();
                        setSurveyTab('profile_survey');
                        setSelectedOfferwall(null);
                        setActiveOfferPrompt(null);
                      }}
                      className={`py-1.5 text-xs font-black rounded-xl border-2 transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        surveyTab === 'profile_survey'
                          ? 'bg-[#00D09E] text-slate-950 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      <span>
                        📋 Survey Profile {stats.surveyProfile?.completedOnce ? '✓' : '(+500 SP)'}
                      </span>
                    </button>
                  </div>

                  {/* TAB 1: OFFERWALL PARTNERS */}
                  {surveyTab === 'offerwalls' && (
                    <div>
                      {/* Active Offer Interactive Completion Prompt Overlay */}
                      {activeOfferPrompt ? (
                        <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center text-center">
                          <span className="text-[10px] font-black text-[#4965FF] uppercase tracking-widest bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full mb-1.5">
                            {activeOfferPrompt.type} • {activeOfferPrompt.time}
                          </span>
                          
                          <h4 className="text-base font-black text-slate-950 leading-tight mb-1">
                            {activeOfferPrompt.title}
                          </h4>
                          
                          <div className="inline-flex items-center gap-1 text-emerald-600 font-mono font-black text-sm bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full my-2">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            <span>+{activeOfferPrompt.rewardSp.toLocaleString()} SP Reward</span>
                          </div>

                          <p className="text-slate-500 text-xs font-bold leading-normal mb-3">
                            {activeOfferPrompt.description}
                          </p>

                          {offerCompleting ? (
                            <div className="w-full bg-slate-50 border-2 border-slate-900 p-3 rounded-xl">
                              <div className="flex justify-between items-center text-[11px] font-black text-slate-800 mb-1.5">
                                <span className="flex items-center gap-1">
                                  <RotateCw className="w-3.5 h-3.5 text-[#4965FF] animate-spin" />
                                  <span>
                                    {offerProgress < 30 ? 'Connecting panel...' : offerProgress < 75 ? 'Analyzing responses...' : 'Verifying & granting reward...'}
                                  </span>
                                </span>
                                <span className="font-mono text-[#4965FF]">{offerProgress}%</span>
                              </div>

                              <div className="w-full bg-slate-200 h-3 rounded-full border-2 border-slate-900 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#4965FF] via-indigo-500 to-emerald-400 h-full transition-all duration-300"
                                  style={{ width: `${offerProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : offerCompletedSuccess ? (
                            <div className="w-full bg-emerald-50 border-2 border-emerald-500 p-3 rounded-xl flex flex-col items-center text-emerald-900">
                              <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-1" />
                              <span className="font-black text-sm">Offer Successfully Completed!</span>
                              <span className="text-xs font-bold text-emerald-700 mt-0.5">
                                +{activeOfferPrompt.rewardSp.toLocaleString()} SP Credited to Balance
                              </span>

                              <button
                                onClick={() => {
                                  sound.playSuccess();
                                  setActiveOfferPrompt(null);
                                  setOfferCompletedSuccess(false);
                                }}
                                className="mt-3 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer"
                              >
                                Claim More Offers & SP
                              </button>
                            </div>
                          ) : (
                            <div className="w-full flex gap-2">
                              <button
                                onClick={() => setActiveOfferPrompt(null)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-2 border-slate-900 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => startOfferCompletion(activeOfferPrompt)}
                                className="flex-1 py-2.5 bg-[#4965FF] hover:bg-indigo-600 text-white font-black text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>Start Offer</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : selectedOfferwall ? (
                        /* Partner Specific Offers Sub-View */
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              sound.playSlap();
                              setSelectedOfferwall(null);
                            }}
                            className="text-xs font-extrabold text-slate-600 hover:text-slate-900 flex items-center gap-1 self-start cursor-pointer mb-1"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to All Offerwalls</span>
                          </button>

                          <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{selectedOfferwall.icon}</span>
                              <div>
                                <h4 className="font-black text-sm text-slate-950 leading-none">
                                  {selectedOfferwall.name}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                                  {selectedOfferwall.description}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-900 ${selectedOfferwall.badgeColor}`}>
                              {selectedOfferwall.badge}
                            </span>
                          </div>

                          <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider mt-1 block">
                            Available Surveys & Offers ({selectedOfferwall.offers.length})
                          </span>

                          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-0.5">
                            {selectedOfferwall.offers.map((offer) => (
                              <div
                                key={offer.id}
                                className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between hover:bg-indigo-50/50 transition-all"
                              >
                                <div className="flex-1 pr-2">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-1.5 py-0.2 rounded">
                                      {offer.type}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" /> {offer.time}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-slate-950 block leading-tight">
                                    {offer.title}
                                  </span>
                                </div>

                                <button
                                  onClick={() => startOfferCompletion(offer)}
                                  className="py-1.5 px-3 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all shrink-0 cursor-pointer"
                                >
                                  +{offer.rewardSp.toLocaleString()} SP
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* All Offerwall Partner Cards Grid */
                        <div className="flex flex-col gap-2">
                          <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                            Choose Partner Panel
                          </span>

                          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-0.5">
                            {OFFERWALL_PARTNERS.map((partner) => (
                              <div
                                key={partner.id}
                                onClick={() => {
                                  sound.playSlap();
                                  setSelectedOfferwall(partner);
                                }}
                                className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between hover:bg-[#FFEED1]/40 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 bg-slate-100 border-2 border-slate-900 rounded-xl flex items-center justify-center text-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] shrink-0">
                                    {partner.icon}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-black text-xs text-slate-950 group-hover:text-[#4965FF] transition-colors">
                                        {partner.name}
                                      </h4>
                                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${partner.badgeColor}`}>
                                        {partner.badge}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 block leading-tight mt-0.5">
                                      Avg: <strong className="text-slate-800 font-extrabold">{partner.avgReward}</strong> • {partner.estTime}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 text-[#4965FF] font-black text-xs group-hover:translate-x-0.5 transition-transform">
                                  <span>Offers</span>
                                  <ChevronRight className="w-4 h-4 stroke-[3px]" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SURVEY PROFILE */}
                  {surveyTab === 'profile_survey' && (
                    <div className="flex flex-col py-1 text-slate-900">
                      {/* Profile Header & Completion Stats */}
                      <div className="bg-[#EBF3FF] border-2 border-slate-900 rounded-2xl p-3 mb-3 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-950">
                            <UserCheck className="w-4 h-4 text-[#4965FF]" />
                            <span>Profile Completion: {calculateProfileCompletion()}%</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {stats.surveyProfile?.completedOnce ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> +500 SP Claimed
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-emerald-600" /> +500 SP First Time
                              </>
                            )}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2.5 rounded-full border border-slate-900 overflow-hidden mb-1.5">
                          <div
                            className="bg-gradient-to-r from-[#4965FF] to-[#00D09E] h-full transition-all duration-300"
                            style={{ width: `${calculateProfileCompletion()}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Info shared securely with survey partners</span>
                          <span className="font-mono text-slate-600">
                            Updated: {stats.surveyProfile?.lastUpdated || 'Never'}
                          </span>
                        </div>
                      </div>

                      {/* Survey Eligibility Form Fields */}
                      <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                        
                        {/* 1. Date of Birth (Locked once saved) */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black text-slate-950 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#4965FF]" /> Date of Birth
                            </label>
                            {profileDobLocked && (
                              <span className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-400 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <input
                            type="date"
                            value={profileDob}
                            disabled={profileDobLocked}
                            onChange={(e) => setProfileDob(e.target.value)}
                            className={`w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 ${
                              profileDobLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                            }`}
                          />
                        </div>

                        {/* 2. Gender */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <label className="text-xs font-black text-slate-950 block mb-1">Gender</label>
                          <select
                            value={profileGender}
                            onChange={(e) => setProfileGender(e.target.value)}
                            className="w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-Binary">Non-Binary</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>

                        {/* 3. Country (Locked once saved) */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black text-slate-950 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-[#4965FF]" /> Country
                            </label>
                            {profileCountryLocked && (
                              <span className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-400 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <select
                            value={profileCountry}
                            disabled={profileCountryLocked}
                            onChange={(e) => setProfileCountry(e.target.value)}
                            className={`w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 ${
                              profileCountryLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 cursor-pointer'
                            }`}
                          >
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                            <option value="Germany">Germany</option>
                            <option value="France">France</option>
                            <option value="Japan">Japan</option>
                            <option value="Nigeria">Nigeria</option>
                            <option value="Philippines">Philippines</option>
                            <option value="India">India</option>
                            <option value="Brazil">Brazil</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* 4. State/Province & City/Town (2 column grid) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                            <label className="text-[11px] font-black text-slate-950 block mb-1">State/Province</label>
                            <input
                              type="text"
                              value={profileState}
                              placeholder="e.g. California"
                              onChange={(e) => setProfileState(e.target.value)}
                              className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900"
                            />
                          </div>
                          <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                            <label className="text-[11px] font-black text-slate-950 block mb-1">City/Town</label>
                            <input
                              type="text"
                              value={profileCity}
                              placeholder="e.g. Los Angeles"
                              onChange={(e) => setProfileCity(e.target.value)}
                              className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900"
                            />
                          </div>
                        </div>

                        {/* 5. ZIP/Postal Code (Locked once saved) */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black text-slate-950 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#4965FF]" /> ZIP / Postal Code
                            </label>
                            {profileZipCodeLocked && (
                              <span className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-400 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={profileZipCode}
                            disabled={profileZipCodeLocked}
                            placeholder="e.g. 90210"
                            onChange={(e) => setProfileZipCode(e.target.value)}
                            className={`w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 ${
                              profileZipCodeLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                            }`}
                          />
                        </div>

                        {/* 6. Highest Education Level */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <label className="text-xs font-black text-slate-950 flex items-center gap-1 mb-1">
                            <GraduationCap className="w-3.5 h-3.5 text-[#4965FF]" /> Highest Education Level
                          </label>
                          <select
                            value={profileEducation}
                            onChange={(e) => setProfileEducation(e.target.value)}
                            className="w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                          >
                            <option value="High School">High School / GED</option>
                            <option value="Some College">Some College</option>
                            <option value="Associate Degree">Associate Degree</option>
                            <option value="Bachelor's Degree">Bachelor's Degree</option>
                            <option value="Master's Degree">Master's Degree</option>
                            <option value="Doctorate / Ph.D.">Doctorate / Ph.D.</option>
                            <option value="Trade / Vocational">Trade / Vocational</option>
                          </select>
                        </div>

                        {/* 7. Employment Status & Occupation */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-2">
                          <div>
                            <label className="text-xs font-black text-slate-950 flex items-center gap-1 mb-1">
                              <Briefcase className="w-3.5 h-3.5 text-[#4965FF]" /> Employment Status
                            </label>
                            <select
                              value={profileEmployment}
                              onChange={(e) => setProfileEmployment(e.target.value)}
                              className="w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                            >
                              <option value="Full-Time">Employed Full-Time</option>
                              <option value="Part-Time">Employed Part-Time</option>
                              <option value="Self-Employed / Freelancer">Self-Employed / Freelancer</option>
                              <option value="Student">Student</option>
                              <option value="Unemployed">Unemployed</option>
                              <option value="Retired">Retired</option>
                              <option value="Homemaker">Homemaker</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-black text-slate-950 block mb-1">Occupation Industry</label>
                            <select
                              value={profileOccupation}
                              onChange={(e) => setProfileOccupation(e.target.value)}
                              className="w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                            >
                              <option value="Technology & IT">Technology & IT</option>
                              <option value="Healthcare & Medical">Healthcare & Medical</option>
                              <option value="Finance & Business">Finance & Business</option>
                              <option value="Education">Education</option>
                              <option value="Creative & Design">Creative & Design</option>
                              <option value="Sales & Marketing">Sales & Marketing</option>
                              <option value="Engineering">Engineering</option>
                              <option value="Student / Academic">Student / Academic</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        {/* 8. Marital Status & Children */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                            <label className="text-[11px] font-black text-slate-950 flex items-center gap-1 mb-1">
                              <Heart className="w-3 h-3 text-rose-500" /> Marital Status
                            </label>
                            <select
                              value={profileMaritalStatus}
                              onChange={(e) => setProfileMaritalStatus(e.target.value)}
                              className="w-full text-xs font-bold px-2 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                            >
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="In a relationship">In a relationship</option>
                              <option value="Divorced">Divorced</option>
                              <option value="Widowed">Widowed</option>
                            </select>
                          </div>

                          <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                            <label className="text-[11px] font-black text-slate-950 block mb-1">Children</label>
                            <select
                              value={profileChildren}
                              onChange={(e) => setProfileChildren(e.target.value)}
                              className="w-full text-xs font-bold px-2 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                            >
                              <option value="None">None</option>
                              <option value="1 Child">1 Child</option>
                              <option value="2 Children">2 Children</option>
                              <option value="3 Children">3 Children</option>
                              <option value="4+ Children">4+ Children</option>
                            </select>
                          </div>
                        </div>

                        {/* 9. Household Income Range */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <label className="text-xs font-black text-slate-950 flex items-center gap-1 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Household Income Range
                          </label>
                          <select
                            value={profileIncome}
                            onChange={(e) => setProfileIncome(e.target.value)}
                            className="w-full text-xs font-bold px-3 py-2 rounded-lg border-2 border-slate-900 bg-white text-slate-900 cursor-pointer"
                          >
                            <option value="Under $25,000">Under $25,000</option>
                            <option value="$25,000 - $49,999">$25,000 - $49,999</option>
                            <option value="$50,000 - $74,999">$50,000 - $74,999</option>
                            <option value="$75,000 - $99,999">$75,000 - $99,999</option>
                            <option value="$100,000 - $149,999">$100,000 - $149,999</option>
                            <option value="$150,000+">$150,000+</option>
                          </select>
                        </div>

                        {/* 10. Languages Spoken */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <label className="text-xs font-black text-slate-950 block mb-1.5">Languages Spoken</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Tagalog', 'Arabic', 'Portuguese', 'Hindi'].map((lang) => {
                              const isSelected = profileLanguages.includes(lang);
                              return (
                                <button
                                  key={lang}
                                  type="button"
                                  onClick={() => toggleLanguage(lang)}
                                  className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#4965FF] text-white border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {lang} {isSelected && '✓'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 11. Interests (Select Multiple) */}
                        <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          <label className="text-xs font-black text-slate-950 block mb-1.5">Interests (Select multiple)</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['Technology', 'Gaming', 'Finance & Crypto', 'Fitness & Health', 'Travel', 'Fashion & Beauty', 'Entertainment & Movies', 'Food & Dining', 'Automotive', 'Music'].map((item) => {
                              const isSelected = profileInterests.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => toggleInterest(item)}
                                  className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#FFD043] text-slate-950 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {item} {isSelected && '✓'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Save Changes Button */}
                      <button
                        onClick={handleSaveSurveyProfile}
                        className="mt-3 w-full font-black text-xs py-3 rounded-xl border-3 border-slate-900 bg-[#00D09E] hover:bg-emerald-400 text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-4 h-4 stroke-[2.5px]" />
                        <span>
                          {stats.surveyProfile?.completedOnce
                            ? 'Save Profile Changes'
                            : 'Save Profile & Claim +500 SP Reward'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. COMPACT REFERRAL PROMPT MODAL */}
              {activeModal === 'referral' && (
                <div className="flex flex-col items-center py-0.5 text-center text-slate-900">
                  {/* Header Title */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-[1px_1px_0px_0px_#000]">
                      <Users className="w-4 h-4 text-[#A855F7]" />
                    </div>
                    <h3 className="text-lg font-black text-slate-950 tracking-tight">Refer & Earn 100 SP</h3>
                  </div>

                  {/* Compact Streamlined Rule & Cycle Banner */}
                  <div className="w-full bg-[#F3E8FF] border-2 border-slate-900 rounded-xl p-2 mb-2 text-left shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[#7E22CE] font-black text-[10px] uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 text-[#A855F7]" />
                        <span>Rule: +100 SP Per Friend</span>
                      </div>
                      <p className="text-slate-800 font-bold text-[10px] leading-tight">
                        When friend watches <span className="text-slate-950 font-black">20 ads</span>.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-black text-[#A855F7] bg-white px-2 py-0.5 rounded-full border border-purple-300 block">
                        {(stats.referralsForCurrentWithdrawal || 0)} / 3 Claimed
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 block mt-0.5">Cycle Cap</span>
                    </div>
                  </div>

                  {/* Compact Referred Friends Progress List */}
                  <div className="w-full text-left mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                        Referred Friends ({(stats.referralsList || []).length})
                      </span>
                      <button
                        onClick={addNewReferral}
                        className="text-[10px] font-black text-[#A855F7] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        + Invite
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 max-h-[90px] overflow-y-auto pr-1">
                      {(stats.referralsList || []).length === 0 ? (
                        <div className="text-center py-2 text-[10px] font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                          No friends referred yet.
                        </div>
                      ) : (
                        (stats.referralsList || []).map((ref) => {
                          const is20Watched = ref.adsWatched >= 20;
                          const isClaimed = ref.rewardClaimed;

                          return (
                            <div
                              key={ref.id}
                              className="bg-white border border-slate-900 rounded-lg p-1.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between"
                            >
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-purple-200 border border-slate-900 flex items-center justify-center font-black text-[9px] text-purple-900 shrink-0">
                                  {ref.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-black text-slate-900 text-[10px] block leading-none">
                                    {ref.name}
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-bold block mt-0.5">
                                    Ads: {ref.adsWatched}/20
                                  </span>
                                </div>
                              </div>

                              {/* Status / Claim Button */}
                              {isClaimed ? (
                                <span className="bg-emerald-100 border border-emerald-500 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded-full">
                                  ✅ Claimed
                                </span>
                              ) : is20Watched ? (
                                <button
                                  onClick={() => claimReferralReward(ref.id)}
                                  disabled={(stats.referralsForCurrentWithdrawal || 0) >= 3}
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-md border border-slate-900 active:scale-95 transition-all cursor-pointer ${
                                    (stats.referralsForCurrentWithdrawal || 0) >= 3
                                      ? 'bg-slate-200 text-slate-400 border-slate-400 shadow-none cursor-not-allowed'
                                      : 'bg-[#FF3B77] text-white hover:bg-rose-600 animate-pulse'
                                  }`}
                                >
                                  🎁 Claim 100 SP
                                </button>
                              ) : (
                                <button
                                  onClick={() => simulateFriendAds(ref.id)}
                                  className="text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-400 px-1.5 py-0.2 rounded hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
                                  title="Simulate friend watching ads"
                                >
                                  +5 Ads
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Compact Referral Code & Invitation Box */}
                  <div className="w-full bg-slate-50 border border-slate-900 rounded-xl p-2 text-left">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-700 mb-0.5">
                      <span>YOUR REFERRAL CODE</span>
                      <span className="text-[#A855F7] font-mono">{stats.myReferralCode || ('SLAP-' + stats.coins)}</span>
                    </div>

                    <button
                      onClick={copyReferral}
                      className="w-full font-black text-xs py-1.5 rounded-lg border-2 border-slate-900 bg-[#A855F7] text-white hover:bg-purple-600 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 mt-1"
                    >
                      {isCopied ? 'Copied Invitation Link!' : 'Copy Invitation Link'}
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
