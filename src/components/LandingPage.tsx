import { useState } from 'react';
import { 
  Zap, 
  Gift, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  Lock, 
  HelpCircle, 
  LogIn, 
  UserPlus, 
  Wallet,
  Coins,
  ShieldCheck
} from 'lucide-react';
import { sound } from '../utils/sound';
import LegalModal, { LegalTab } from './LegalModal';

interface LandingPageProps {
  onGetStarted: (mode: 'signup' | 'login') => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('terms');

  const toggleFaq = (index: number) => {
    sound.playSlap();
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleAction = (mode: 'signup' | 'login') => {
    sound.playSuccess();
    onGetStarted(mode);
  };

  const highlights = [
    {
      icon: Zap,
      title: 'Tap, Slap & Level Up',
      description: 'Slap animated boss characters, build up slap multipliers, trigger critical hits, and rack up Slap Points (SP) every second.',
      tag: 'Gameplay',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-900',
      iconBg: 'bg-amber-400 text-slate-950'
    },
    {
      icon: Sparkles,
      title: 'Complete Sponsored Tasks',
      description: 'Boost your balance fast with partner offerwalls, quick surveys, daily check-in mystery chests, and rewarded short clips.',
      tag: 'Big Boosts',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-900',
      iconBg: 'bg-purple-500 text-white'
    },
    {
      icon: Coins,
      title: 'Cash Out Pure USDT',
      description: 'No fake gift vouchers or restricted credits. Convert your SP directly into real USDT sent straight to your crypto wallet address.',
      tag: 'Real Crypto',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-900',
      iconBg: 'bg-emerald-500 text-white'
    }
  ];

  const usdtNetworks = [
    {
      network: 'USDT (BEP-20 / BNB Chain)',
      details: 'Instant transfer & lowest transaction fees',
      tag: 'Recommended'
    },
    {
      network: 'USDT (TRC-20 / Tron)',
      details: 'Universal exchange compatibility (Binance, Bybit, KuCoin)',
      tag: 'Popular'
    },
    {
      network: 'USDT (Polygon / MATIC)',
      details: 'High-speed layer 2 settlement with near-zero gas',
      tag: 'Fast'
    }
  ];

  const faqs = [
    {
      question: 'What is SlapEarn.io?',
      answer: 'SlapEarn.io is a gamified micro-task and tap-to-earn platform. Users earn Slap Points (SP) by playing the slap game, claiming daily chest streaks, completing partner tasks and surveys, and inviting friends.'
    },
    {
      question: 'Is SlapEarn free to join?',
      answer: 'Yes! SlapEarn is 100% free to play. You will never be asked to deposit money or pay any fee to earn or withdraw your USDT.'
    },
    {
      question: 'How do I withdraw my earnings?',
      answer: 'Navigate to the Wallet tab, select your preferred USDT network (BEP-20, TRC-20, or Polygon), paste your crypto wallet address, and request your payout.'
    },
    {
      question: 'How do SP points convert to USDT?',
      answer: 'In-game SP points convert directly to USDT at a clear and transparent rate visible in your Wallet section.'
    },
    {
      question: 'Can I use a VPN or Proxy?',
      answer: 'No. To maintain fairness for advertisers and survey partners, VPNs, proxies, and automated emulators are strictly prohibited and will be flagged by our security system.'
    }
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-[#FDFBF2] text-slate-800 scroll-smooth selection:bg-[#FFEAF0] selection:text-[#E33D6F] relative">
      
      {/* Sticky Header / Brand Navigation */}
      <header className="sticky top-0 z-40 bg-[#FDFBF2]/95 backdrop-blur-md border-b-3 border-slate-900 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
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
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-slate-900 bg-amber-400 text-slate-900 font-black text-[11px] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-900" />
          <span>TAP-TO-EARN & USDT REWARDS</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
          Slap. Earn. <br />
          <span className="text-[#FF2B6D] underline decoration-amber-400 decoration-wavy decoration-2">
            Withdraw in USDT!
          </span>
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
          Tap and slap bosses, complete high-paying tasks, and cash out real crypto rewards directly to your USDT wallet!
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto mb-6">
          <button
            onClick={() => handleAction('signup')}
            className="w-full font-black text-sm py-3 px-6 rounded-2xl border-3 border-slate-900 bg-[#FF2B6D] text-white hover:bg-rose-600 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <Gift className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Sign Up with Gmail (+100 SP)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => handleAction('login')}
            className="w-full font-black text-xs py-2.5 px-4 rounded-2xl border-3 border-slate-900 bg-white text-slate-900 hover:bg-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4 text-purple-600" />
            <span>Member Log In</span>
          </button>
        </div>

        {/* Starter Guarantee Card */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] max-w-xs mx-auto flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-slate-900 flex items-center justify-center shrink-0 text-emerald-600 font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-xs text-slate-900">Instant 100 SP Starter Bonus</div>
            <div className="text-[10px] font-semibold text-slate-500">Free sign up in seconds. No deposit needed.</div>
          </div>
        </div>
      </section>

      {/* Catchy Highlights Section */}
      <section className="px-4 py-8 bg-[#FDFBF2] border-b-3 border-slate-900">
        <div className="text-center mb-6">
          <div className="text-[10px] font-extrabold text-[#FF2B6D] uppercase tracking-widest mb-1">HOW IT WORKS</div>
          <h2 className="text-2xl font-black text-slate-900">Slap, Complete Tasks, Cash Out</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Simple, fast, and 100% focused on direct crypto rewards.</p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 max-w-md mx-auto">
          {highlights.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div key={idx} className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border-2 border-slate-900 ${item.iconBg} shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-sm text-slate-900">{item.title}</h3>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-slate-900 ${item.badgeColor}`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-snug">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* USDT Crypto Withdrawals */}
      <section className="px-4 py-8 bg-[#FFF9EA] border-b-3 border-slate-900">
        <div className="text-center mb-6">
          <div className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1">WITHDRAWALS</div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-1.5">
            <Coins className="w-6 h-6 text-emerald-600" />
            <span>Pure USDT Payouts</span>
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Direct payouts sent straight to your personal crypto wallet or exchange.</p>
        </div>

        <div className="space-y-2.5 max-w-md mx-auto">
          {usdtNetworks.map((net, i) => (
            <div key={i} className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-400 flex items-center justify-center text-emerald-700 shrink-0 font-black text-xs">
                  ₮
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900">{net.network}</div>
                  <div className="text-[10.5px] font-semibold text-slate-500 mt-0.5">{net.details}</div>
                </div>
              </div>
              <span className="text-[9px] font-black px-2 py-1 rounded-lg border border-slate-900 bg-amber-300 text-slate-900 shrink-0">
                {net.tag}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 max-w-md mx-auto bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3 flex items-center gap-2.5 text-left">
          <Wallet className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[11px] font-bold text-emerald-950 leading-tight">
            Compatible with Binance, Trust Wallet, MetaMask, OKX, Bybit, and any Web3 wallet.
          </p>
        </div>
      </section>

      {/* Fair & Secure Guarantee */}
      <section className="px-4 py-6 bg-slate-900 text-white border-b-3 border-slate-900">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="p-3 bg-amber-400 text-slate-900 rounded-2xl border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-sm text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Fair & Secure Platform</span>
            </h3>
            <p className="text-xs font-semibold text-slate-300 mt-0.5 leading-snug">
              Protected by ProxyGuard network verification, server-authenticated time checks, and encrypted cloud synchronization.
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

        <div className="space-y-2.5 max-w-md mx-auto">
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

        <div className="mt-6 pt-6 border-t border-rose-400/40 text-[10px] font-bold text-rose-200 flex flex-col gap-1.5 items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playSlap();
                setLegalTab('terms');
                setIsLegalOpen(true);
              }}
              className="text-white hover:underline cursor-pointer font-extrabold"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => {
                sound.playSlap();
                setLegalTab('privacy');
                setIsLegalOpen(true);
              }}
              className="text-white hover:underline cursor-pointer font-extrabold"
            >
              Privacy Policy
            </button>
          </div>
          <div>© {new Date().getFullYear()} SlapEarn.io. All rights reserved.</div>
          <div>Gamified Tap-to-Earn & USDT Crypto Rewards</div>
        </div>
      </section>

      {/* Legal Modal */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
}
