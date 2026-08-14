// Client and Server safe utility functions for Leaderboard

export interface WeeklyCompetitionStatus {
  weekId: string; // Internal Firestore week key (e.g. "2026-08-08"), NOT displayed to users
  cycleStartIso: string;
  cycleEndIso: string;
  isEnded: boolean; // true if Thursday 23:59:59 has passed
  isFridayPayout: boolean; // true on Friday
  timeRemainingMs: number;
  formattedCountdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
}

/**
 * Returns Saturday-through-Thursday weekly competition info and live countdown.
 * Sat 00:00:00 UTC -> Thu 23:59:59 UTC
 */
export function getWeeklyCompetitionStatus(nowInput?: Date | string | number): WeeklyCompetitionStatus {
  const now = nowInput ? new Date(nowInput) : new Date();
  const validNow = isNaN(now.getTime()) ? new Date() : now;

  const nowMs = validNow.getTime();
  const utcDay = validNow.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  let cycleStart: Date;
  let cycleEnd: Date;
  let isFridayPayout = false;

  if (utcDay === 5) {
    // Today is Friday (payout / transition day)
    isFridayPayout = true;
    
    // Cycle started last Saturday (6 days ago) at 00:00:00 UTC
    cycleStart = new Date(Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate() - 6,
      0, 0, 0, 0
    ));

    // Cycle ended yesterday (Thursday) at 23:59:59.999 UTC
    cycleEnd = new Date(Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate() - 1,
      23, 59, 59, 999
    ));
  } else if (utcDay === 6) {
    // Today is Saturday (start of new competition cycle)
    cycleStart = new Date(Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate(),
      0, 0, 0, 0
    ));

    // Cycle ends next Thursday (in 5 days) at 23:59:59.999 UTC
    cycleEnd = new Date(Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate() + 5,
      23, 59, 59, 999
    ));
  } else {
    // Today is Sun (0), Mon (1), Tue (2), Wed (3), or Thu (4)
    const daysSinceSat = (utcDay + 1) % 7; // Sun=1, Mon=2, Tue=3, Wed=4, Thu=5
    cycleStart = new Date(Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate() - daysSinceSat,
      0, 0, 0, 0
    ));

    const daysUntilThu = 4 - utcDay; // Sun=4, Mon=3, Tue=2, Wed=1, Thu=0
    cycleEnd = new Date(Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate() + daysUntilThu,
      23, 59, 59, 999
    ));
  }

  const isEnded = nowMs >= cycleEnd.getTime();
  const timeRemainingMs = isEnded ? 0 : Math.max(0, cycleEnd.getTime() - nowMs);

  const totalSeconds = Math.floor(timeRemainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format internal week ID (e.g. "2026-08-08")
  const yearStr = cycleStart.getUTCFullYear();
  const monthStr = String(cycleStart.getUTCMonth() + 1).padStart(2, '0');
  const dateStr = String(cycleStart.getUTCDate()).padStart(2, '0');
  const weekId = `${yearStr}-${monthStr}-${dateStr}`;

  return {
    weekId,
    cycleStartIso: cycleStart.toISOString(),
    cycleEndIso: cycleEnd.toISOString(),
    isEnded,
    isFridayPayout,
    timeRemainingMs,
    formattedCountdown: {
      days,
      hours,
      minutes,
      seconds
    }
  };
}

/**
 * Returns internal current month ID (e.g. "2026-08") for Monthly Referrals
 */
export function getCurrentMonthIdentifier(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  const year = valid.getUTCFullYear();
  const month = String(valid.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getISOWeekIdentifier(dateInput?: Date | string | number): string {
  return getWeeklyCompetitionStatus(dateInput).weekId;
}

export const WEEKLY_PRIZES = {
  1: 2000, // 1st place -> 2,000 SP
  2: 1500, // 2nd place -> 1,500 SP
  3: 1000, // 3rd place -> 1,000 SP
} as const;

export const MONTHLY_REFERRAL_PRIZE = 2000; // #1 Top Referrer -> 2,000 SP

export const TOTAL_WEEKLY_PRIZE_POOL = 4500; // Total 4,500 SP
