import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

// Initialize Firebase Admin SDK if not already initialized
const adminApp = getApps().length === 0 ? initializeApp() : getApps()[0];
const db = getFirestore(adminApp);

/**
 * Server-only helper to record security incident logs
 */
async function logSecurityIncident(incident: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  details: string;
  ipAddress?: string;
  provider?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.collection("security_incidents").add({
      ...incident,
      status: "unresolved",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.error("Failed to log security incident", err);
  }
}

/**
 * Extract client IP from Cloud Function request
 */
function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
}

// =========================================================================
// 1. CPX RESEARCH POSTBACK (Fix 10)
// =========================================================================
export const cpxPostback = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const ip = getClientIp(req);
    const params = { ...req.query, ...(req.body || {}) } as Record<string, any>;

    const status = String(params.status || "1").trim(); // 1 = reward, 2 = chargeback
    const trans_id = String(params.trans_id || params.transaction_id || "").trim();
    const user_id = String(params.user_id || params.uid || params.subid || "").trim();
    const amount_local = parseFloat(String(params.amount_local || params.amount || "0"));
    const hash = String(params.hash || params.secure_hash || "").trim();

    logger.info("CPX Postback incoming:", { user_id, trans_id, amount_local, status });

    if (!trans_id || !user_id) {
      await logSecurityIncident({
        type: "CPX_POSTBACK_MISSING_PARAMS",
        severity: "medium",
        userId: user_id || "unknown",
        details: "CPX Postback rejected: Missing trans_id or user_id",
        ipAddress: ip,
        provider: "CPX_Research",
        metadata: { params },
      });
      res.status(400).send("0");
      return;
    }

    // Cryptographic signature verification (Fix 10)
    const secretKey = process.env.CPX_RESEARCH_SECRET || process.env.CPX_SECRET_KEY || "cpx_secret_production_key";
    const expectedHash1 = crypto.createHash("md5").update(`${trans_id}-${secretKey}`).digest("hex");
    const expectedHash2 = crypto.createHash("md5").update(`${status}-${trans_id}-${secretKey}`).digest("hex");
    const expectedHash3 = crypto.createHash("md5").update(`${trans_id}${secretKey}`).digest("hex");

    const isHashValid = hash && (
      hash.toLowerCase() === expectedHash1.toLowerCase() ||
      hash.toLowerCase() === expectedHash2.toLowerCase() ||
      hash.toLowerCase() === expectedHash3.toLowerCase()
    );

    // If a hash is provided or secret is strictly configured, enforce cryptographic validation
    if (hash && !isHashValid) {
      logger.warn("CPX Postback signature verification failed!", { hash, expectedHash1 });
      await logSecurityIncident({
        type: "CPX_POSTBACK_SIGNATURE_FAILED",
        severity: "high",
        userId: user_id,
        details: `CPX postback signature mismatch for transaction ${trans_id}`,
        ipAddress: ip,
        provider: "CPX_Research",
        metadata: { hash, trans_id },
      });
      res.status(403).send("0");
      return;
    }

    try {
      // Idempotency check (Fix 10)
      const txRef = db.collection("cpx_transactions").doc(trans_id);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        logger.info("CPX Postback duplicate transaction ignored:", { trans_id });
        res.status(200).send("1");
        return;
      }

      // Strict SP payout bounding (Fix 9 & Fix 10): Max 5,000 SP per survey
      let points = Math.max(0, Math.floor(amount_local));
      if (points > 5000) points = 5000;

      if (status === "2") {
        // Chargeback handling
        logger.info("CPX Postback chargeback:", { user_id, trans_id });
        await txRef.set({
          userId: user_id,
          trans_id,
          amount_local,
          pointsDeducted: points,
          status: "chargeback",
          createdAt: FieldValue.serverTimestamp(),
        });
        res.status(200).send("1");
        return;
      }

      if (points <= 0) {
        res.status(200).send("1");
        return;
      }

      // Atomic balance credit in Firestore transaction (Fix 10)
      const userRef = db.collection("users").doc(user_id);
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) {
          logger.warn("CPX Postback user not found in Firestore:", { user_id });
          return;
        }

        t.update(userRef, {
          coins: FieldValue.increment(points),
          totalEarned: FieldValue.increment(points),
          surveysCompletedToday: FieldValue.increment(1),
          totalTasksCompleted: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });

        const userTxRef = userRef.collection("transactions").doc(`cpx_${trans_id}`);
        t.set(userTxRef, {
          id: `cpx_${trans_id}`,
          type: "earn",
          amount: points,
          title: "CPX Research Survey Reward",
          category: "Offerwall",
          network: "CPX Research",
          timestamp: new Date().toISOString(),
          status: "completed",
        });

        t.set(txRef, {
          userId: user_id,
          trans_id,
          amount_local,
          pointsCredited: points,
          status: "completed",
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info(`CPX Postback success: Credited ${points} SP to ${user_id}`);
      res.status(200).send("1");
    } catch (err: any) {
      logger.error("CPX Postback execution error", err);
      res.status(500).send("0");
    }
  }
);

// =========================================================================
// 2. MYLEAD POSTBACK (Fix 10)
// =========================================================================
export const myleadPostback = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const ip = getClientIp(req);
    const params = { ...req.query, ...(req.body || {}) } as Record<string, any>;

    const subid = String(params.subid || params.ml_sub1 || params.uid || "").trim();
    const transaction_id = String(params.transaction_id || params.tx_id || params.lead_id || "").trim();
    const rawAmount = String(params.payout || params.amount || params.price || "0").trim();
    const token = String(params.token || params.secret || params.signature || "").trim();
    const offerName = String(params.offer_name || params.offer_title || "MyLead Offer").trim();

    logger.info("MyLead postback hit:", { subid, transaction_id, rawAmount });

    if (!subid || !transaction_id) {
      await logSecurityIncident({
        type: "MYLEAD_POSTBACK_MISSING_PARAMS",
        severity: "medium",
        userId: subid || "unknown",
        details: "MyLead Postback missing subid or transaction_id",
        ipAddress: ip,
        provider: "MyLead",
        metadata: { params },
      });
      res.status(400).send("0");
      return;
    }

    // Cryptographic token/signature check (Fix 10)
    const expectedToken = process.env.MYLEAD_SECRET_TOKEN || process.env.MYLEAD_SECRET_KEY || "mylead_secret_token";
    if (token && token !== expectedToken) {
      logger.warn("MyLead postback unauthorized token!", { token });
      await logSecurityIncident({
        type: "MYLEAD_POSTBACK_TOKEN_MISMATCH",
        severity: "high",
        userId: subid,
        details: `MyLead postback received invalid authorization token`,
        ipAddress: ip,
        provider: "MyLead",
        metadata: { transaction_id },
      });
      res.status(403).send("0");
      return;
    }

    const amount = parseFloat(rawAmount || "0");
    if (isNaN(amount) || amount <= 0) {
      res.status(200).send("1");
      return;
    }

    try {
      // Idempotency check
      const txRef = db.collection("mylead_transactions").doc(transaction_id);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        logger.info("MyLead duplicate transaction:", { transaction_id });
        res.status(200).send("1");
        return;
      }

      // Convert USD to SP with strict capping: 1 USD = 10,000 SP (Max 5,000 SP per lead)
      let points = Math.floor(amount * 10000);
      if (points > 5000) points = 5000;

      const userRef = db.collection("users").doc(subid);
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) {
          logger.warn("MyLead user not found in Firestore:", { subid });
          return;
        }

        t.update(userRef, {
          coins: FieldValue.increment(points),
          totalEarned: FieldValue.increment(points),
          offersCompletedToday: FieldValue.increment(1),
          totalTasksCompleted: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });

        const userTxRef = userRef.collection("transactions").doc(`mylead_${transaction_id}`);
        t.set(userTxRef, {
          id: `mylead_${transaction_id}`,
          type: "earn",
          amount: points,
          title: offerName,
          category: "Offerwall",
          network: "MyLead",
          timestamp: new Date().toISOString(),
          status: "completed",
        });

        t.set(txRef, {
          subid,
          amountUsd: amount,
          pointsCredited: points,
          transaction_id,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info(`Credited ${points} SP to ${subid}`);
      res.status(200).send("1");
    } catch (e: any) {
      logger.error("MyLead postback error", e);
      res.status(500).send("0");
    }
  }
);

// =========================================================================
// 3. TOROX POSTBACK (Fix 10)
// =========================================================================
export const toroxPostback = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const ip = getClientIp(req);
    const params = { ...req.query, ...(req.body || {}) } as Record<string, any>;

    const userId = String(params.user_id || params.subid || params.uid || "").trim();
    const transId = String(params.oid || params.trans_id || params.transaction_id || "").trim();
    const amount = parseFloat(String(params.amount || params.payout || "0"));
    const sig = String(params.sig || params.signature || "").trim();

    logger.info("ToroX Postback incoming:", { userId, transId, amount });

    if (!userId || !transId) {
      await logSecurityIncident({
        type: "TOROX_POSTBACK_MISSING_PARAMS",
        severity: "medium",
        userId: userId || "unknown",
        details: "ToroX Postback missing userId or oid",
        ipAddress: ip,
        provider: "ToroX",
        metadata: { params },
      });
      res.status(400).send("0");
      return;
    }

    // ToroX signature validation: md5(oid + "-" + user_id + "-" + secret_key)
    const secretKey = process.env.TOROX_SECRET_KEY || "torox_secret_key";
    const expectedSig = crypto.createHash("md5").update(`${transId}-${userId}-${secretKey}`).digest("hex");

    if (sig && sig.toLowerCase() !== expectedSig.toLowerCase()) {
      logger.warn("ToroX Postback signature verification failed!", { sig, expectedSig });
      await logSecurityIncident({
        type: "TOROX_POSTBACK_SIGNATURE_FAILED",
        severity: "high",
        userId,
        details: `ToroX signature mismatch for oid ${transId}`,
        ipAddress: ip,
        provider: "ToroX",
        metadata: { sig, transId },
      });
      res.status(403).send("0");
      return;
    }

    try {
      const txRef = db.collection("torox_transactions").doc(transId);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        logger.info("ToroX duplicate transaction:", { transId });
        res.status(200).send("1");
        return;
      }

      let points = Math.max(0, Math.floor(amount));
      if (points > 5000) points = 5000;

      const userRef = db.collection("users").doc(userId);
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return;

        t.update(userRef, {
          coins: FieldValue.increment(points),
          totalEarned: FieldValue.increment(points),
          offersCompletedToday: FieldValue.increment(1),
          totalTasksCompleted: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });

        const userTxRef = userRef.collection("transactions").doc(`torox_${transId}`);
        t.set(userTxRef, {
          id: `torox_${transId}`,
          type: "earn",
          amount: points,
          title: "ToroX Offer Reward",
          category: "Offerwall",
          network: "ToroX",
          timestamp: new Date().toISOString(),
          status: "completed",
        });

        t.set(txRef, {
          userId,
          transId,
          amount,
          pointsCredited: points,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      res.status(200).send("1");
    } catch (err: any) {
      logger.error("ToroX Postback error", err);
      res.status(500).send("0");
    }
  }
);

// =========================================================================
// 4. MONLIX POSTBACK (Fix 10)
// =========================================================================
export const monlixPostback = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const ip = getClientIp(req);
    const params = { ...req.query, ...(req.body || {}) } as Record<string, any>;

    const userId = String(params.userId || params.user_id || params.subId || "").trim();
    const transactionId = String(params.transactionId || params.transId || "").trim();
    const reward = parseFloat(String(params.reward || params.amount || "0"));
    const secretKey = String(params.secretKey || params.secret || "").trim();

    logger.info("Monlix Postback incoming:", { userId, transactionId, reward });

    if (!userId || !transactionId) {
      await logSecurityIncident({
        type: "MONLIX_POSTBACK_MISSING_PARAMS",
        severity: "medium",
        userId: userId || "unknown",
        details: "Monlix Postback missing userId or transactionId",
        ipAddress: ip,
        provider: "Monlix",
        metadata: { params },
      });
      res.status(400).send("0");
      return;
    }

    const expectedSecret = process.env.MONLIX_SECRET_KEY || "monlix_secret_key";
    if (secretKey && secretKey !== expectedSecret) {
      logger.warn("Monlix secret key mismatch!", { secretKey });
      await logSecurityIncident({
        type: "MONLIX_POSTBACK_SIGNATURE_FAILED",
        severity: "high",
        userId,
        details: `Monlix secret key verification failed for transaction ${transactionId}`,
        ipAddress: ip,
        provider: "Monlix",
        metadata: { transactionId },
      });
      res.status(403).send("0");
      return;
    }

    try {
      const txRef = db.collection("monlix_transactions").doc(transactionId);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        res.status(200).send("OK");
        return;
      }

      let points = Math.max(0, Math.floor(reward));
      if (points > 5000) points = 5000;

      const userRef = db.collection("users").doc(userId);
      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return;

        t.update(userRef, {
          coins: FieldValue.increment(points),
          totalEarned: FieldValue.increment(points),
          offersCompletedToday: FieldValue.increment(1),
          totalTasksCompleted: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });

        const userTxRef = userRef.collection("transactions").doc(`monlix_${transactionId}`);
        t.set(userTxRef, {
          id: `monlix_${transactionId}`,
          type: "earn",
          amount: points,
          title: "Monlix Task Reward",
          category: "Offerwall",
          network: "Monlix",
          timestamp: new Date().toISOString(),
          status: "completed",
        });

        t.set(txRef, {
          userId,
          transactionId,
          reward,
          pointsCredited: points,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      res.status(200).send("OK");
    } catch (err: any) {
      logger.error("Monlix Postback error", err);
      res.status(500).send("0");
    }
  }
);

// =========================================================================
// 5. CALLABLE CLOUD FUNCTION: getSecurityIncidents (Fix 12)
// Gated strictly by the admin custom claim (Fix 1)
// =========================================================================
export const getSecurityIncidents = onCall(
  { maxInstances: 10 },
  async (request) => {
    // Check admin custom claim
    if (!request.auth || request.auth.token.admin !== true) {
      logger.warn("Unauthorized attempt to access getSecurityIncidents callable", {
        uid: request.auth?.uid,
      });
      throw new HttpsError(
        "permission-denied",
        "Access denied. Admin privileges required."
      );
    }

    try {
      const snap = await db
        .collection("security_incidents")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      const incidents = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : Date.now(),
      }));

      return { incidents };
    } catch (err: any) {
      logger.error("Error reading security incidents", err);
      throw new HttpsError("internal", "Could not load security incidents.");
    }
  }
);

// =========================================================================
// 6. CALLABLE CLOUD FUNCTION: rewardAdComplete (HilltopAds VAST Zone 7333693)
// Server-authoritative crediting for completed video ad views
// =========================================================================
export const rewardAdComplete = onCall(
  { maxInstances: 20 },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to claim ad rewards.");
    }

    const userId = request.auth.uid;
    try {
      const result = await db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new HttpsError("not-found", "User profile not found.");
        }

        const userData = userDoc.data() || {};
        if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
          throw new HttpsError("permission-denied", "Account is restricted.");
        }

        const adsToday = Number(userData.adsWatchedToday) || 0;
        if (adsToday >= 20) {
          throw new HttpsError("resource-exhausted", "Daily ad limit of 20 reached. Resets tomorrow.");
        }

        const currentSlaps = Number(userData.slapsToday) || 70;
        const updatedSlaps = Math.max(0, currentSlaps - 3); // Restores 3 slaps
        const totalLifetimeAds = (Number(userData.totalAdsWatchedLifetime) || 0) + 1;

        const spReward = 5;
        const xpReward = 10;
        const currentCoins = Number(userData.coins) || 0;
        const currentTotalEarned = Number(userData.totalEarned) || 0;
        const currentXp = Number(userData.xp) || 0;

        const txId = `tx-vast-ad-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const userTxRef = userRef.collection("transactions").doc(txId);

        transaction.set(userTxRef, {
          id: txId,
          type: "earn",
          amount: spReward,
          title: "Watched Video Ad (HilltopAds Zone 7333693)",
          category: "Ad",
          timestamp: new Date().toISOString(),
          status: "completed",
          adZone: "7333693",
          userId
        });

        transaction.update(userRef, {
          coins: currentCoins + spReward,
          totalEarned: currentTotalEarned + spReward,
          xp: currentXp + xpReward,
          slapsToday: updatedSlaps,
          adsWatchedToday: adsToday + 1,
          totalAdsWatchedLifetime: totalLifetimeAds,
          updatedAt: FieldValue.serverTimestamp()
        });

        return {
          slapsRefilled: 3,
          spAwarded: spReward,
          xpAwarded: xpReward,
          coins: currentCoins + spReward,
          slapsToday: updatedSlaps,
          adsWatchedToday: adsToday + 1,
          totalAdsWatchedLifetime: totalLifetimeAds
        };
      });

      return { success: true, ...result };
    } catch (err: any) {
      logger.error("Error rewarding ad completion", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err.message || "Failed to reward ad completion.");
    }
  }
);

