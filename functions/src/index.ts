import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

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
    // Only allow GET and POST requests
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({
        success: false,
        error: "Method Not Allowed",
        message: "Only GET and POST requests are supported.",
      });
      return;
    }

    // Merge query string and body parameters (supporting both GET & POST)
    const params: MyLeadQuery = { ...req.query, ...(req.body || {}) };
    logger.info("MyLead postback received", { method: req.method, params });

    // Extract key parameters with comprehensive MyLead macro fallbacks
    const rawSubid = (
      params.subid ||
      (params as any).ml_sub1 ||
      params.uid ||
      (params as any).player_id ||
      (params as any).ml_sub2 ||
      ""
    ).toString().trim();

    const rawTxId = (
      params.transaction_id ||
      params.tx_id ||
      (params as any).id ||
      ""
    ).toString().trim();

    const rawPayout = params.payout ?? (params as any).payout_decimal ?? (params as any).virtual_amount ?? (params as any).amount ?? 0;
    const rawStatus = (params.status !== undefined && params.status !== null) ? params.status.toString().trim() : "1";
    const offerName = (params.offer_name || params.offer_title || (params as any).program_name || "MyLead Offer").toString().trim();
    
    // Authorization token check
    const authHeader = req.headers.authorization;
    const providedToken = (params.token || params.secret || "").toString().trim() ||
                          (authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "");

    // 1. Verify Secret Token (if MYLEAD_SECRET_TOKEN environment variable is explicitly set and non-placeholder)
    const expectedToken = process.env.MYLEAD_SECRET_TOKEN?.trim();
    if (expectedToken && expectedToken.length > 0 && expectedToken !== "your_mylead_secret_token_here") {
      if (!providedToken || providedToken !== expectedToken) {
        logger.warn("MyLead postback unauthorized attempt", { providedToken, rawSubid, rawTxId });
        res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Invalid or missing secret verification token.",
        });
        return;
      }
    }

    // Detect test pings or literal unreplaced macros from MyLead dashboard test tool
    const isLiteralMacro = (val: string) => !val || (val.startsWith("{") && val.endsWith("}")) || val.toLowerCase() === "test" || val === "0";
    const isTestPing = isLiteralMacro(rawSubid) || isLiteralMacro(rawTxId) || (params as any).is_test === "1" || (params as any).test === "true";

    // If it's a test ping from MyLead dashboard, respond immediately with 200 OK
    if (isTestPing) {
      logger.info("MyLead test ping acknowledged", { params });
      res.status(200).json({
        success: true,
        message: "MyLead postback test ping received successfully!",
        status: "test_success",
        receivedParams: params,
      });
      return;
    }

    const subid = rawSubid;
    const transactionId = rawTxId;

    // 2. Validate required parameters for live postbacks
    if (!subid) {
      res.status(200).json({
        success: true,
        message: 'Postback ping received without subid (user ID).',
        status: 'ignored_no_subid',
      });
      return;
    }

    if (!transactionId) {
      res.status(200).json({
        success: true,
        message: 'Postback ping received without transaction_id.',
        status: 'ignored_no_txid',
      });
      return;
    }

    const numericPayout = typeof rawPayout === "number" ? rawPayout : parseFloat(rawPayout || "0");
    const validPayout = isNaN(numericPayout) || numericPayout < 0 ? 0 : numericPayout;

    // 3. Status Conversion Verification
    const isSuccessfulConversion =
      rawStatus === "1" ||
      rawStatus.toLowerCase() === "approved" ||
      rawStatus.toLowerCase() === "payable" ||
      rawStatus.toLowerCase() === "success" ||
      rawStatus.toLowerCase() === "lead";

    try {
      // 4. Atomic Firestore Transaction to handle duplicate prevention and user balance increment
      const transactionResult = await db.runTransaction(async (transaction) => {
        // Document References
        const globalTxRef = db.collection("transactions").doc(transactionId);
        const userRef = db.collection("users").doc(subid);
        const userTxRef = userRef.collection("transactions").doc(transactionId);

        // Check if transaction_id has already been processed
        const globalTxDoc = await transaction.get(globalTxRef);
        if (globalTxDoc.exists) {
          return { isDuplicate: true };
        }

        // Fetch user document
        const userDoc = await transaction.get(userRef);

        const timestampIso = new Date().toISOString();
        const transactionRecord = {
          transaction_id: transactionId,
          uid: subid,
          payout: validPayout,
          offer_name: offerName,
          timestamp: FieldValue.serverTimestamp(),
          createdAt: timestampIso,
          network: "MyLead",
          status: isSuccessfulConversion ? "approved" : rawStatus,
          rawStatus: rawStatus,
        };

        // Write global transaction document
        transaction.set(globalTxRef, transactionRecord);

        // Update user balance if conversion was successful
        if (isSuccessfulConversion) {
          if (userDoc.exists) {
            transaction.update(userRef, {
              coins: FieldValue.increment(validPayout),
              totalEarned: FieldValue.increment(validPayout),
              offersCompletedToday: FieldValue.increment(1),
              totalTasksCompleted: FieldValue.increment(1),
              updatedAt: timestampIso,
            });
          } else {
            // Provision initial user record if missing
            transaction.set(
              userRef,
              {
                coins: validPayout,
                totalEarned: validPayout,
                xp: 0,
                level: 1,
                streak: 1,
                lastCheckIn: null,
                slapsToday: 0,
                maxSlapsPerDay: 50,
                daysActive: 1,
                offersCompletedToday: 1,
                totalTasksCompleted: 1,
                createdAt: Date.now(),
                updatedAt: timestampIso,
              },
              { merge: true }
            );
          }

          // Also write to user's subcollection for UI transaction logs
          transaction.set(userTxRef, {
            id: transactionId,
            type: "earn",
            amount: validPayout,
            title: offerName,
            category: "Offerwall",
            network: "MyLead",
            timestamp: timestampIso,
            status: "completed",
          });
        }

        return { isDuplicate: false };
      });

      if (transactionResult.isDuplicate) {
        logger.info("Duplicate transaction ignored", { transactionId, subid });
        res.status(200).json({
          success: true,
          message: "Duplicate transaction_id ignored (already processed).",
          transaction_id: transactionId,
          uid: subid,
          status: "duplicate",
        });
        return;
      }

      logger.info("MyLead postback processed successfully", {
        transactionId,
        subid,
        validPayout,
        isSuccessfulConversion,
      });

      res.status(200).json({
        success: true,
        message: isSuccessfulConversion
          ? "Postback processed successfully. User balance credited."
          : `Postback logged with status "${rawStatus}". No credit issued.`,
        transaction_id: transactionId,
        uid: subid,
        payout: validPayout,
        status: isSuccessfulConversion ? "approved" : rawStatus,
      });
    } catch (err: any) {
      logger.error("Error processing MyLead postback", { error: err });
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: err?.message || "Failed to process postback transaction.",
      });
    }
  }
);
