import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Lock, ArrowLeft, Mail, AlertTriangle, ShieldCheck, CheckCircle2, ExternalLink } from 'lucide-react';
import { sound } from '../utils/sound';

interface LegalPageProps {
  initialTab?: 'terms' | 'privacy';
  onNavigateHome: () => void;
}

export function LegalPage({ initialTab = 'terms', onNavigateHome }: LegalPageProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    // Keep URL in sync
    const targetPath = activeTab === 'terms' ? '/terms' : '/privacy';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    document.getElementById('legal-page-container')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div
      className="fixed inset-0 z-50 h-[100dvh] w-full bg-[#0F172A] text-slate-900 flex flex-col items-center justify-start p-3 sm:p-6 font-sans overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
      id="legal-page-container"
    >
      <div className="w-full max-w-2xl bg-[#FDFBF2] border-4 border-slate-900 rounded-[28px] sm:rounded-[36px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col my-4 shrink-0 mb-16 overflow-hidden">
        
        {/* Top Header */}
        <div className="sticky top-0 z-10 bg-[#FFEB3B] border-b-4 border-slate-900 p-4 sm:p-5 flex items-center justify-between rounded-t-[24px] sm:rounded-t-[32px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playSlap();
                onNavigateHome();
              }}
              className="p-2 bg-white hover:bg-slate-100 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black text-slate-950"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Back to App</span>
            </button>
            <div>
              <h1 className="font-black text-lg sm:text-xl text-slate-950 tracking-tight leading-none">
                SlapEarn Legal Center
              </h1>
              <p className="text-[11px] font-bold text-slate-800 mt-1">
                Official terms, policies & partner disclosures
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-950 text-[#FFD043] flex items-center justify-center font-black text-sm border-2 border-white shadow-[1.5px_1.5px_0px_0px_#000]">
            ⚡
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b-3 border-slate-900 p-2.5 sm:p-3 flex gap-2 sm:gap-3">
          <button
            onClick={() => {
              sound.playSlap();
              setActiveTab('terms');
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm border-3 border-slate-900 flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#A855F7] text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] scale-[1.01]'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service (/terms)</span>
          </button>

          <button
            onClick={() => {
              sound.playSlap();
              setActiveTab('privacy');
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm border-3 border-slate-900 flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#00D09E] text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] scale-[1.01]'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy (/privacy)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-7 space-y-5 text-slate-800 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'terms' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
                <h2 className="font-black text-base sm:text-lg text-slate-950">Terms of Service - SlapEarn</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Last updated: May 2025</p>
              </div>

              <section className="space-y-1.5 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-mono">1</span>
                  What is SlapEarn?
                </h3>
                <p className="text-slate-700 pl-8 font-medium">
                  SlapEarn (<a href="https://slapearn.ai.studio" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">https://slapearn.ai.studio</a>) is a rewards platform where users earn Slap Points (SP) by playing games and completing sponsored tasks from partners like CPX Research, AdGem, Lootably.
                </p>
              </section>

              <section className="space-y-1.5 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-mono">2</span>
                  Eligibility
                </h3>
                <p className="text-slate-700 pl-8 font-medium">
                  You must be 13+ to use SlapEarn. You must use your real Gmail account. One account per person/device.
                </p>
              </section>

              <section className="space-y-1.5 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-mono">3</span>
                  Earning
                </h3>
                <p className="text-slate-700 pl-8 font-medium">
                  SP is virtual points, not real money until converted. Task availability depends on our partners. We don't guarantee any task will be available. SP rates can change.
                </p>
              </section>

              <section className="space-y-1.5 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-mono">4</span>
                  Withdrawals
                </h3>
                <p className="text-slate-700 pl-8 font-medium">
                  You can convert SP to USDT via BEP-20, TRC-20, Polygon. Minimum withdrawal applies (20,000 SP = $2.00 USDT). We send to the wallet address you provide - double check it, we can't reverse crypto transfers.
                </p>
              </section>

              <section className="space-y-2 bg-rose-50 border-3 border-rose-400 rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <h3 className="font-black text-rose-950 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  5. Strictly Prohibited - This is what CPX/AdGem cares about
                </h3>
                <ul className="list-disc list-inside text-rose-900 font-semibold space-y-1.5 pl-2 text-xs sm:text-[13px]">
                  <li>VPN, proxy, abnormal proxy</li>
                  <li>Emulators, rooted devices, multiple accounts</li>
                  <li>Time-cheating, auto-clickers, bots</li>
                  <li>Country spoofing / faking location</li>
                </ul>
                <div className="bg-rose-100/80 border border-rose-300 rounded-xl p-2.5 text-rose-950 font-black text-xs mt-2">
                  ⚠️ If our ProxyGuard / Time Guard / Country Guard flags you, your account and SP will be banned. No appeal.
                </div>
              </section>

              <section className="space-y-1.5 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-mono">6</span>
                  Partner Tasks
                </h3>
                <p className="text-slate-700 pl-8 font-medium">
                  Sponsored surveys/offers are provided by third parties. SlapEarn is not responsible for third-party content. If a partner doesn't credit you, we can't credit manually.
                </p>
              </section>

              <section className="space-y-1.5 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-mono">7</span>
                  Termination
                </h3>
                <p className="text-slate-700 pl-8 font-medium">
                  We can ban any account that violates these terms.
                </p>
              </section>

              <div className="bg-[#FFD043] border-3 border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-slate-950 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Contact & Inquiries:</span>
                    <span className="font-mono font-black text-sm text-slate-950">support@slapearn.ai.studio</span>
                  </div>
                </div>
                <a
                  href="mailto:support@slapearn.ai.studio"
                  className="bg-slate-950 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-slate-800 transition-all border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                >
                  Email Support
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-white border-3 border-slate-900 rounded-2xl p-4 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)]">
                <h2 className="font-black text-base sm:text-lg text-slate-950">Privacy Policy - SlapEarn</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">How we protect, process, and respect your privacy</p>
              </div>

              <section className="space-y-2 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  We collect:
                </h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1.5 pl-2 font-medium">
                  <li>Email (via Google Sign-In), SP balance, device ID, IP address for fraud prevention</li>
                  <li>We use Firebase Authentication to secure logins</li>
                </ul>
              </section>

              <section className="space-y-2 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  How we use it:
                </h3>
                <p className="text-slate-700 pl-2 font-medium">
                  To give you SP, prevent fraud (VPN/emulator/country checks), and send USDT payouts.
                </p>
              </section>

              <section className="space-y-2 bg-indigo-50 border-3 border-indigo-300 rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <h3 className="font-black text-indigo-950 flex items-center gap-2 text-sm">
                  <ExternalLink className="w-5 h-5 text-indigo-600 shrink-0" />
                  Third parties:
                </h3>
                <ul className="list-disc list-inside text-indigo-900 space-y-2 pl-2 text-xs sm:text-[13px] font-medium">
                  <li>Our offerwall partners (CPX Research, AdGem, Lootably) may receive your anonymized user ID (e.g. SRitZPqiCHOXHqIYR1QSkR5mu8a2) to credit you. They don't get your email.</li>
                  <li>Firebase / Google for login and hosting</li>
                </ul>
              </section>

              <section className="space-y-2 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 text-sm">We don't sell your data:</h3>
                <p className="text-slate-700 font-medium">
                  We don't sell your data. You can request deletion at{' '}
                  <a href="mailto:support@slapearn.ai.studio" className="text-blue-600 font-black underline">
                    support@slapearn.ai.studio
                  </a>
                </p>
              </section>

              <section className="space-y-2 bg-white border-2 border-slate-300 rounded-2xl p-4">
                <h3 className="font-black text-slate-950 text-sm">Cookies:</h3>
                <p className="text-slate-700 font-medium">
                  We use basic cookies for login and security.
                </p>
              </section>

              <div className="bg-[#00D09E] border-3 border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-slate-950 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Privacy Inquiries & Data Deletion:</span>
                    <span className="font-mono font-black text-sm text-slate-950">support@slapearn.ai.studio</span>
                  </div>
                </div>
                <a
                  href="mailto:support@slapearn.ai.studio"
                  className="bg-slate-950 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-slate-800 transition-all border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                >
                  Request Deletion
                </a>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t-3 border-slate-900 p-4 flex items-center justify-between">
          <button
            onClick={() => {
              sound.playSlap();
              onNavigateHome();
            }}
            className="font-black text-xs text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to SlapEarn</span>
          </button>

          <span className="text-[11px] font-bold text-slate-500">
            © {new Date().getFullYear()} SlapEarn.io
          </span>
        </div>
      </div>
    </div>
  );
}

export default LegalPage;
