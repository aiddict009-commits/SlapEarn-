/**
 * Calculate SP to credit the user from an external network payout.
 * Must be called only in trusted backend / postback handlers.
 * @param {number} networkPayoutUSD - Actual net amount the network paid you (in USD)
 * @returns {number} SP amount to credit (capped at 3000)
 */
export function calculateExternalUserSP(networkPayoutUSD: number): number {
  if (typeof networkPayoutUSD !== "number" || networkPayoutUSD <= 0) {
    return 0;
  }

  // 1. User gets 40% of the actual network payout
  const userShareUSD = networkPayoutUSD * 0.40;

  // 2. Convert to SP (10,000 SP = $1)
  let userSP = Math.floor(userShareUSD * 10000);

  // 3. Hard maximum of 3,000 SP per reward event
  if (userSP > 3000) {
    userSP = 3000;
  }

  return userSP;
}
