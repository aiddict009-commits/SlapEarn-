import React, { useState, useEffect } from 'react';
import { Trophy, X, Users, Sparkles, Clock, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getWeeklyCompetitionStatus, WeeklyCompetitionStatus } from '../lib/leaderboardUtils';
import { getServerNow } from '../utils/serverTime';

interface LeaderboardUser {
  id: string;
  username: string;
  coins: number;
  totalEarned: number;
  weeklySP: number;
  weeklyCycleId?: string;
  referrals: number;
  qualifiedReferralsCount: number;
  level?: number;
  country?: string;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentUid?: string;
  currentUserSp?: number;
  currentUserReferrals?: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  currentUid,
  currentUserSp = 0,
  currentUserReferrals = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'referral'>('weekly');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);

  const [compStatus, setCompStatus] = useState<WeeklyCompetitionStatus>(() => getWeeklyCompetitionStatus(getServerNow()));

  // Live timer tick every second aligned to authoritative server time
  useEffect(() => {
    if (!isOpen) return;

    const updateComp = () => setCompStatus(getWeeklyCompetitionStatus(getServerNow()));
    updateComp();
    const timer = setInterval(updateComp, 1000);
    window.addEventListener('focus', updateComp);
    document.addEventListener('visibilitychange', updateComp);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', updateComp);
      document.removeEventListener('visibilitychange', updateComp);
    };
  }, [isOpen]);

  // Subscribe to live Firestore users collection
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setLoadError(false);
    const usersRef = collection(db, 'users');

    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        try {
          const loadedUsers: LeaderboardUser[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Format clean username (prevent showing raw email/UID)
            let rawUsername = data.username || docSnap.id.substring(0, 8);
            if (rawUsername.includes('@')) {
              rawUsername = rawUsername.split('@')[0];
            }

            // Extract legitimate user SP balance directly from Firestore
            const userCoins = typeof data.coins === 'number' ? data.coins : (typeof data.spBalance === 'number' ? data.spBalance : 0);
            
            // Calculate qualified referrals directly from Firestore data
            let qualCount = typeof data.qualifiedReferralsCount === 'number' ? data.qualifiedReferralsCount : 0;
            if (Array.isArray(data.referralsList)) {
              const countFromList = data.referralsList.filter((r: any) => r && (r.qualified || (r.adsWatched || 0) >= 20)).length;
              qualCount = Math.max(qualCount, countFromList);
            }

            loadedUsers.push({
              id: docSnap.id,
              username: rawUsername,
              coins: userCoins,
              totalEarned: typeof data.totalEarned === 'number' ? data.totalEarned : userCoins,
              weeklySP: userCoins, // Ranked according to SP balance
              weeklyCycleId: data.weeklyCycleId || compStatus.weekId,
              referrals: typeof data.referrals === 'number' ? data.referrals : 0,
              qualifiedReferralsCount: qualCount,
              level: data.level || 1,
              country: data.country || 'GLOBAL',
            });
          });
          setUsers(loadedUsers);
          setIsLoading(false);
        } catch (err) {
          console.warn('Error parsing Firestore leaderboard snapshot:', err);
          setLoadError(true);
          setIsLoading(false);
        }
      },
      (err) => {
        console.warn('Error listening to leaderboard users in Firestore:', err);
        setLoadError(true);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, compStatus.weekId]);

  if (!isOpen) return null;

  // Clean current username for match
  let cleanCurrentUsername = (currentUsername || '').trim();
  if (cleanCurrentUsername.includes('@')) {
    cleanCurrentUsername = cleanCurrentUsername.split('@')[0];
  }

  // Rank Weekly SP strictly according to SP balance (highest on top, lowest on bottom)
  const sortedWeekly = [...users].sort((a, b) => (b.coins - a.coins) || (b.totalEarned - a.totalEarned));

  // Rank Monthly Referrals by qualified referrals count, then total referrals
  const sortedReferrals = [...users].sort((a, b) => (b.qualifiedReferralsCount - a.qualifiedReferralsCount) || (b.referrals - a.referrals));

  const currentList = activeTab === 'weekly' ? sortedWeekly : sortedReferrals;

  // Find index of current logged in user in current active standings list
  const normCurrent = cleanCurrentUsername.toLowerCase();
  let currentUserIndex = currentList.findIndex(
    (u) =>
      (currentUid && u.id === currentUid) ||
      (normCurrent && u.username.toLowerCase() === normCurrent)
  );

  const isCurrentUserInTop20 = currentUserIndex >= 0 && currentUserIndex < 20;

  // Calculate user's exact rank dynamically
  let currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : 0;
  if (currentUserIndex === -1) {
    if (activeTab === 'weekly') {
      const allSortedWeekly = [...users].sort((a, b) => (b.coins - a.coins) || (b.totalEarned - a.totalEarned));
      const allIdx = allSortedWeekly.findIndex(
        (u) =>
          (currentUid && u.id === currentUid) ||
          (normCurrent && u.username.toLowerCase() === normCurrent)
      );
      currentUserRank = allIdx >= 0 ? allIdx + 1 : users.length + 1;
    } else {
      const allIdx = sortedReferrals.findIndex(
        (u) =>
          (currentUid && u.id === currentUid) ||
          (normCurrent && u.username.toLowerCase() === normCurrent)
      );
      currentUserRank = allIdx >= 0 ? allIdx + 1 : users.length + 1;
    }
  }

  const top20Users = currentList.slice(0, 20);

  const { formattedCountdown, isEnded } = compStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border-4 border-slate-950 rounded-[28px] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b-2 border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 border-2 border-slate-950 flex items-center justify-center text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
              <Trophy className="w-5 h-5 text-slate-950 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider leading-none">
                  LEADERBOARD
                </h2>
                <span className="text-[9px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60 font-semibold tracking-wide">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold mt-1">
                Compete & win SP rewards every week
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 border-2 border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/70 border-b border-slate-800 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'weekly'
                ? 'bg-amber-400 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border-2 border-transparent'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span>Weekly SP</span>
          </button>

          <button
            onClick={() => setActiveTab('referral')}
            className={`py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'referral'
                ? 'bg-[#00D09E] text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border-2 border-transparent'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Referrals</span>
          </button>
        </div>

        {/* Tab Banner / Information */}
        {activeTab === 'weekly' ? (
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Weekly SP Competition</span>
              </span>
              <span className="text-[10px] text-slate-300 font-semibold bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                Sat – Thu Cycle
              </span>
            </div>

            {/* Countdown or Freeze Notice */}
            {isEnded ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 flex items-center gap-2.5 text-amber-300">
                <Clock className="w-4 h-4 shrink-0 animate-pulse text-amber-400" />
                <p className="text-xs font-bold leading-tight">
                  Competition ended — Winners are being finalized for payout.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Ends Thursday 23:59:59 UTC:</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono font-black text-amber-400">
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{formattedCountdown.days}d</span>
                  <span>:</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{String(formattedCountdown.hours).padStart(2, '0')}h</span>
                  <span>:</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{String(formattedCountdown.minutes).padStart(2, '0')}m</span>
                  <span>:</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{String(formattedCountdown.seconds).padStart(2, '0')}s</span>
                </div>
              </div>
            )}

            {/* Weekly Prizes Stacked Cards */}
            <div className="grid grid-cols-3 gap-2 pt-0.5 text-center font-mono">
              <div className="bg-slate-900 border border-amber-400/30 rounded-xl py-1.5 px-2">
                <span className="text-amber-300 font-black text-xs block whitespace-nowrap">🥇 2,000 SP</span>
                <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wider mt-0.5">1st Place</span>
              </div>
              <div className="bg-slate-900 border border-slate-700/60 rounded-xl py-1.5 px-2">
                <span className="text-slate-200 font-black text-xs block whitespace-nowrap">🥈 1,500 SP</span>
                <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wider mt-0.5">2nd Place</span>
              </div>
              <div className="bg-slate-900 border border-amber-800/40 rounded-xl py-1.5 px-2">
                <span className="text-amber-600 font-black text-xs block whitespace-nowrap">🥉 1,000 SP</span>
                <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wider mt-0.5">3rd Place</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#00D09E]" />
                <span>Monthly Referral Leaderboard</span>
              </span>
              <span className="text-[10px] text-emerald-300 font-bold bg-[#00D09E]/10 border border-[#00D09E]/30 px-2 py-0.5 rounded-full">
                #1 Reward
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-[#00D09E]" />
                <span>Qualified Referrals Only (20+ ads)</span>
              </div>
              <span className="text-[#00D09E] font-mono font-black">#1 = 2,000 SP</span>
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              A referral becomes qualified when the referred user completes 20 ads. At month end, the #1 Top Referrer wins 2,000 SP.
            </p>
          </div>
        )}

        {/* Content List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 scrollbar-thin">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Loading live standings from Firebase...
              </p>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center space-y-2 text-amber-300">
              <AlertCircle className="w-8 h-8 mx-auto opacity-80" />
              <p className="text-xs font-bold">Leaderboard currently updating.</p>
              <p className="text-[11px] text-slate-400">Your personal SP balance and app features remain unaffected.</p>
            </div>
          ) : top20Users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-1">
              <p>No active users in rankings yet for this period.</p>
              {activeTab === 'weekly' && (
                <p className="text-[11px] text-amber-300 font-normal">Start slapping and watching ads to earn weekly SP and enter the top ranks!</p>
              )}
            </div>
          ) : (
            <>
              {top20Users.map((user, idx) => {
                const rank = idx + 1;
                const isMe =
                  (currentUid && user.id === currentUid) ||
                  (normCurrent && user.username.toLowerCase() === normCurrent);

                let rankBadge = (
                  <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center border border-slate-700">
                    {rank}
                  </span>
                );

                let cardStyle = "bg-slate-950/70 border-slate-800 hover:border-slate-700";

                if (rank === 1) {
                  rankBadge = <span className="text-xl">🥇</span>;
                  cardStyle = "bg-gradient-to-r from-amber-500/20 via-slate-950 to-amber-500/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]";
                } else if (rank === 2) {
                  rankBadge = <span className="text-xl">🥈</span>;
                  cardStyle = "bg-gradient-to-r from-slate-400/20 via-slate-950 to-slate-400/10 border-slate-400/40";
                } else if (rank === 3) {
                  rankBadge = <span className="text-xl">🥉</span>;
                  cardStyle = "bg-gradient-to-r from-amber-700/20 via-slate-950 to-amber-700/10 border-amber-700/40";
                }

                if (isMe) {
                  cardStyle += " border-2 !border-[#00D09E] bg-[#00D09E]/15 shadow-[0_0_15px_rgba(0,208,158,0.15)]";
                }

                return (
                  <div
                    key={user.id || user.username + idx}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${cardStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      {rankBadge}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-white">
                            {rank}. {user.username}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-[#00D09E] text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                          <span>Level {user.level || 1}</span>
                          <span>•</span>
                          <span className="text-slate-500">{user.country || 'GLOBAL'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {activeTab === 'weekly' ? (
                        <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                          {user.weeklySP.toLocaleString()} SP
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-xs sm:text-sm font-black text-[#00D09E] font-mono">
                            {user.qualifiedReferralsCount} Qualified
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            ({user.referrals} total)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Outside Top 20 User Card (e.g. 189. tim 459 sp) */}
              {!isCurrentUserInTop20 && (
                <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-800 space-y-2">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-between px-1">
                    <span>YOUR RANKING</span>
                    <span className="text-amber-400 font-mono font-bold">Outside Top 20</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#00D09E]/15 border-2 border-[#00D09E] flex items-center justify-between shadow-[0_0_15px_rgba(0,208,158,0.15)]">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-black text-[#00D09E] bg-slate-950 px-2 py-1 rounded-xl border border-[#00D09E]/40">
                        #{currentUserRank}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-white">
                            {currentUserRank}. {cleanCurrentUsername || 'You'}
                          </span>
                          <span className="text-[9px] bg-[#00D09E] text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                            YOU
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-bold mt-0.5">
                          {activeTab === 'weekly'
                            ? `Keep earning SP to climb into the top 20!`
                            : `Invite friends & complete 20 ads to rank!`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {activeTab === 'weekly' ? (
                        <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                          {currentUserSp.toLocaleString()} SP
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-xs sm:text-sm font-black text-[#00D09E] font-mono">
                            {currentUserReferrals} Qualified
                          </span>
                          <span className="text-[9px] font-bold text-slate-300 font-mono">
                            ({currentUserReferrals} total)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 text-center shrink-0">
          <p className="text-[10px] text-slate-400 font-medium">
            Rankings update automatically in real time. Weekly prizes are credited directly at cycle end.
          </p>
        </div>

      </div>
    </div>
  );
};
