import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  runTransaction, 
  increment 
} from 'firebase/firestore';
import { db } from './firebase.js';
import { getISOWeekIdentifier, getCurrentMonthIdentifier, WEEKLY_PRIZES, TOTAL_WEEKLY_PRIZE_POOL } from './leaderboardUtils.js';
import { getAdminDbInstance, AdminFieldValue } from './serverFirebaseAdmin.js';

export { getISOWeekIdentifier, getCurrentMonthIdentifier, WEEKLY_PRIZES, TOTAL_WEEKLY_PRIZE_POOL };

export interface LeaderboardWinnerInput {
  rank: 1 | 2 | 3;
  userId: string;
  username: string;
  spEarned?: number;
}

export interface FinalizeLeaderboardResult {
  success: boolean;
  message: string;
  weekId: string;
  alreadyPaid?: boolean;
  winnersPaid?: Array<{ rank: number; userId: string; username: string; prizeSP: number }>;
  error?: string;
}

/**
 * Finalize weekly leaderboard prizes using Admin SDK with atomic transaction and idempotency guarantee
 */
async function finalizeWeeklyWithAdminSDK(
  weekId: string,
  validWinners: LeaderboardWinnerInput[],
  timestampIso: string
): Promise<FinalizeLeaderboardResult> {
  const adminDb = getAdminDbInstance();
  if (!adminDb) {
    throw new Error('Admin Firestore database instance is unavailable.');
  }

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const weekSummaryRef = adminDb.collection('weekly_leaderboard_payouts').doc(weekId);
      const summaryDoc = await transaction.get(weekSummaryRef);

      // Check if period was already finalized (idempotency check)
      if (summaryDoc.exists && (summaryDoc.data()?.finalized === true || summaryDoc.data()?.status === 'completed')) {
        return { alreadyPaid: true, paidList: [] };
      }

      // Check deduplication documents
      const dedupRefs = validWinners.map(w => adminDb.collection('leaderboard_prize_dedup').doc(`${weekId}_rank${w.rank}`));
      const dedupDocs = await Promise.all(dedupRefs.map(ref => transaction.get(ref)));
      if (dedupDocs.some(d => d.exists)) {
        return { alreadyPaid: true, paidList: [] };
      }

      const userRefs = validWinners.map(w => adminDb.collection('users').doc(w.userId));
      const userDocs = await Promise.all(userRefs.map(ref => transaction.get(ref)));

      const paidList: Array<{ rank: number; userId: string; username: string; prizeSP: number }> = [];

      validWinners.forEach((winner, i) => {
        const userDoc = userDocs[i];
        if (!userDoc.exists) return;

        const prizeSP = WEEKLY_PRIZES[winner.rank];
        const userRef = userRefs[i];
        const dedupRef = dedupRefs[i];

        // 1. Write deduplication flag
        transaction.set(dedupRef, {
          weekId,
          rank: winner.rank,
          userId: winner.userId,
          username: winner.username,
          prizeSP,
          finalized: true,
          timestamp: timestampIso,
        });

        // 2. Increment user coins and totalEarned atomically
        transaction.update(userRef, {
          coins: AdminFieldValue.increment(prizeSP),
          totalEarned: AdminFieldValue.increment(prizeSP),
          updatedAt: timestampIso,
        });

        // 3. Record subcollection transaction
        const userTxRef = userRef.collection('transactions').doc(`tx_leaderboard_${weekId}_r${winner.rank}`);
        transaction.set(userTxRef, {
          id: `tx_leaderboard_${weekId}_r${winner.rank}`,
          userId: winner.userId,
          type: 'earn',
          amount: prizeSP,
          title: `Weekly Leaderboard #${winner.rank} Prize`,
          category: 'Weekly Leaderboard Reward',
          network: 'Weekly Leaderboard',
          timestamp: timestampIso,
          status: 'completed',
          weekId,
          rank: winner.rank,
        });

        paidList.push({
          rank: winner.rank,
          userId: winner.userId,
          username: winner.username,
          prizeSP,
        });
      });

      // 4. Save finalized summary record
      transaction.set(weekSummaryRef, {
        weekId,
        finalized: true,
        finalizedAt: timestampIso,
        totalPrizeSP: TOTAL_WEEKLY_PRIZE_POOL,
        winners: paidList,
        status: 'completed',
      });

      return { alreadyPaid: false, paidList };
    });

    if (result.alreadyPaid) {
      return {
        success: false,
        message: `Weekly leaderboard prizes for week "${weekId}" have already been paid. Duplicate payout prevented safely.`,
        weekId,
        alreadyPaid: true,
        error: 'DUPLICATE_PAYOUT_PREVENTED',
      };
    }

    return {
      success: true,
      message: `Successfully finalized and distributed ${TOTAL_WEEKLY_PRIZE_POOL} SP in weekly leaderboard rewards for week ${weekId}!`,
      weekId,
      alreadyPaid: false,
      winnersPaid: result.paidList,
    };
  } catch (err: any) {
    console.error(`[WeeklyLeaderboard] Admin SDK error finalizing prizes for ${weekId}:`, err);
    return {
      success: false,
      message: 'Failed to safely finalize weekly leaderboard prizes due to transaction error.',
      weekId,
      error: err.message || 'TRANSACTION_FAILED',
    };
  }
}

/**
 * Finalizes weekly leaderboard prizes safely & atomically.
 * Prevents duplicate payouts for the same weekId.
 */
export async function finalizeWeeklyLeaderboardPrizes(
  targetWeekId: string,
  winners: LeaderboardWinnerInput[]
): Promise<FinalizeLeaderboardResult> {
  const weekId = targetWeekId || getISOWeekIdentifier();

  if (!Array.isArray(winners) || winners.length === 0) {
    return {
      success: false,
      message: 'No winners provided for weekly prize distribution.',
      weekId,
      error: 'NO_WINNERS_PROVIDED',
    };
  }

  const validWinners = winners.filter(w => (w.rank === 1 || w.rank === 2 || w.rank === 3) && w.userId);

  if (validWinners.length === 0) {
    return {
      success: false,
      message: 'Invalid winner rank or user ID provided.',
      weekId,
      error: 'INVALID_WINNERS',
    };
  }

  const timestampIso = new Date().toISOString();

  // Try Admin SDK first (Server-side)
  try {
    return await finalizeWeeklyWithAdminSDK(weekId, validWinners, timestampIso);
  } catch (adminErr) {
    console.warn('[WeeklyLeaderboard] Admin SDK execution notice, falling back to Web SDK:', adminErr);
  }

  // Fallback to Web SDK transaction
  try {
    const result = await runTransaction(db, async (transaction) => {
      const weekSummaryRef = doc(db, 'weekly_leaderboard_payouts', weekId);
      const summaryDoc = await transaction.get(weekSummaryRef);

      if (summaryDoc.exists() && summaryDoc.data()?.finalized === true) {
        return { alreadyPaid: true, paidList: [] };
      }

      const dedupRefs = validWinners.map(w => doc(db, 'leaderboard_prize_dedup', `${weekId}_rank${w.rank}`));
      const dedupDocs = await Promise.all(dedupRefs.map(ref => transaction.get(ref)));
      if (dedupDocs.some(d => d.exists())) {
        return { alreadyPaid: true, paidList: [] };
      }

      const userRefs = validWinners.map(w => doc(db, 'users', w.userId));
      const userDocs = await Promise.all(userRefs.map(ref => transaction.get(ref)));

      const paidList: Array<{ rank: number; userId: string; username: string; prizeSP: number }> = [];

      validWinners.forEach((winner, i) => {
        const userDoc = userDocs[i];
        if (!userDoc.exists()) return;

        const prizeSP = WEEKLY_PRIZES[winner.rank];
        const userRef = userRefs[i];
        const dedupRef = dedupRefs[i];

        transaction.set(dedupRef, {
          weekId,
          rank: winner.rank,
          userId: winner.userId,
          username: winner.username,
          prizeSP,
          finalized: true,
          timestamp: timestampIso,
        });

        transaction.update(userRef, {
          coins: increment(prizeSP),
          totalEarned: increment(prizeSP),
          updatedAt: timestampIso,
        });

        const userTxRef = doc(db, 'users', winner.userId, 'transactions', `tx_leaderboard_${weekId}_r${winner.rank}`);
        transaction.set(userTxRef, {
          id: `tx_leaderboard_${weekId}_r${winner.rank}`,
          userId: winner.userId,
          type: 'earn',
          amount: prizeSP,
          title: `Weekly Leaderboard #${winner.rank} Prize`,
          category: 'Weekly Leaderboard Reward',
          network: 'Weekly Leaderboard',
          timestamp: timestampIso,
          status: 'completed',
          weekId,
          rank: winner.rank,
        });

        paidList.push({
          rank: winner.rank,
          userId: winner.userId,
          username: winner.username,
          prizeSP,
        });
      });

      transaction.set(weekSummaryRef, {
        weekId,
        finalized: true,
        finalizedAt: timestampIso,
        totalPrizeSP: TOTAL_WEEKLY_PRIZE_POOL,
        winners: paidList,
        status: 'completed',
      });

      return { alreadyPaid: false, paidList };
    });

    if (result.alreadyPaid) {
      return {
        success: false,
        message: `Weekly leaderboard prizes for week "${weekId}" have already been paid. Duplicate payout prevented safely.`,
        weekId,
        alreadyPaid: true,
        error: 'DUPLICATE_PAYOUT_PREVENTED',
      };
    }

    return {
      success: true,
      message: `Successfully finalized and distributed ${TOTAL_WEEKLY_PRIZE_POOL} SP in weekly leaderboard rewards for week ${weekId}!`,
      weekId,
      alreadyPaid: false,
      winnersPaid: result.paidList,
    };
  } catch (err: any) {
    console.error(`[WeeklyLeaderboard] Error finalizing prizes for ${weekId}:`, err);
    return {
      success: false,
      message: 'Failed to safely finalize weekly leaderboard prizes due to transaction error.',
      weekId,
      error: err.message || 'TRANSACTION_FAILED',
    };
  }
}

/**
 * Fetch finalized weekly leaderboard payouts history from Firestore.
 */
export async function fetchWeeklyLeaderboardHistory(): Promise<any[]> {
  try {
    const adminDb = getAdminDbInstance();
    if (adminDb) {
      const snap = await adminDb.collection('weekly_leaderboard_payouts').orderBy('finalizedAt', 'desc').limit(20).get();
      return snap.docs.map(docSnap => docSnap.data());
    }
  } catch {}

  try {
    const q = query(collection(db, 'weekly_leaderboard_payouts'), orderBy('finalizedAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => docSnap.data());
  } catch (err) {
    console.warn('Error fetching weekly leaderboard history:', err);
    return [];
  }
}

/**
 * Finalizes monthly referral reward for #1 qualified referrer (2,000 SP) with duplicate-payout protection.
 */
export async function finalizeMonthlyReferralPrize(
  targetMonthId: string,
  winner: { userId: string; username: string; qualifiedReferrals: number }
): Promise<{ success: boolean; message: string; monthId: string; alreadyPaid?: boolean; error?: string }> {
  const monthId = targetMonthId || new Date().toISOString().substring(0, 7);

  if (!winner || !winner.userId) {
    return {
      success: false,
      message: 'No top referrer provided for monthly referral prize.',
      monthId,
      error: 'NO_WINNER_PROVIDED',
    };
  }

  const timestampIso = new Date().toISOString();
  const prizeSP = 2000;

  // Try Admin SDK first (Server-side)
  try {
    const adminDb = getAdminDbInstance();
    if (adminDb) {
      const result = await adminDb.runTransaction(async (transaction) => {
        const summaryRef = adminDb.collection('monthly_referral_payouts').doc(monthId);
        const summaryDoc = await transaction.get(summaryRef);

        if (summaryDoc.exists && (summaryDoc.data()?.finalized === true || summaryDoc.data()?.status === 'completed')) {
          return { alreadyPaid: true };
        }

        const dedupRef = adminDb.collection('monthly_referral_prize_dedup').doc(`${monthId}_rank1`);
        const dedupDoc = await transaction.get(dedupRef);
        if (dedupDoc.exists) {
          return { alreadyPaid: true };
        }

        const userRef = adminDb.collection('users').doc(winner.userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error(`User ${winner.userId} not found in database.`);
        }

        transaction.set(dedupRef, {
          monthId,
          rank: 1,
          userId: winner.userId,
          username: winner.username,
          qualifiedReferrals: winner.qualifiedReferrals || 0,
          prizeSP,
          finalized: true,
          timestamp: timestampIso,
        });

        transaction.update(userRef, {
          coins: AdminFieldValue.increment(prizeSP),
          totalEarned: AdminFieldValue.increment(prizeSP),
          updatedAt: timestampIso,
        });

        const userTxRef = userRef.collection('transactions').doc(`tx_monthly_ref_${monthId}_r1`);
        transaction.set(userTxRef, {
          id: `tx_monthly_ref_${monthId}_r1`,
          userId: winner.userId,
          type: 'earn',
          amount: prizeSP,
          title: 'Monthly Top Referrer Reward',
          category: 'Weekly Leaderboard Reward',
          network: 'Monthly Referral Leaderboard',
          timestamp: timestampIso,
          status: 'completed',
          monthId,
          rank: 1,
        });

        transaction.set(summaryRef, {
          monthId,
          finalized: true,
          finalizedAt: timestampIso,
          winner: {
            userId: winner.userId,
            username: winner.username,
            qualifiedReferrals: winner.qualifiedReferrals || 0,
            prizeSP,
          },
          status: 'completed',
        });

        return { alreadyPaid: false };
      });

      if (result.alreadyPaid) {
        return {
          success: false,
          message: `Monthly referral prize for month "${monthId}" has already been awarded. Duplicate payout prevented.`,
          monthId,
          alreadyPaid: true,
        };
      }

      return {
        success: true,
        message: `Successfully awarded ${prizeSP} SP to top referrer @${winner.username} for ${monthId}!`,
        monthId,
      };
    }
  } catch (adminErr: any) {
    console.warn('[MonthlyReferral] Admin SDK execution notice, falling back to Web SDK:', adminErr);
  }

  // Fallback to Web SDK transaction
  try {
    const result = await runTransaction(db, async (transaction) => {
      const summaryRef = doc(db, 'monthly_referral_payouts', monthId);
      const summaryDoc = await transaction.get(summaryRef);

      if (summaryDoc.exists() && summaryDoc.data()?.finalized === true) {
        return { alreadyPaid: true };
      }

      const dedupRef = doc(db, 'monthly_referral_prize_dedup', `${monthId}_rank1`);
      const dedupDoc = await transaction.get(dedupRef);
      if (dedupDoc.exists()) {
        return { alreadyPaid: true };
      }

      const userRef = doc(db, 'users', winner.userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error(`User ${winner.userId} not found in database.`);
      }

      transaction.set(dedupRef, {
        monthId,
        rank: 1,
        userId: winner.userId,
        username: winner.username,
        qualifiedReferrals: winner.qualifiedReferrals || 0,
        prizeSP,
        finalized: true,
        timestamp: timestampIso,
      });

      transaction.update(userRef, {
        coins: increment(prizeSP),
        totalEarned: increment(prizeSP),
        updatedAt: timestampIso,
      });

      const userTxRef = doc(db, 'users', winner.userId, 'transactions', `tx_monthly_ref_${monthId}_r1`);
      transaction.set(userTxRef, {
        id: `tx_monthly_ref_${monthId}_r1`,
        userId: winner.userId,
        type: 'earn',
        amount: prizeSP,
        title: 'Monthly Top Referrer Reward',
        category: 'Weekly Leaderboard Reward',
        network: 'Monthly Referral Leaderboard',
        timestamp: timestampIso,
        status: 'completed',
        monthId,
        rank: 1,
      });

      transaction.set(summaryRef, {
        monthId,
        finalized: true,
        finalizedAt: timestampIso,
        winner: {
          userId: winner.userId,
          username: winner.username,
          qualifiedReferrals: winner.qualifiedReferrals || 0,
          prizeSP,
        },
        status: 'completed',
      });

      return { alreadyPaid: false };
    });

    if (result.alreadyPaid) {
      return {
        success: false,
        message: `Monthly referral prize for month "${monthId}" has already been awarded. Duplicate payout prevented.`,
        monthId,
        alreadyPaid: true,
      };
    }

    return {
      success: true,
      message: `Successfully awarded ${prizeSP} SP to top referrer @${winner.username} for ${monthId}!`,
      monthId,
    };
  } catch (err: any) {
    console.error(`[MonthlyReferral] Error finalizing prize for ${monthId}:`, err);
    return {
      success: false,
      message: err.message || 'Failed to finalize monthly referral prize.',
      monthId,
      error: 'TRANSACTION_FAILED',
    };
  }
}

/**
 * Fetch finalized monthly referral payouts history from Firestore.
 */
export async function fetchMonthlyReferralHistory(): Promise<any[]> {
  try {
    const adminDb = getAdminDbInstance();
    if (adminDb) {
      const snap = await adminDb.collection('monthly_referral_payouts').orderBy('finalizedAt', 'desc').limit(20).get();
      return snap.docs.map(docSnap => docSnap.data());
    }
  } catch {}

  try {
    const q = query(collection(db, 'monthly_referral_payouts'), orderBy('finalizedAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => docSnap.data());
  } catch (err) {
    console.warn('Error fetching monthly referral history:', err);
    return [];
  }
}

/**
 * Automatically evaluates and awards winners for active/completed weekly and monthly cycles.
 * Safe & idempotent: database transaction checks deduplication records so no double-payouts ever occur.
 */
export async function autoFinalizeCompletedLeaderboards(): Promise<{ weeklyProcessed: boolean; monthlyProcessed: boolean }> {
  let weeklyProcessed = false;
  let monthlyProcessed = false;

  try {
    const adminDb = getAdminDbInstance();
    if (!adminDb) return { weeklyProcessed, monthlyProcessed };

    const usersSnap = await adminDb.collection('users').limit(100).get();
    const allUsers = usersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];
    const activeUsers = allUsers.filter(u => u.status === 'Active' || !u.status);

    // 1. Weekly Leaderboard Auto-Payout
    const weekId = getISOWeekIdentifier();
    const weekDoc = await adminDb.collection('weekly_leaderboard_payouts').doc(weekId).get();

    if (!weekDoc.exists && activeUsers.length > 0) {
      const sortedWeekly = [...activeUsers].sort((a, b) => (b.coins || b.spBalance || b.weeklySP || 0) - (a.coins || a.spBalance || a.weeklySP || 0));
      const top3 = [
        sortedWeekly[0] ? { rank: 1 as const, userId: sortedWeekly[0].id, username: sortedWeekly[0].username || sortedWeekly[0].id, spEarned: sortedWeekly[0].coins || sortedWeekly[0].spBalance || sortedWeekly[0].weeklySP || 0 } : null,
        sortedWeekly[1] ? { rank: 2 as const, userId: sortedWeekly[1].id, username: sortedWeekly[1].username || sortedWeekly[1].id, spEarned: sortedWeekly[1].coins || sortedWeekly[1].spBalance || sortedWeekly[1].weeklySP || 0 } : null,
        sortedWeekly[2] ? { rank: 3 as const, userId: sortedWeekly[2].id, username: sortedWeekly[2].username || sortedWeekly[2].id, spEarned: sortedWeekly[2].coins || sortedWeekly[2].spBalance || sortedWeekly[2].weeklySP || 0 } : null,
      ].filter(Boolean) as LeaderboardWinnerInput[];

      if (top3.length > 0) {
        const res = await finalizeWeeklyLeaderboardPrizes(weekId, top3);
        if (res.success) weeklyProcessed = true;
      }
    }

    // 2. Monthly Referral Auto-Payout
    const monthId = getCurrentMonthIdentifier();
    const monthDoc = await adminDb.collection('monthly_referral_payouts').doc(monthId).get();

    if (!monthDoc.exists && activeUsers.length > 0) {
      const sortedReferrers = [...activeUsers].sort((a, b) => (b.qualifiedReferralsCount || b.referrals || 0) - (a.qualifiedReferralsCount || a.referrals || 0));
      const topReferrer = sortedReferrers[0];

      if (topReferrer) {
        const res = await finalizeMonthlyReferralPrize(monthId, {
          userId: topReferrer.id,
          username: topReferrer.username || topReferrer.id,
          qualifiedReferrals: topReferrer.qualifiedReferralsCount || topReferrer.referrals || 0,
        });
        if (res.success) monthlyProcessed = true;
      }
    }
  } catch (err) {
    console.warn('[Auto-Leaderboard] Auto-finalization check notice:', err);
  }

  return { weeklyProcessed, monthlyProcessed };
}
