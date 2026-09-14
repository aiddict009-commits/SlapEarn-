import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, Lock, ExternalLink, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/sound';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
  /** Optional: open the same document as a standalone page (/terms, /privacy) */
  onOpenFullPage?: (tab: LegalTab) => void;
}

export function LegalModal({ isOpen, onClose, initialTab = 'terms', onOpenFullPage }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // The sheet stays mounted so it can animate out — re-sync the tab each time it opens
  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-lg bg-white border-3 border-slate-900 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col max-h-[90vh]"
          style={{ maxHeight: '85dvh' }}
        >
          {/* Header */}
          <div className="bg-[#FFEB3B] border-b-3 border-slate-900 p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white border-2 border-slate-900 rounded-xl shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                {activeTab === 'terms' ? (
                  <FileText className="w-5 h-5 text-slate-900" />
                ) : (
                  <Lock className="w-5 h-5 text-slate-900" />
                )}
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-950 leading-none">
                  {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </h3>
                <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                  SlapEarn Platform Agreement
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playSlap();
                onClose();
              }}
              className="p-1.5 bg-white hover:bg-slate-100 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-slate-900 stroke-[3]" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-slate-100 border-b-2 border-slate-900 p-2 flex gap-2">
            <button
              onClick={() => {
                sound.playSlap();
                setActiveTab('terms');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs border-2 border-slate-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-[#A855F7] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>

            <button
              onClick={() => {
                sound.playSlap();
                setActiveTab('privacy');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs border-2 border-slate-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-[#00D09E] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Content Body */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 text-slate-800 space-y-4 text-xs sm:text-[13px] leading-relaxed overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {activeTab === 'terms' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3">
                  <h4 className="font-black text-sm text-slate-950 mb-0.5">Terms of Service - SlapEarn</h4>
                  <p className="text-[11px] font-bold text-slate-500">Last updated: May 2025</p>
                </div>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono">1</span>
                    What is SlapEarn?
                  </h5>
                  <p className="text-slate-700 pl-6">
                    SlapEarn (<a href="https://slapearn.ai.studio" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">https://slapearn.ai.studio</a>) is a rewards platform where users earn Slap Points (SP) by playing games and completing sponsored tasks from partners like CPX Research, AdGem, Lootably.
                  </p>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono">2</span>
                    Eligibility
                  </h5>
                  <p className="text-slate-700 pl-6">
                    You must be 13+ to use SlapEarn. You must use your real Gmail account. One account per person/device.
                  </p>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono">3</span>
                    Earning
                  </h5>
                  <p className="text-slate-700 pl-6">
                    SP is virtual points, not real money until converted. Task availability depends on our partners. We don't guarantee any task will be available. SP rates can change.
                  </p>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono">4</span>
                    Withdrawals
                  </h5>
                  <p className="text-slate-700 pl-6">
                    You can convert SP to USDT via BEP-20, TRC-20, Polygon. Minimum withdrawal applies. We send to the wallet address you provide - double check it, we can't reverse crypto transfers.
                  </p>
                </section>

                <section className="space-y-1 bg-rose-50 border-2 border-rose-300 rounded-2xl p-3">
                  <h5 className="font-black text-rose-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    5. Strictly Prohibited - This is what CPX/AdGem cares about
                  </h5>
                  <ul className="list-disc list-inside text-rose-900 font-semibold space-y-1 pl-1 text-[11.5px] mt-1">
                    <li>VPN, proxy, abnormal proxy</li>
                    <li>Emulators, rooted devices, multiple accounts</li>
                    <li>Time-cheating, auto-clickers, bots</li>
                    <li>Country spoofing / faking location</li>
                  </ul>
                  <p className="text-rose-950 font-black text-[11px] mt-2 pt-2 border-t border-rose-200">
                    ⚠️ If our ProxyGuard / Time Guard / Country Guard flags you, your account and SP will be banned. No appeal.
                  </p>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono">6</span>
                    Partner Tasks
                  </h5>
                  <p className="text-slate-700 pl-6">
                    Sponsored surveys/offers are provided by third parties. SlapEarn is not responsible for third-party content. If a partner doesn't credit you, we can't credit manually.
                  </p>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono">7</span>
                    Termination
                  </h5>
                  <p className="text-slate-700 pl-6">
                    We can ban any account that violates these terms.
                  </p>
                </section>

                <div className="bg-[#FDFBF2] border-2 border-slate-900 rounded-2xl p-3 flex items-center justify-between gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="font-bold text-[11px] text-slate-600 block">Contact Support:</span>
                      <span className="font-mono font-black text-xs text-slate-950">support@slapearn.ai.studio</span>
                    </div>
                  </div>
                  <a
                    href="mailto:support@slapearn.ai.studio"
                    className="bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-slate-800 shrink-0"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3">
                  <h4 className="font-black text-sm text-slate-950 mb-0.5">Privacy Policy - SlapEarn</h4>
                  <p className="text-[11px] font-bold text-slate-500">How we protect and manage your information</p>
                </div>

                <section className="space-y-1.5">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    We collect:
                  </h5>
                  <ul className="list-disc list-inside text-slate-700 space-y-1 pl-2 font-medium">
                    <li>Email (via Google Sign-In), SP balance, device ID, IP address for fraud prevention</li>
                    <li>We use Firebase Authentication to secure logins</li>
                  </ul>
                </section>

                <section className="space-y-1.5">
                  <h5 className="font-black text-slate-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    How we use it:
                  </h5>
                  <p className="text-slate-700 pl-2">
                    To give you SP, prevent fraud (VPN/emulator/country checks), and send USDT payouts.
                  </p>
                </section>

                <section className="space-y-1.5 bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-3">
                  <h5 className="font-black text-indigo-950 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                    Third parties:
                  </h5>
                  <ul className="list-disc list-inside text-indigo-900 space-y-1.5 pl-1 text-[11.5px]">
                    <li>Our offerwall partners (CPX Research, AdGem, Lootably) may receive your anonymized user ID (e.g. SRitZPqiCHOXHqIYR1QSkR5mu8a2) to credit you. They don't get your email.</li>
                    <li>Firebase / Google for login and hosting</li>
                  </ul>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950">We don't sell your data:</h5>
                  <p className="text-slate-700">
                    We do not sell your personal information. You can request deletion at{' '}
                    <a href="mailto:support@slapearn.ai.studio" className="text-blue-600 font-bold underline">
                      support@slapearn.ai.studio
                    </a>.
                  </p>
                </section>

                <section className="space-y-1">
                  <h5 className="font-black text-slate-950">Cookies:</h5>
                  <p className="text-slate-700">
                    We use basic cookies and local storage tokens for authentication and security integrity.
                  </p>
                </section>

                <div className="bg-[#FDFBF2] border-2 border-slate-900 rounded-2xl p-3 flex items-center justify-between gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-[11px] text-slate-600 block">Privacy Inquiries:</span>
                      <span className="font-mono font-black text-xs text-slate-950">support@slapearn.ai.studio</span>
                    </div>
                  </div>
                  <a
                    href="mailto:support@slapearn.ai.studio"
                    className="bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-slate-800 shrink-0"
                  >
                    Contact
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="bg-slate-50 border-t-2 border-slate-900 p-3 flex items-center justify-between gap-2">
            {onOpenFullPage ? (
              <button
                onClick={() => {
                  sound.playSlap();
                  onOpenFullPage(activeTab);
                }}
                className="flex items-center gap-1.5 font-black text-[11px] text-slate-600 hover:text-slate-950 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open full page</span>
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => {
                sound.playSlap();
                onClose();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2 px-5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
export default LegalModal;
