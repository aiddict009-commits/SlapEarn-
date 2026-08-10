import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ShieldCheck, 
  Gift, 
  Sparkles, 
  Users, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  ChevronDown, 
  Globe2, 
  Smartphone, 
  Lock, 
  HelpCircle, 
  DollarSign, 
  PlayCircle, 
  FileText, 
  Award, 
  LogIn, 
  UserPlus, 
  Clock, 
  Activity,
  Flame,
  CreditCard
} from 'lucide-react';
import { sound } from '../utils/sound';

interface LandingPageProps {
  onGetStarted: (mode: 'signup' | 'login') => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    sound.playSlap();
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleAction = (mode: 'signup' | 'login') => {
    sound.playSuccess();
    onGetStarted(mode);
  };

  const stats = [
    { label: 'Active Slappers', value: '142,500+', icon: Users, color: 'text-amber-500' },
    { label: 'Total Paid Out', value: 'R 850,000+', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Avg Payout Time', value: '< 15 Mins', icon: Clock, color: 'text-purple-500' },
    { label: 'Security Score', value: '99.9%', icon: ShieldCheck, color: 'text-blue-500' },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Slap-to-Earn Gameplay',
      description: 'Tap & slap animated characters to earn Slap Points (SP) instantly. Unlock powerful hands, multipliers, and critical hit bonuses.',
      badge: 'Game Mode',
      color: 'bg-amber-100 text-amber-900 border-amber-900',
      iconColor: 'text-amber-600'
    },
    {
      icon: FileText,
      title: 'High-Yield Paid Surveys',
      description: 'Complete quick opinion surveys from top research partners (CPX Research, BitLabs, Pollfish) and earn up to 5,000 SP per survey.',
      badge: 'High Pay',
      color: 'bg-purple-100 text-purple-900 border-purple-900',
      iconColor: 'text-purple-600'
    },
    {
      icon: Users,
      title: 'Viral Referral Program',
      description: 'Invite your friends and earn 1,000 SP bonus plus a lifetime 10% commission on every offer and slap they complete.',
      badge: 'Passive Income',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-900',
      iconColor: 'text-emerald-600'
    },
    {
      icon: PlayCircle,
      title: 'Rewarded Video Ads',
      description: 'Watch short 15-30 second sponsor video ads to get instant energy refills and bonus SP anytime throughout the day.',
      badge: 'Easy SP',
      color: 'bg-blue-100 text-blue-900 border-blue-900',
      iconColor: 'text-blue-600'
    },
    {
      icon: Flame,
      title: 'Daily Streak Multipliers',
      description: 'Log in consecutive days to unlock up to 5x SP multipliers, free daily chest rewards, and special event drops.',
      badge: 'Daily Bonus',
      color: 'bg-rose-100 text-rose-900 border-rose-900',
      iconColor: 'text-rose-600'
    },
    {
      icon: ShieldCheck,
      title: 'Bank-Grade Anti-Cheat Security',
      description: 'Equipped with real-time Proxy/VPN Guard, time-sync verification, and encrypted Firestore database persistence.',
      badge: 'Protected',
      color: 'bg-cyan-100 text-cyan-900 border-cyan-900',
      iconColor: 'text-cyan-600'
    }
  ];

  const paymentMethods = [
    { country: 'South Africa 🇿🇦', methods: 'Capitec, FNB eWallet, Tymebank, Nedbank, Vodacom Airtime', badge: 'Fast Pay' },
    { country: 'Kenya 🇰🇪', methods: 'M-Pesa Mobile Money (Instant transfer)', badge: 'Instant' },
    { country: 'Nigeria 🇳🇬', methods: 'OPay, PalmPay, Bank Transfer', badge: 'Direct' },
    { country: 'Ghana 🇬🇭', methods: 'MTN Mobile Money, Vodafone Cash', badge: 'Instant' },
    { country: 'Global / Crypto 🌍', methods: 'USDT (TRC20/BEP20), Binance Pay, Gift Cards', badge: 'Global' }
  ];

  const faqs = [
    {
      question: 'What is SlapEarn.io?',
      answer: 'SlapEarn.io is Africa’s premier gamified micro-task and tap-to-earn platform. Users earn Slap Points (SP) by playing the slap game, completing daily check-ins, answering surveys, watching ads, and inviting friends.'
    },
    {
      question: 'Is SlapEarn free to join?',
      answer: 'Yes! SlapEarn is 100% free. You will never be asked to deposit money or pay a fee to earn or withdraw your earnings.'
    },
    {
      question: 'How do I withdraw my earnings?',
      answer: 'Simply navigate to the Wallet tab once logged in, select your preferred payment method (E-Wallet, M-Pesa, Bank Transfer, Airtime, or Crypto), enter your details, and request your payout. Withdrawals are processed quickly.'
    },
    {
      question: 'How much is 1,000 SP worth?',
      answer: 'In-game points convert directly to cash in your local currency (ZAR, KES, NGN, GHS, or USDT) based on standard exchange rates visible in the Wallet section.'
    },
    {
      question: 'Can I use a VPN or Proxy?',
      answer: 'No. To maintain system fairness and prevent abuse for survey advertisers, VPNs, proxies, or time-altering software are strictly prohibited and automatically detected by our ProxyGuard security system.'
    }
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-[#FDFBF2] text-slate-800 scroll-smooth selection:bg-[#FFEAF0] selection:text-[#E33D6F] relative">
      
      {/* Sticky Header / Brand Navigation */}
      <header className="sticky top-0 z-40 bg-[#FDFBF2]/95 backdrop-blur-md border-b-3 border-slate-900 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5">
          <div 
            className="flex items-center font-sans font-black text-2xl italic select-none tracking-[-0.06em] rotate-[-2deg]"
            style={{
              textShadow: "2px 2px 0px #0F172A, -1px -1px 0px #0F172A, 1px -1px 0px #0F172A, -1px 1px 0px #0F172A"
            }}
          >
            <span className="text-white">Slap</span>
            <span className="text-[#FF2B6D] -ml-0.5">Earn</span>
          </div>
          <span className="bg-[#FFD043] text-slate-950 font-black text-[11px] px-1.5 py-0.5 rounded-md border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] font-mono leading-none tracking-tight select-none rotate-[-2deg]">
            .io
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction('login')}
            className="px-3 py-1.5 font-black text-xs rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-700" />
            <span>Log In</span>
          </button>
          <button
            onClick={() => handleAction('signup')}
            className="px-3.5 py-1.5 font-black text-xs rounded-xl border-2 border-slate-900 bg-[#FF2B6D] text-white hover:bg-rose-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 pt-6 pb-8 text-center bg-gradient-to-b from-[#FFF5DC] to-[#FDFBF2] border-b-3 border-slate-900 relative overflow-hidden">
        
        {/* Clean background without floating shapes */}

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-slate-900 bg-amber-400 text-slate-900 font-black text-[11px] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-900 animate-spin" />
          <span>AFRICA'S #1 TAP-TO-EARN PLATFORM</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
          Slap. Earn. <br />
          <span className="text-[#FF2B6D] underline decoration-amber-400 decoration-wavy decoration-2">
            Withdraw Real Cash!
          </span>
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
          Join thousands of slappers across Africa turning daily taps, micro-surveys, and referrals into fast direct payouts in ZAR, M-Pesa, OPay & Crypto!
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto mb-6">
          <button
            onClick={() => handleAction('signup')}
            className="w-full font-black text-sm py-3 px-6 rounded-2xl border-3 border-slate-900 bg-[#FF2B6D] text-white hover:bg-rose-600 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <Gift className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Get Started (+100 SP Bonus)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => handleAction('login')}
            className="w-full font-black text-xs py-2.5 px-4 rounded-2xl border-3 border-slate-900 bg-white text-slate-900 hover:bg-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4 text-purple-600" />
            <span>Already a Member? Log In</span>
          </button>
        </div>

        {/* Live Starter Guarantee Card */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] max-w-xs mx-auto flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-slate-900 flex items-center justify-center shrink-0 text-emerald-600 font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-xs text-slate-900">Instant 100 SP Starter Balance</div>
            <div className="text-[10px] font-semibold text-slate-500">Free sign up in under 30 seconds. No deposit required.</div>
          </div>
        </div>
      </section>

      {/* Live Site Metrics */}
      <section className="px-4 py-6 bg-slate-900 text-white border-b-3 border-slate-900">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((st, i) => {
            const IconComponent = st.icon;
            return (
              <div key={i} className="bg-slate-800 border-2 border-slate-700 rounded-xl p-3 shadow-sm flex flex-col items-center text-center">
                <IconComponent className={`w-5 h-5 mb-1 ${st.color}`} />
                <div className="font-black text-base text-white">{st.value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{st.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ways to Earn (Features Grid) */}
      <section className="px-4 py-8 bg-[#FDFBF2] border-b-3 border-slate-900">
        <div className="text-center mb-6">
          <div className="text-[10px] font-extrabold text-[#FF2B6D] uppercase tracking-widest mb-1">HOW IT WORKS</div>
          <h2 className="text-2xl font-black text-slate-900">6 Simple Ways to Earn SP</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Combine multiple earning streams daily to maximize your payout balance.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {features.map((feat, idx) => {
            const IconComp = feat.icon;
            return (
              <div key={idx} className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] relative">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border-2 border-slate-900 ${feat.color} shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-sm text-slate-900">{feat.title}</h3>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-slate-900 ${feat.color}`}>
                        {feat.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-snug">{feat.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment & Withdrawal Details */}
      <section className="px-4 py-8 bg-[#FFF9EA] border-b-3 border-slate-900">
        <div className="text-center mb-6">
          <div className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest mb-1">WITHDRAWALS</div>
          <h2 className="text-2xl font-black text-slate-900">Fast Local Cash Payouts</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Direct payout options for major African countries and global crypto users.</p>
        </div>

        <div className="space-y-3">
          {paymentMethods.map((pm, i) => (
            <div key={i} className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between gap-2">
              <div>
                <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  <span>{pm.country}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{pm.methods}</div>
              </div>
              <span className="text-[9px] font-black px-2 py-1 rounded-lg border border-slate-900 bg-amber-300 text-slate-900 shrink-0">
                {pm.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Anti-Cheat & Security Guarantee */}
      <section className="px-4 py-6 bg-slate-900 text-white border-b-3 border-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400 text-slate-900 rounded-2xl border-2 border-slate-900 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-sm text-amber-400">100% Fair & Secure Platform</h3>
            <p className="text-xs font-semibold text-slate-300 mt-0.5 leading-snug">
              Protected by ProxyGuard network verification, server-authenticated time checks, and instant Firestore database synchronization.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-8 bg-[#FDFBF2] border-b-3 border-slate-900">
        <div className="text-center mb-6">
          <div className="text-[10px] font-extrabold text-purple-600 uppercase tracking-widest mb-1">QUESTIONS & ANSWERS</div>
          <h2 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full text-left px-3.5 py-3 font-black text-xs text-slate-900 flex items-center justify-between gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>{faq.question}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 border-t border-slate-200 bg-white leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Final CTA */}
      <section className="px-4 py-8 bg-[#FF2B6D] text-white text-center">
        <h2 className="text-2xl font-black text-white mb-2">Ready to Start Earning?</h2>
        <p className="text-xs font-semibold text-rose-100 mb-5 max-w-xs mx-auto">
          Create your account now to claim your 100 SP starter balance and start slapping!
        </p>

        <button
          onClick={() => handleAction('signup')}
          className="w-full max-w-xs font-black text-sm py-3 px-6 rounded-2xl border-3 border-slate-900 bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer mx-auto flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-900" />
          <span>Claim 100 SP Starter Bonus</span>
        </button>

        <div className="mt-6 pt-6 border-t border-rose-400/40 text-[10px] font-bold text-rose-200 flex flex-col gap-1 items-center">
          <div>© {new Date().getFullYear()} SlapEarn.io. All rights reserved.</div>
          <div>Africa's Gamified Micro-Task & Tap-to-Earn Network</div>
        </div>
      </section>

    </div>
  );
}
