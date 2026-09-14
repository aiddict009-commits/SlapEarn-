import { useState, FormEvent, useMemo, useEffect } from 'react';
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
  ArrowUpRight,
  Sparkles,
  Clock,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { sound } from '../utils/sound';
import { RedemptionOption, UserStats, Transaction, EconomyConfig, DEFAULT_ECONOMY_CONFIG } from '../types';
import { addWithdrawalToFirestore, createWithdrawalApi } from '../lib/firebase';
import { syncServerTime, getServerNow, verifyWithdrawalServer } from '../utils/serverTime';
import { AnimatedOdometer } from './AnimatedOdometer';

interface RedeemProps {
  stats: UserStats;
  deductCoins: (amount: number, title: string, category: Transaction['category']) => boolean;
  addNotification: (title: string, message: string, type: 'success' | 'info') => void;
  transactions: Transaction[];
  updateStatsDirectly?: (newStats: Partial<UserStats>) => void;
  economyConfig?: EconomyConfig;
}

export default function Redeem({ stats, deductCoins, addNotification, transactions, updateStatsDirectly, economyConfig }: RedeemProps) {
  const config = economyConfig || DEFAULT_ECONOMY_CONFIG;
  const ratio = config.spPerUsdRatio || 10000;
  const minUsd = config.minCashoutUsd || 0.5;
  const minCoins = Math.round(minUsd * ratio);

  // Sync server time on mount to guard against device clock tampering
  useEffect(() => {
    syncServerTime();
  }, []);

  // Account Age Calculation using server-synced time
  const userCreatedAt = typeof stats.createdAt === 'number'
    ? stats.createdAt
    : stats.createdAt
      ? new Date(stats.createdAt).getTime()
      : getServerNow() - 10 * 24 * 60 * 60 * 1000; // Default fallback for demo stats >= 10 days

  const serverNow = getServerNow();
  const accountAgeMs = Math.max(0, serverNow - userCreatedAt);
  const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
  const REQUIRED_ACCOUNT_AGE_DAYS = 7;
  const isAccountAgeEligible = accountAgeDays >= REQUIRED_ACCOUNT_AGE_DAYS;
  const daysRemainingForWithdrawal = Math.max(1, Math.ceil((REQUIRED_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000 - accountAgeMs) / (1000 * 60 * 60 * 24)));

  // Dynamically build available redemption options based on admin toggles & conversion rates
  const catalog = useMemo<RedemptionOption[]>(() => {
    const list: RedemptionOption[] = [];

    if (config.enableCryptoUsdt ?? true) {
      list.push({
        id: 'red-usdt',
        name: 'USDT (Tether Crypto)',
        brand: 'usdt',
        logo: '💲',
        color: '#26A17B',
        rates: [
          { coins: 20000, value: 2 },
          { coins: 50000, value: 5 },
          { coins: 100000, value: 10 }
        ]
      });
    }

    if (config.enablePaypal) {
      list.push({
        id: 'red-paypal',
        name: 'PayPal Cash',
        brand: 'paypal',
        logo: '💳',
        color: '#003087',
        rates: [
          { coins: 20000, value: 2 },
          { coins: 50000, value: 5 },
          { coins: 100000, value: 10 }
        ]
      });
    }

    if (config.enableAmazonGiftCards) {
      list.push({
        id: 'red-amazon',
        name: 'Amazon e-Gift Card',
        brand: 'amazon',
        logo: '🛒',
        color: '#FF9900',
        rates: [
          { coins: minCoins, value: Number((minCoins / ratio).toFixed(2)) },
          { coins: minCoins * 5, value: Number(((minCoins * 5) / ratio).toFixed(2)) }
        ]
      });
    }

    if (config.enableGooglePlayCards) {
      list.push({
        id: 'red-googleplay',
        name: 'Google Play Gift Card',
        brand: 'googleplay',
        logo: '🎮',
        color: '#01875F',
        rates: [
          { coins: minCoins, value: Number((minCoins / ratio).toFixed(2)) },
          { coins: minCoins * 5, value: Number(((minCoins * 5) / ratio).toFixed(2)) }
        ]
      });
    }

    if (config.enableMobileMoney) {
      list.push({
        id: 'red-mobilemoney',
        name: 'Mobile Money / Bank Transfer',
        brand: 'mobilemoney',
        logo: '📱',
        color: '#E11D48',
        rates: [
          { coins: minCoins, value: Number((minCoins / ratio).toFixed(2)) },
          { coins: minCoins * 5, value: Number(((minCoins * 5) / ratio).toFixed(2)) }
        ]
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'red-usdt',
        name: 'USDT (Tether Crypto)',
        brand: 'usdt',
        logo: '💲',
        color: '#26A17B',
        rates: [
          { coins: minCoins, value: Number((minCoins / ratio).toFixed(2)) }
        ]
      });
    }

    return list;
  }, [config, ratio, minCoins]);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<RedemptionOption | null>(null);
  const [selectedRateIndex, setSelectedRateIndex] = useState<number>(0);
  const [cryptoNetwork, setCryptoNetwork] = useState<'BEP-20' | 'TRC-20' | 'Polygon'>('BEP-20');
  const [payoutDestination, setPayoutDestination] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<boolean>(false);
  const [payoutTxDetails, setPayoutTxDetails] = useState<{ value: number; destination: string; brandName: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  const handleOpenWithdraw = async () => {
    sound.playSlap();

    if (stats.isRestricted || stats.status === 'Restricted' || stats.status === 'Frozen') {
      sound.playError();
      addNotification(
        'Account Restricted',
        'Your account is currently restricted from redeeming points. Please contact support.',
        'info'
      );
      return;
    }

    // Verify 7 days account age requirement with backend server
    const serverCheck = await verifyWithdrawalServer(userCreatedAt);
    if (!serverCheck.isEligible) {
      sound.playError();
      addNotification(
        'Account Age Requirement (7 Days - Server Verified)',
        `Your account must be at least 7 days old to request withdrawals. Server verified current age: ${serverCheck.accountAgeDays} day(s). Please wait ${serverCheck.daysRemaining} more day(s)!`,
        'info'
      );
      return;
    }

    // Check admin policy required referrals
    const reqReferrals = config.requiredReferralsForCashout || 0;
    if (reqReferrals > 0 && (stats.referrals || 0) < reqReferrals) {
      sound.playError();
      addNotification(
        'Referral Requirement Active',
        `Admin policy requires at least ${reqReferrals} active referral(s) before unlocking cashouts. You currently have ${stats.referrals || 0}.`,
        'info'
      );
      return;
    }

    if (stats.coins < minCoins) {
      sound.playError();
      addNotification(
        'Balance Too Low', 
        `You need at least ${minCoins.toLocaleString()} SP ($${minUsd.toFixed(2)} USD) to withdraw. Currently you have ${stats.coins.toLocaleString()} SP.`, 
        'info'
      );
      return;
    }
    // Open modal & pre-select first option from dynamic catalog
    setSelectedOption(catalog[0]);
    setSelectedRateIndex(0);
    setCryptoNetwork('BEP-20');
    setPayoutDestination('');
    setRedeemSuccess(false);
    setIsWithdrawModalOpen(true);
  };

  const handleSelectOption = (opt: RedemptionOption) => {
    sound.playSlap();
    setSelectedOption(opt);
    setSelectedRateIndex(0);
  };

  const handleSubmitRedemption = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOption || selectedRateIndex === null || !payoutDestination.trim()) return;

    // Server-side verification before submitting withdrawal
    const serverCheck = await verifyWithdrawalServer(userCreatedAt);
    if (!serverCheck.isEligible) {
      sound.playError();
      addNotification('Account Age Requirement', `Server verification failed: Account must be at least 7 days old to withdraw (${serverCheck.accountAgeDays}/7 days completed).`, 'info');
      return;
    }

    const rate = selectedOption.rates[selectedRateIndex];
    if (stats.coins < rate.coins) {
      sound.playError();
      addNotification('Insufficient Balance!', `You need ${rate.coins - stats.coins} more SP for this withdrawal.`, 'info');
      return;
    }

    setIsSubmitting(true);
    sound.playSlap();

    const isUsdt = selectedOption.brand === 'usdt';
    const fullMethodName = isUsdt ? `USDT (${cryptoNetwork})` : selectedOption.name;
    const formattedDestination = isUsdt ? `${cryptoNetwork}: ${payoutDestination.trim()}` : payoutDestination.trim();

    try {
      // 1. Submit through secure atomic server API (Fix 7)
      const result = await createWithdrawalApi({
        method: fullMethodName,
        destination: formattedDestination,
        spAmount: rate.coins,
        usdAmount: rate.value,
      });

      setIsSubmitting(false);
      sound.playSuccess();

      // Reset referrals count for withdrawal cycle in UI
      updateStatsDirectly?.({
        referralsForCurrentWithdrawal: 0,
      });

      setPayoutTxDetails({
        value: rate.value,
        destination: formattedDestination,
        brandName: fullMethodName,
      });
      setRedeemSuccess(true);
      addNotification('Withdrawal Placed!', `Deducted ${rate.coins.toLocaleString()} SP for $${rate.value} ${fullMethodName}.`, 'success');
    } catch (err: any) {
      console.warn('[Withdrawal] Server rejected withdrawal request:', err);
      setIsSubmitting(false);
      sound.playError();
      const userFriendlyMsg = err.message?.includes('ACCOUNT_TOO_NEW')
        ? 'Account must be at least 24 hours old to request cashouts.'
        : err.message?.includes('VPN_OR_PROXY')
        ? 'Withdrawals cannot be processed over VPN or Proxy connections.'
        : err.message?.includes('DAILY_WITHDRAWAL_CAP')
        ? 'Daily withdrawal limit reached. Please try again tomorrow.'
        : err.message || 'Unable to process withdrawal. Please verify eligibility and try again.';
      addNotification('Withdrawal Request Denied', userFriendlyMsg, 'info');
    }
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

      {/* Account Restricted Banner */}
      {(stats.isRestricted || stats.status === 'Restricted' || stats.status === 'Frozen') && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 mb-3 text-rose-900 font-bold text-xs flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <span className="font-black text-rose-900 block uppercase tracking-wider text-[11px]">
              Account Restricted by Admin
            </span>
            <span className="text-rose-700 text-[11px]">
              Your account has been restricted. Earning rewards and redeeming points are currently disabled.
            </span>
          </div>
        </div>
      )}

      {/* Account Age Requirement Notice Banner */}
      {!isAccountAgeEligible ? (
        <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-3 mb-3.5 shadow-sm flex items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 shrink-0">
              <Clock className="w-4.5 h-4.5 stroke-[2.5px]" />
            </div>
            <div>
              <span className="font-black text-amber-950 block uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Account Age Requirement (7 Days • Server Sync)
              </span>
              <span className="text-amber-800 text-[11px] font-semibold leading-tight block">
                Your account is {accountAgeDays} day(s) old (server verified). Withdrawals unlock in {daysRemainingForWithdrawal} day(s).
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 shrink-0 shadow-[1px_1px_0px_0px_#000]">
            {accountAgeDays}/7 Days
          </span>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-2.5 mb-3.5 flex items-center justify-between text-emerald-950 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-950">
              Server Verified Account Age ({accountAgeDays} days old) • Withdrawals Unlocked
            </span>
          </div>
          <span className="text-[9px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md uppercase border border-slate-900 shadow-[1px_1px_0px_0px_#000]">
            Eligible
          </span>
        </div>
      )}

      {/* Main Balance Card exactly matching screenshot */}
      <div 
        className="bg-[#151728] rounded-[24px] border-4 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center relative mb-4 text-center"
        id="wallet-main-card"
      >
        <span className="text-slate-400 font-bold tracking-wider text-[10px] uppercase">
          AVAILABLE BALANCE
        </span>
        
        <h3 className="text-3.5xl font-black text-white tracking-tight mt-1 leading-none flex items-baseline justify-center">
          <AnimatedOdometer value={stats.coins} suffix="SP" />
        </h3>
        <span className="text-emerald-400 font-bold text-xs mt-1 mb-3.5 block">
          ≈ ${(stats.coins / ratio).toFixed(2)} USD
        </span>

        {/* Withdraw Button with bold white border */}
        <button
          onClick={handleOpenWithdraw}
          className={`border-4 border-white font-black text-sm px-6 py-3 rounded-[16px] shadow-[2px_2.5px_0px_0px_#000] flex items-center justify-center gap-2 transition-all w-full ${
            !isAccountAgeEligible
              ? 'bg-slate-300 text-slate-700 border-slate-400 opacity-90 cursor-not-allowed hover:bg-slate-300'
              : 'bg-[#FFD043] text-slate-950 hover:bg-[#FFE066] active:scale-95'
          }`}
          id="withdraw-action-button"
        >
          {!isAccountAgeEligible ? (
            <>
              <Lock className="w-4.5 h-4.5 text-slate-700 stroke-[2.5px]" />
              <span>Withdraw Locked (7 Days Account Age Required)</span>
            </>
          ) : (
            <>
              <Download className="w-4.5 h-4.5 text-slate-950 stroke-[2.5px]" />
              <span>Withdraw</span>
            </>
          )}
        </button>

        <span className="text-slate-400 font-bold text-[10px] mt-2.5">
          Minimum withdrawal: {minCoins.toLocaleString()} SP (${minUsd.toFixed(2)} USD)
        </span>
      </div>

      {/* More Payment Options Notice Banner */}
      <div className="bg-[#101426] border-2 border-amber-400/80 rounded-2xl p-3 mb-3 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-4 h-4 stroke-[2.5px] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white leading-tight">
              Dynamic Admin Payout Gateways Active 💲
            </span>
            <span className="text-[9px] text-amber-200 font-bold mt-0.5">
              Rate: {ratio.toLocaleString()} SP = $1.00 USD • {catalog.length} Active Gateways
            </span>
          </div>
        </div>
        <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-2 py-1 rounded-lg border border-slate-950 uppercase shrink-0 font-sans shadow-[1px_1px_0px_0px_#000]">
          Active ✨
        </span>
      </div>

      {/* Referral Quota Banner */}
      <div className="bg-[#F3E8FF] border-2 border-slate-900 rounded-xl p-2.5 mb-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-200 border border-slate-900 flex items-center justify-center shrink-0">
            <span className="text-xs">👥</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-900 leading-none">
              Referral Rewards (Current Cycle)
            </span>
            <span className="text-[9px] text-slate-600 font-bold mt-0.5">
              100 SP per friend who watches 20 ads
            </span>
          </div>
        </div>
        <span className="text-[10px] font-black bg-[#A855F7] text-white px-2 py-0.5 rounded-full border border-slate-900 shadow-[1px_1px_0px_0px_#000] shrink-0">
          {(stats.referralsForCurrentWithdrawal || 0)} / 3
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
              className="bg-[#FDFBF2] border-4 border-slate-900 rounded-[32px] p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto relative shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] z-10 text-slate-900"
            >
              
              {/* Close Button */}
              {!isSubmitting && (
                <button 
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] z-20"
                >
                  <X className="w-5 h-5 text-slate-900" />
                </button>
              )}

              {!redeemSuccess ? (
                /* Withdrawal Flow */
                <div className="flex flex-col py-1 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💸</span>
                    <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                      Withdraw SP
                    </h3>
                  </div>

                  {/* Select an amount */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                      Select an amount:
                    </label>
                    <div className="space-y-2">
                      {selectedOption.rates.map((rate, idx) => {
                        const isSelected = selectedRateIndex === idx;
                        const hasSufficient = stats.coins >= rate.coins;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!hasSufficient}
                            onClick={() => { sound.playSlap(); setSelectedRateIndex(idx); }}
                            className={`w-full p-3 rounded-2xl border-3 text-left flex items-center justify-between transition-all ${
                              isSelected 
                                ? 'bg-[#FFD043] border-slate-900 text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] scale-[1.01]' 
                                : hasSufficient 
                                  ? 'bg-white border-slate-900 text-slate-900 font-bold hover:bg-amber-50/60 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer' 
                                  : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-400 bg-white'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#FFD043]" />}
                              </div>
                              <span className="text-sm font-black">{rate.coins.toLocaleString()} SP</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-400">→</span>
                              <span className={`text-sm font-black ${isSelected ? 'text-slate-950' : hasSufficient ? 'text-emerald-700' : 'text-slate-400'}`}>
                                ${rate.value}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* USDT Network Selection */}
                  {selectedOption.brand === 'usdt' && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                        Select USDT Network:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['BEP-20', 'TRC-20', 'Polygon'] as const).map((net) => {
                          const isNetSelected = cryptoNetwork === net;
                          return (
                            <button
                              key={net}
                              type="button"
                              onClick={() => {
                                sound.playSlap();
                                setCryptoNetwork(net);
                              }}
                              className={`py-2 px-1 rounded-xl text-center font-black text-xs border-2 transition-all cursor-pointer ${
                                isNetSelected
                                  ? 'bg-[#A855F7] border-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] scale-[1.02]'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="block leading-none">{net}</span>
                              <span className="text-[9px] font-bold opacity-80 mt-0.5 block">
                                {net === 'BEP-20' ? 'BNB Chain' : net === 'TRC-20' ? 'Tron' : 'MATIC'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Payout Details */}
                  <div className="bg-white border-3 border-slate-900 rounded-2xl p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] space-y-2 text-xs font-bold text-slate-800">
                    <div className="flex items-center justify-between border-b-2 border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-black text-[11px] uppercase">Payout:</span>
                      <span className="font-black text-slate-950 bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded-lg border border-slate-900 text-[11px]">
                        {selectedOption.brand === 'usdt' ? `USDT (${cryptoNetwork})` : selectedOption.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b-2 border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-black text-[11px] uppercase">Payments:</span>
                      <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-slate-900 text-[11px]">
                        Every Friday
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-black text-[11px] uppercase">Cut-off:</span>
                      <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-slate-900 text-[11px]">
                        Thursday 23:59
                      </span>
                    </div>
                  </div>

                  {/* Warning Note */}
                  <div className="bg-amber-100 border-2 border-slate-900 rounded-xl p-2.5 flex items-start gap-2 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                    <span className="text-sm shrink-0">⚠️</span>
                    <p className="text-[11px] font-black text-slate-950 leading-snug">
                      {selectedOption.brand === 'usdt'
                        ? `Make sure your USDT (${cryptoNetwork}) wallet address is correct. Transfers cannot be reversed.`
                        : `Make sure your ${selectedOption.name} recipient information is correct.`}
                    </p>
                  </div>

                  {/* Destination input form */}
                  <form onSubmit={handleSubmitRedemption} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                        {selectedOption.brand === 'usdt'
                          ? `USDT Wallet Address (${cryptoNetwork})`
                          : selectedOption.brand === 'paypal'
                            ? 'PayPal Email Address'
                            : `${selectedOption.name} Recipient Info`}
                      </label>
                      <input
                        type={selectedOption.brand === 'paypal' ? 'email' : 'text'}
                        required
                        value={payoutDestination}
                        onChange={(e) => setPayoutDestination(e.target.value)}
                        placeholder={
                          selectedOption.brand === 'usdt'
                            ? cryptoNetwork === 'TRC-20'
                              ? 'e.g. T... (Tron TRC-20 Address)'
                              : 'e.g. 0x... (EVM / BEP-20 / Polygon Address)'
                            : selectedOption.brand === 'paypal'
                              ? 'your-paypal@email.com'
                              : 'Enter destination...'
                        }
                        className="w-full bg-white border-3 border-slate-900 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#FF3B77] transition-all shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !payoutDestination.trim() || stats.coins < (selectedOption?.rates[selectedRateIndex]?.coins ?? minCoins)}
                      className="w-full bg-[#FF3B77] border-4 border-slate-900 text-white font-black text-sm py-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-[#E33D6F] transition-all active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
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
                    We registered your withdrawal of <strong className="text-slate-900 font-black">{payoutTxDetails?.value} USDT</strong> to {payoutTxDetails?.destination}. Our administrators are reviewing completed slaps for verification.
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
