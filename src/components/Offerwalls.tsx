import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, ShieldCheck, Flame, Trophy, Smartphone, ChevronRight, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import { sound } from '../utils/sound';
import { Offer, Transaction } from '../types';

interface OfferwallsProps {
  updateCoinsAndXp: (coins: number, xp: number, category: Transaction['category'], title: string) => void;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
}

const MOCK_OFFERS: Offer[] = [
  {
    id: 'offer-1',
    title: 'Coin Miner Tycoon 3D',
    description: 'Install and reach Mine Level 10 to mine heavy real-world reward pools!',
    reward: 1200,
    type: 'game',
    difficulty: 'Medium',
    logo: '⛏️',
    partner: 'Adfalcon Adwall',
    status: 'available',
    steps: [
      { text: 'Download and open Coin Miner Tycoon 3D', completed: false },
      { text: 'Upgrade to Mine Shaft Level 5', completed: false },
      { text: 'Unlock Gold Mine Shaft (Level 10)', completed: false }
    ]
  },
  {
    id: 'offer-2',
    title: 'DexiWallet Secure Crypto',
    description: 'Create a free digital web3 asset wallet and claim your initial secure key phrase.',
    reward: 600,
    type: 'app',
    difficulty: 'Easy',
    logo: '🔒',
    partner: 'Fyber Reward Portal',
    status: 'available',
    steps: [
      { text: 'Install DexiWallet from App Store', completed: false },
      { text: 'Create a profile & verify email', completed: false }
    ]
  },
  {
    id: 'offer-3',
    title: 'Sling Beats Premium',
    description: 'Sign up for a free trial account, listen to 1 radio stream, and enjoy heavy bass.',
    reward: 450,
    type: 'signup',
    difficulty: 'Easy',
    logo: '🎵',
    partner: 'IronSource Media',
    status: 'available',
    steps: [
      { text: 'Sign up for Sling Beats free account', completed: false },
      { text: 'Stream 1 full song from any station', completed: false }
    ]
  }
];

export default function Offerwalls({ updateCoinsAndXp, addNotification }: OfferwallsProps) {
  const [offers, setOffers] = useState<Offer[]>(() => {
    const cached = localStorage.getItem('slapearn_offers');
    return cached ? JSON.parse(cached) : MOCK_OFFERS;
  });

  const [simulatingOfferId, setSimulatingOfferId] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [isSimulatingAction, setIsSimulatingAction] = useState<boolean>(false);

  const saveOffersToLocalStorage = (updated: Offer[]) => {
    localStorage.setItem('slapearn_offers', JSON.stringify(updated));
    setOffers(updated);
  };

  const handleStartOffer = (offer: Offer) => {
    const updated = offers.map((o) => {
      if (o.id === offer.id) {
        return { ...o, status: 'started' as const };
      }
      return o;
    });
    saveOffersToLocalStorage(updated);
    
    // Begin step simulator
    setSimulatingOfferId(offer.id);
    
    // Find first incomplete step
    const firstIncomplete = offer.steps.findIndex((s) => !s.completed);
    setSimulationStep(firstIncomplete !== -1 ? firstIncomplete : 0);

    sound.playSuccess();
    addNotification('Offer Initialized!', `You started '${offer.title}'. Simulating tasks...`, 'info');
  };

  // Simulate progress triggers
  const handleSimulateStepAction = () => {
    if (!simulatingOfferId) return;

    const offer = offers.find((o) => o.id === simulatingOfferId);
    if (!offer) return;

    setIsSimulatingAction(true);
    sound.playSlap();

    // 1.5 seconds simulated action delay (downloading/leveling)
    setTimeout(() => {
      setIsSimulatingAction(false);
      sound.playSuccess();

      // Progress the specific step
      const updatedSteps = [...offer.steps];
      updatedSteps[simulationStep] = { ...updatedSteps[simulationStep], completed: true };

      // Calculate micro payouts (total reward divided by number of steps)
      const stepReward = Math.floor(offer.reward / offer.steps.length);
      updateCoinsAndXp(stepReward, 200, 'Offerwall', `Offerwall step: ${offer.title} - Step ${simulationStep + 1}`);

      const allCompleted = updatedSteps.every((s) => s.completed);
      const nextStatus = allCompleted ? ('completed' as const) : ('started' as const);

      const updatedOffers = offers.map((o) => {
        if (o.id === simulatingOfferId) {
          return {
            ...o,
            steps: updatedSteps,
            status: nextStatus
          };
        }
        return o;
      });

      saveOffersToLocalStorage(updatedOffers);
      addNotification('Task Step Cleared!', `Earned +${stepReward} Coins & +200 XP from Offerwall!`, 'success');

      if (allCompleted) {
        setSimulatingOfferId(null);
      } else {
        setSimulationStep((prev) => prev + 1);
      }
    }, 1500);
  };

  const handleClaimFinalBonus = (offer: Offer) => {
    // If completed but not fully claimed yet, let them claim and set status to 'claimed'
    const updatedOffers = offers.map((o) => {
      if (o.id === offer.id) {
        return { ...o, status: 'claimed' as const };
      }
      return o;
    });
    saveOffersToLocalStorage(updatedOffers);

    // Give bonus (e.g. 100 extra final coins and a big notification)
    updateCoinsAndXp(100, 150, 'Offerwall', `Bonus Reward for fully completing ${offer.title}`);
    sound.playCoin();
    addNotification('Offer Complete!', `Awarded +100 Coins Epic Bonus for completing ${offer.title}!`, 'success');
  };

  const handleResetOfferwall = () => {
    // Reset all offers to available
    const fresh = MOCK_OFFERS.map((o) => ({
      ...o,
      status: 'available' as const,
      steps: o.steps.map((s) => ({ ...s, completed: false }))
    }));
    saveOffersToLocalStorage(fresh);
    setSimulatingOfferId(null);
    sound.playSuccess();
    addNotification('Offers Reset!', 'Offerwalls refilled with fresh rewards!', 'info');
  };

  const currentSimulatingOffer = offers.find((o) => o.id === simulatingOfferId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl" id="offerwalls-tab">
      
      {/* Simulation Modal inside current tab */}
      <AnimatePresence>
        {simulatingOfferId && currentSimulatingOffer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-6 bg-slate-950 border-2 border-emerald-500/20 rounded-2xl"
            id="offer-simulator-dashboard"
          >
            <div className="flex justify-between items-start mb-4 border-b border-slate-900 pb-4">
              <div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                  Interactive Offer Task Simulator
                </span>
                <h3 className="font-display font-black text-lg text-white mt-2">
                  Active: {currentSimulatingOffer.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Sponsored by: {currentSimulatingOffer.partner}</p>
              </div>

              <button
                onClick={() => setSimulatingOfferId(null)}
                id="cancel-offer-simulation"
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                Close Panel
              </button>
            </div>

            {/* Simulated Action Console */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Steps display */}
              <div className="space-y-3">
                {currentSimulatingOffer.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-display ${
                      step.completed
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        : idx === simulationStep
                        ? 'bg-slate-900 border-amber-500 text-white animate-pulse'
                        : 'bg-slate-900/30 border-slate-850 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${
                        step.completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-850 text-slate-400'
                      }`}>
                        {step.completed ? '✓' : idx + 1}
                      </div>
                      <span>{step.text}</span>
                    </div>

                    <span className="font-mono font-bold">
                      +{Math.floor(currentSimulatingOffer.reward / currentSimulatingOffer.steps.length)} Coins
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Simulation Area */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center flex flex-col justify-center items-center">
                <Smartphone className="w-12 h-12 text-slate-500 mb-3" />
                <h4 className="font-display font-bold text-sm text-white">Simulated Mobile Sandbox</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                  Press the execution switch below to mimic setting up credentials, playing sessions, or reaching levels on your virtual phone.
                </p>

                <button
                  onClick={handleSimulateStepAction}
                  disabled={isSimulatingAction}
                  id="simulate-offer-step-btn"
                  className={`mt-5 px-6 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                    isSimulatingAction
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isSimulatingAction ? (
                    <>
                      <div className="w-4.5 h-4.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <span>Syncing device log...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      <span>Simulate step {simulationStep + 1}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Listing View */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-display font-semibold tracking-wide text-sm uppercase">
              <Layers className="w-5 h-5 text-emerald-500" />
              <span>Multi-Source Offerwalls</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-white mt-1">Sponsor Offer Portals</h2>
            <p className="text-slate-400 text-sm mt-1">
              Complete app audits, unlock game levels, and verify setups to earn the absolute highest coin values.
            </p>
          </div>

          <button
            onClick={handleResetOfferwall}
            id="reset-offerwall-btn"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-xl font-display font-bold transition-all"
          >
            Refresh Offers
          </button>
        </div>

        {/* Offer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map((offer) => {
            const completedCount = offer.steps.filter((s) => s.completed).length;
            const progressPercent = (completedCount / offer.steps.length) * 100;

            return (
              <div
                key={offer.id}
                id={`offer-card-${offer.id}`}
                className={`bg-slate-950/40 p-5 rounded-2xl border flex flex-col justify-between h-72 transition-all ${
                  offer.status === 'claimed'
                    ? 'border-emerald-500/20 opacity-70 text-slate-500'
                    : 'border-slate-850 hover:border-slate-700 text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{offer.logo}</span>
                      <div>
                        <h3 className="font-display font-bold text-sm leading-tight text-white">{offer.title}</h3>
                        <span className="text-[10px] text-slate-500">{offer.partner}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      offer.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {offer.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {offer.description}
                  </p>
                </div>

                {/* Progress bar inside card */}
                {offer.status !== 'available' && (
                  <div className="my-3 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1 text-slate-400">
                      <span>Progress Details</span>
                      <span>{completedCount} / {offer.steps.length} Steps</span>
                    </div>
                    <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-900">
                  <div className="flex items-center gap-1 text-xs font-mono font-black text-amber-500">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>+{offer.reward} Coins</span>
                  </div>

                  {offer.status === 'available' && (
                    <button
                      onClick={() => handleStartOffer(offer)}
                      id={`start-offer-btn-${offer.id}`}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                    >
                      <span>Start Offer</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5px]" />
                    </button>
                  )}

                  {offer.status === 'started' && (
                    <button
                      onClick={() => setSimulatingOfferId(offer.id)}
                      id={`simulate-resume-btn-${offer.id}`}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs rounded-xl transition-all"
                    >
                      Resume Test
                    </button>
                  )}

                  {offer.status === 'completed' && (
                    <button
                      onClick={() => handleClaimFinalBonus(offer)}
                      id={`claim-offer-bonus-${offer.id}`}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-lg shadow-amber-500/15"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>Claim +100 bonus</span>
                    </button>
                  )}

                  {offer.status === 'claimed' && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold font-display">
                      <CheckCircle className="w-4 h-4 fill-emerald-500/10 text-emerald-400" />
                      <span>Full Rewards Claimed</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
