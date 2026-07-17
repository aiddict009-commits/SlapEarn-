import { useState } from 'react';
import { History as HistoryIcon, ArrowUpRight, ArrowDownLeft, Sparkles, Filter, CheckCircle2, Clock } from 'lucide-react';
import { Transaction } from '../types';

interface HistoryProps {
  transactions: Transaction[];
}

export default function History({ transactions }: HistoryProps) {
  const [filter, setFilter] = useState<'all' | 'earn' | 'redeem'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-fade-in" id="history-tab">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-850">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-display font-semibold tracking-wide text-sm uppercase">
            <HistoryIcon className="w-5 h-5 text-indigo-400" />
            <span>Financial Ledger</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white mt-1">Transaction History</h2>
          <p className="text-slate-400 text-sm mt-1">
            Browse complete itemized transactions of your earnings, multipliers, level bonuses, and payouts.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850 w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            id="filter-all-btn"
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${
              filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setFilter('earn')}
            id="filter-earnings-btn"
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${
              filter === 'earn' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            Earnings
          </button>
          <button
            onClick={() => setFilter('redeem')}
            id="filter-withdrawals-btn"
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${
              filter === 'redeem' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            Redemptions
          </button>
        </div>
      </div>

      {/* Ledger list */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/30 rounded-2xl border border-dashed border-slate-850">
            <Filter className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <h3 className="text-white font-display font-semibold text-sm">No Transactions Found</h3>
            <p className="text-slate-500 text-xs mt-1">There are no logs matching your currently selected filter.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isEarn = tx.type === 'earn' || tx.type === 'bonus';
            
            return (
              <div
                key={tx.id}
                id={`ledger-tx-${tx.id}`}
                className="bg-slate-950 p-4 rounded-xl border border-slate-855 hover:border-slate-800 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  {/* Ledger Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs ${
                    isEarn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {isEarn ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-sm text-white leading-snug">
                      {tx.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono font-bold bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-850">
                        {tx.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        {new Date(tx.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-between gap-2">
                  <div className={`font-display font-black text-sm tracking-wide ${isEarn ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isEarn ? '+' : '-'}{tx.amount.toLocaleString()} 🪙
                  </div>

                  {/* Status chip */}
                  <div className="flex items-center gap-1 text-[10px]">
                    {tx.status === 'completed' ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2px]" />
                        <span>Credited</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Audit</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
