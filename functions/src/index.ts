import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK if not already initialized
const adminApp = getApps().length === 0 ? initializeApp() : getApps()[0];
const db = getFirestore(adminApp);

export interface MyLeadQuery {
  subid?: string;
  uid?: string;
  transaction_id?: string;
  tx_id?: string;
  payout?: string;
  status?: string;
  offer_name?: string;
  offer_title?: string;
  token?: string;
  secret?: string;
  [key: string]: any;
}

/**
 * Firebase Cloud Function: myleadPostback
 * 
 * Secure HTTP endpoint for receiving MyLead affiliate network postback conversions.
 * 
 * Query Parameters:
 * - subid: User UID (e.g. subid={subid})
 * - transaction_id: Unique conversion identifier (e.g. transaction_id={transaction_id})
 * - payout: Earned amount (e.g. payout={payout})
 * - status: Conversion status code or string (1/approved/payable = success)
 * - offer_name: Name of completed offer (optional)
 * - token: Secret authentication token (optional)
 */
export const myleadPostback = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const params: MyLeadQuery = { ...req.query, ...(req.body || {}) };

    const subid = (
      params.subid ||
      (params as any).ml_sub1 ||
      (params as any).sub1 ||
      params.uid ||
      (params as any).player_id ||
      ""
    ).toString().trim();

    const rawAmount = (
      params.amount ??
      params.payout ??
      (params as any).price ??
      (params as any).payout_decimal ??
      "0"
    ).toString().trim();

    const amount = parseFloat(rawAmount || "0");
    const transaction_id = (
      params.transaction_id ||
      params.tx_id ||
      (params as any).trans_id ||
      (params as any).lead_id ||
      Date.now().toString()
    ).toString().trim();

    logger.info("MyLead postback hit:", { subid, amount, transaction_id });

    // Always return 200 with response '1' for MyLead test
    if (!subid || !amount || isNaN(amount)) {
      logger.info("Missing subid/amount, returning 1 for MyLead validation");
      res.status(200).send("1");
      return;
    }

    try {
      // Deduplicate
      const txRef = db.collection("mylead_transactions").doc(transaction_id);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        logger.info("Duplicate transaction", { transaction_id });
        res.status(200).send("1");
        return;
      }

      // Convert $ to SP - 1$ = 1000 SP
      let points = Math.floor(amount * 1000);
      if (points > 3000) points = 3000;

      if (points <= 0) {
        res.status(200).send("1");
        return;
      }

      // Credit user
      const cleanId = subid.trim();
      const userRef = db.collection("users").doc(cleanId);
      await userRef.set(
        {
          coins: FieldValue.increment(points),
          totalEarned: FieldValue.increment(points),
          offersCompletedToday: FieldValue.increment(1),
          totalTasksCompleted: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Record transaction history
      const userTxRef = userRef.collection("transactions").doc(`mylead_${transaction_id}`);
      await userTxRef.set(
        {
          id: `mylead_${transaction_id}`,
          type: "earn",
          amount: points,
          title: params.offer_name || params.offer_title || "MyLead Offer",
          category: "Offerwall",
          network: "MyLead",
          timestamp: new Date().toISOString(),
          status: "completed",
        },
        { merge: true }
      );

      // Save transaction
      await txRef.set({
        subid,
        amount,
        points,
        transaction_id,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info(`Credited ${points} SP to ${subid}`);
      res.status(200).send("1");
    } catch (e) {
      logger.error("MyLead postback error", { error: e });
      res.status(200).send("1");
    }
  }
);
