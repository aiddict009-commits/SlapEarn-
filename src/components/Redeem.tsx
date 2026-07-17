import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  CreditCard, 
  ChevronRight, 
  AlertCircle, 
  ArrowLeft, 
  Send, 
  CheckCircle, 
  Download, 
  X,
  Coins,
  Hand,
  PlayCircle,
  ClipboardList,
  ArrowUpRight
} from 'lucide-react';
import { sound } from '../utils/sound';
import { RedemptionOption, UserStats, Transaction } from '../types';

interface RedeemProps {
  stats: UserStats;
  deductCoins: (amount: number, title: string, category: Transaction['category']) => boolean;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  transactions: Transaction[];
}

const REDEMPTION_CATALOG: RedemptionOption[] = [
  {
    id: 'red-paypal',
    name: 'PayPal Cashout',
    brand: 'paypal',
    logo: '💳',
    color: '#003087',
    rates: [
      { coins: 5000, value: 50 },
      { coins: 9500, value: 100 },
      { coins: 18000, value: 200 }
    ]
  },
  {
    id: 'red-amazon',
    name: 'Amazon e-Gift Card',
    brand: 'amazon',
    logo: '📦',
    color: '#ff9900',
    rates: [
      { coins: 5000, value: 50 },
      { coins: 9500, value: 100 }
    ]
  },
  {
    id: 'red-steam',
    name: 'Steam Wallet Balance',
    brand: 'steam',
    logo: '🎮',
    color: '#1b2838',
    rates: [
      { coins: 5000, value: 50 },
      { coins: 9500, value: 100 }
    ]
  },
  {
    id: 'red-bitcoin',
    name: 'Bitcoin (BTC) Wallet',
    brand: 'bitcoin',
    logo: '₿',
    color: '#f7931a',
    rates: [
      { coins: 5000, value: 50 },
      { coins: 9500, value: 100 }
    ]
  }
];

export default function Redeem({ stats, deductCoins, addNotification, transactions }: RedeemProps) {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<RedemptionOption | null>(null);
  const [selectedRateIndex, setSelectedRateIndex] = useState<number>(0);
  const [payoutDestination, setPayoutDestination] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<boolean>(false);
  const [payoutTxDetails, setPayoutTxDetails] = useState<{ value: number; destination: string; brandName: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  const handleOpenWithdraw = () => {
    sound.playSlap();
    if (stats.coins < 5000) {
      sound.playError();
      addNotification(
        'Balance Too Low', 
        `You need at least 5,000 SP to withdraw. Currently you have ${stats.coins.toLocaleString()} SP.`, 
        'info'
      );
      return;
    }
    // Open modal & pre-select first option
    setSelectedOption(REDEMPTION_CATALOG[0]);
    setSelectedRateIndex(0);
    setPayoutDestination('');
    setRedeemSuccess(false);
    setIsWithdrawModalOpen(true);
  };

  const handleSelectOption = (opt: RedemptionOption) => {
    sound.playSlap();
    setSelectedOption(opt);
    setSelectedRateIndex(0);
  };

  const handleSubmitRedemption = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOption || selectedRateIndex === null || !payoutDestination.trim()) return;

    const rate = selectedOption.rates[selectedRateIndex];
    if (stats.coins < rate.coins) {
      sound.playError();
      addNotification('Insufficient Balance!', `You need ${rate.coins - stats.coins} more SP for this withdrawal.`, 'info');
      return;
    }

    setIsSubmitting(true);
    sound.playSlap();

    // 2 seconds processing
    setTimeout(() => {
      const success = deductCoins(rate.coins, `${selectedOption.name} Withdrawal`, 'Redemption');
      setIsSubmitting(false);

      if (success) {
        sound.playSuccess();
        setPayoutTxDetails({
          value: rate.value,
          destination: payoutDestination,
          brandName: selectedOption.name
        });
        setRedeemSuccess(true);
        addNotification('Withdrawal Placed!', `Deducted ${rate.coins} SP. Transfer is pending audit.`, 'success');
      } else {
        sound.playError();
        addNotification('Error Processing Request', 'Something went wrong, please try again.', 'info');
      }
    }, 2000);
  };

  // Helper for Transaction Icon styling
  const getTxIcon = (category: Transaction['category']) => {
    switch (category) {
      case 'Daily Check-in':
        return <Gift className="w-5 h-5 text-amber-500" />;
      case 'Slap Game':
        return <Hand className="w-5 h-5 text-[#4965FF]" />;
      case 'Survey':
        return <ClipboardList className="w-5 h-5 text-[#FF3B77]" />;
      case 'Ad':
        return <PlayCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Coins className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col text-slate-900 select-none pb-8" id="wallet-view">
      
      {/* Title */}
      <div className="pl-1 mb-2.5">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Wallet
        </h2>
      </div>

      {/* Main Balance Card exactly matching screenshot */}
      <div 
        className="bg-[#151728] rounded-[24px] border-4 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center relative mb-4 text-center"
        id="wallet-main-card"
      >
        <span className="text-slate-400 font-bold tracking-wider text-[10px] uppercase">
          AVAILABLE BALANCE
        </span>
        
        <h3 className="text-3.5xl font-black text-white tracking-tight mt-1 mb-3.5 leading-none">
          {stats.coins.toLocaleString()} SP
        </h3>

        {/* Withdraw Button with bold white border */}
        <button
          onClick={handleOpenWithdraw}
          className="bg-[#FFD043] border-4 border-white text-slate-950 font-black text-sm px-6 py-3 rounded-[16px] shadow-[2px_2.5px_0px_0px_#000] flex items-center justify-center gap-2 hover:bg-[#FFE066] active:scale-95 transition-all w-full"
          id="withdraw-action-button"
        >
          <Download className="w-4.5 h-4.5 text-slate-950 stroke-[2.5px]" />
          <span>Withdraw</span>
        </button>

        <span className="text-slate-400 font-bold text-[10px] mt-2.5">
          Minimum withdrawal: 5,000 SP
        </span>
      </div>

      {/* Recent Activity heading */}
      <div className="mt-1.5 pl-1 flex items-center justify-between mb-2">
        <h4 className="text-lg font-black text-slate-900 tracking-tight">
          Recent activity
        </h4>
      </div>

      {/* Recent Activity Transactions List */}
      <div className="flex flex-col gap-2.5" id="recent-activity-list">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-[24px] border-4 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-center text-slate-400 font-bold text-sm">
            No activity yet. Go slap to earn!
          </div>
        ) : (
          <>
            {transactions.slice(0, visibleCount).map((tx) => (
              <div 
                key={tx.id} 
                className="bg-white rounded-[24px] border-4 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between"
                id={`activity-item-${tx.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border-3 border-slate-900 bg-[#FFFDF6] flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] shrink-0">
                    {getTxIcon(tx.category)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-slate-950 text-sm leading-tight truncate pr-1">
                      {tx.title}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold mt-0.5">
                      {new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className={`font-black text-sm ${tx.type === 'earn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()} SP
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}

            {transactions.length > visibleCount && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => {
                    sound.playSlap();
                    setVisibleCount((prev) => prev + 5);
                  }}
                  className="px-6 py-2 bg-white border-4 border-slate-900 rounded-[20px] font-black text-xs text-slate-950 shadow-[2px_2.5px_0px_0px_rgba(15,23,42,1)] hover:bg-[#FFEED1] active:scale-95 transition-all"
                  id="load-more-activity-btn"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- WITHDRAWAL GATEWAY MODAL (Only opens when >= 5,000 SP) --- */}
      <AnimatePresence>
        {isWithdrawModalOpen && selectedOption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isSubmitting) setIsWithdrawModalOpen(false); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-6 max-w-sm w-full relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900"
            >
              
              {/* Close Button */}
              {!isSubmitting && (
                <button 
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                >
                  <X className="w-5 h-5 text-slate-900" />
                </button>
              )}

              {!redeemSuccess ? (
                /* Withdrawal Flow */
                <div className="flex flex-col py-2">
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2 mb-1">
                    <ArrowUpRight className="w-6 h-6 text-[#FF3B77]" />
                    Withdrawal
                  </h3>
                  <p className="text-slate-400 font-bold text-xs mb-5">
                    Select a secure payout provider below
                  </p>

                  {/* Provider Pills */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {REDEMPTION_CATALOG.map((opt) => {
                      const isSelected = selectedOption.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border-3 border-slate-900 transition-all ${
                            isSelected 
                              ? 'bg-[#FFD043] font-black text-slate-950' 
                              : 'bg-white font-bold text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-lg">{opt.logo}</span>
                          <span className="text-xs truncate">{opt.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tier options */}
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Select Tier Value
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {selectedOption.rates.map((rate, idx) => {
                      const isSelected = selectedRateIndex === idx;
                      const hasSufficient = stats.coins >= rate.coins;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!hasSufficient}
                          onClick={() => { sound.playSlap(); setSelectedRateIndex(idx); }}
                          className={`p-3 rounded-xl border-3 border-slate-900 flex flex-col items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-[#FFEAF0] text-[#FF3B77] font-black border-[#FF3B77]' 
                              : hasSufficient 
                                ? 'bg-white text-slate-700 font-bold hover:bg-slate-50' 
                                : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-lg font-black">${rate.value}.00 K</span>
                          <span className="text-[10px] opacity-75">{rate.coins.toLocaleString()} SP</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Destination input form */}
                  <form onSubmit={handleSubmitRedemption} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        {selectedOption.brand === 'paypal' && 'PayPal Account Email Address'}
                        {selectedOption.brand === 'amazon' && 'E-gift Delivery Email'}
                        {selectedOption.brand === 'steam' && 'Steam Account Username'}
                        {selectedOption.brand === 'bitcoin' && 'Bitcoin Wallet Address (BTC)'}
                      </label>
                      <input
                        type={selectedOption.brand === 'bitcoin' ? 'text' : 'email'}
                        required
                        value={payoutDestination}
                        onChange={(e) => setPayoutDestination(e.target.value)}
                        placeholder={
                          selectedOption.brand === 'bitcoin'
                            ? 'e.g. 1A1zP1eP5QGefi2DMPTfTL5SLmv...'
                            : 'e.g. user@gmail.com'
                        }
                        className="w-full bg-white border-3 border-slate-900 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#FF3B77] transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !payoutDestination.trim()}
                      className="w-full bg-[#FF3B77] border-4 border-slate-900 text-white font-black text-sm py-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-[#E33D6F] transition-all active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Auditing security logs...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4. h-4" />
                          <span>Confirm Withdrawal</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* Success screen */
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center border-3 border-slate-900 mb-4 shadow-[2px_2.5px_0px_0px_#000]">
                    <CheckCircle className="w-9 h-9 stroke-[2.5px]" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-600">Pending Review</h3>
                  <p className="text-slate-600 font-bold text-xs mt-2 px-1 leading-relaxed">
                    We registered your withdrawal of <strong className="text-slate-900 font-black">K{payoutTxDetails?.value}.00</strong> to {payoutTxDetails?.destination}. Our administrators are reviewing completed slaps for verification.
                  </p>

                  <div className="bg-white border-3 border-slate-900 rounded-2xl p-3 w-full mt-5 text-left text-[11px] space-y-1 font-bold text-slate-600">
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <span className="text-slate-900 font-black">{payoutTxDetails?.brandName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-amber-500 uppercase font-black">Manual Audit</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="mt-6 w-full font-black text-sm py-3 rounded-2xl border-4 border-slate-900 bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95"
                  >
                    Return to Wallet
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
