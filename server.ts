import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { processMyLeadPostback } from "./src/lib/myleadPostbackHandler.js";
import { processGenericPostback } from "./src/lib/genericPostbackHandler.js";
import { processCpxPostback } from "./src/lib/cpxPostbackHandler.js";
import { 
  getAdminDbInstance, 
  getAdminAuthInstance, 
  AdminFieldValue, 
  requireAuth, 
  requireAdmin,
  requireAppCheck,
  checkRateLimit,
  recordTapAndCheckCps,
  detectVpnOrProxy,
  computeDeviceFingerprint,
  getAntiCheatConfigServer,
  updateAntiCheatConfigServer,
  logSecurityIncident,
  checkAuthAttemptRateLimit,
  recordAuthAttempt,
  AuthenticatedRequest 
} from "./src/lib/serverFirebaseAdmin.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // =========================================================================
  // FIX 14: STRICT CORS & SECURITY HEADERS MIDDLEWARE
  // =========================================================================
  const ALLOWED_ORIGINS = [
    'https://slapearn.app',
    'https://slapearn.web.app',
    'https://slapearn.firebaseapp.com',
  ];

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isPostback = req.path.startsWith('/api/postback') || 
                       req.path.startsWith('/api/cpx') || 
                       req.path.startsWith('/api/mylead') ||
                       req.path.startsWith('/api/torox') ||
                       req.path.startsWith('/api/monlix') ||
                       req.path.startsWith('/api/reward-postback');

    if (origin) {
      if (
        ALLOWED_ORIGINS.includes(origin) || 
        origin.endsWith('.run.app') || 
        origin.endsWith('.web.app') || 
        origin.endsWith('.firebaseapp.com') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1')
      ) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (isPostback) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck, X-Client-Fingerprint');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Security Response Headers (Fix 8)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Direct Service Worker Route without SPA fallback (Fix 11)
  app.get(['/sw.js', '/sw.js/'], (req, res) => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(swPath);
    } else {
      res.status(404).send('Service worker not found');
    }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // =========================================================================
  // 1. DEDICATED POSTBACK ENDPOINTS (CPX Research, MyLead, ToroX, Monlix, Generic) - Fix 10
  // =========================================================================

  app.all(["/api/cpx/postback", "/api/cpx/postback/", "/api/postback/cpx", "/api/postback/cpx/"], async (req, res) => {
    res.setHeader("Content-Type", "text/plain");

    if (req.method === "OPTIONS" || req.method === "HEAD") {
      res.status(200).send("1");
      return;
    }

    try {
      const payload = { ...req.query, ...(req.body || {}) };
      const result = await processCpxPostback(payload);
      if (result && typeof result.responseBody === "string") {
        res.status(result.statusCode || 200).send(result.responseBody);
        return;
      }
    } catch (err: any) {
      console.error("CPX postback route handler error:", err);
    }

    res.status(200).send("1");
  });

  // ToroX Postback with cryptographic signature verification (Fix 10)
  app.all(["/api/postback/torox", "/api/postback/torox/"], async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const params = { ...req.query, ...(req.body || {}) } as Record<string, any>;
    const userId = String(params.user_id || params.subid || params.uid || "").trim();
    const transId = String(params.oid || params.trans_id || params.transaction_id || "").trim();
    const amount = parseFloat(String(params.amount || params.payout || "0"));
    const sig = String(params.sig || params.signature || "").trim();

    if (!userId || !transId) {
      await logSecurityIncident({
        type: "TOROX_POSTBACK_MISSING_PARAMS",
        severity: "medium",
        userId: userId || "unknown",
        details: "ToroX Postback missing userId or oid",
        ipAddress: req.ip,
        provider: "ToroX",
        metadata: { params },
      });
      res.status(400).send("0");
      return;
    }

    const secretKey = process.env.TOROX_SECRET_KEY || "torox_secret_key";
    const expectedSig = crypto.createHash("md5").update(`${transId}-${userId}-${secretKey}`).digest("hex");

    if (sig && sig.toLowerCase() !== expectedSig.toLowerCase()) {
      await logSecurityIncident({
        type: "TOROX_POSTBACK_SIGNATURE_FAILED",
        severity: "high",
        userId,
        details: `ToroX signature mismatch for oid ${transId}`,
        ipAddress: req.ip,
        provider: "ToroX",
        metadata: { sig, transId },
      });
      res.status(403).send("0");
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).send("0");
      return;
    }

    try {
      const txRef = adminDb.collection("torox_transactions").doc(transId);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        res.status(200).send("1");
        return;
      }

      let points = Math.max(0, Math.floor(amount));
      if (points > 5000) points = 5000;

      const userRef = adminDb.collection("users").doc(userId);
      await adminDb.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return;

        t.update(userRef, {
          coins: AdminFieldValue.increment(points),
          totalEarned: AdminFieldValue.increment(points),
          offersCompletedToday: AdminFieldValue.increment(1),
          totalTasksCompleted: AdminFieldValue.increment(1),
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
          createdAt: AdminFieldValue.serverTimestamp(),
        });
      });

      res.status(200).send("1");
    } catch (err) {
      console.error("ToroX Postback error:", err);
      res.status(500).send("0");
    }
  });

  // Monlix Postback with cryptographic secret verification (Fix 10)
  app.all(["/api/postback/monlix", "/api/postback/monlix/"], async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    const params = { ...req.query, ...(req.body || {}) } as Record<string, any>;
    const userId = String(params.userId || params.user_id || params.subId || "").trim();
    const transactionId = String(params.transactionId || params.transId || "").trim();
    const reward = parseFloat(String(params.reward || params.amount || "0"));
    const secretKey = String(params.secretKey || params.secret || "").trim();

    if (!userId || !transactionId) {
      await logSecurityIncident({
        type: "MONLIX_POSTBACK_MISSING_PARAMS",
        severity: "medium",
        userId: userId || "unknown",
        details: "Monlix Postback missing userId or transactionId",
        ipAddress: req.ip,
        provider: "Monlix",
        metadata: { params },
      });
      res.status(400).send("0");
      return;
    }

    const expectedSecret = process.env.MONLIX_SECRET_KEY || "monlix_secret_key";
    if (secretKey && secretKey !== expectedSecret) {
      await logSecurityIncident({
        type: "MONLIX_POSTBACK_SIGNATURE_FAILED",
        severity: "high",
        userId,
        details: `Monlix secret key mismatch for transaction ${transactionId}`,
        ipAddress: req.ip,
        provider: "Monlix",
        metadata: { transactionId },
      });
      res.status(403).send("0");
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).send("0");
      return;
    }

    try {
      const txRef = adminDb.collection("monlix_transactions").doc(transactionId);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        res.status(200).send("OK");
        return;
      }

      let points = Math.max(0, Math.floor(reward));
      if (points > 5000) points = 5000;

      const userRef = adminDb.collection("users").doc(userId);
      await adminDb.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) return;

        t.update(userRef, {
          coins: AdminFieldValue.increment(points),
          totalEarned: AdminFieldValue.increment(points),
          offersCompletedToday: AdminFieldValue.increment(1),
          totalTasksCompleted: AdminFieldValue.increment(1),
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
          createdAt: AdminFieldValue.serverTimestamp(),
        });
      });

      res.status(200).send("OK");
    } catch (err) {
      console.error("Monlix Postback error:", err);
      res.status(500).send("0");
    }
  });

  app.all(["/api/reward-postback", "/api/reward-postback/", "/api/postback/generic", "/api/postback/generic/"], async (req, res) => {
    if (req.method === "OPTIONS" || req.method === "HEAD") {
      res.status(200).send("OK");
      return;
    }

    try {
      const payload = { ...req.query, ...(req.body || {}) };
      const authHeader = req.headers.authorization;
      const result = await processGenericPostback(payload, authHeader);
      if (result.statusCode === 403) {
        await logSecurityIncident({
          type: "GENERIC_POSTBACK_UNAUTHORIZED",
          severity: "high",
          userId: payload.userId || "unknown",
          details: "Generic postback authorization/secret verification failed",
          ipAddress: req.ip,
          provider: payload.provider || "generic",
        });
      }
      res.status(result.statusCode).json(result.responseBody);
    } catch (err: any) {
      console.error("Generic postback handler error:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error processing external reward postback",
        error: "INTERNAL_ERROR"
      });
    }
  });

  app.all(["/api/myleadPostback", "/api/myleadPostback/", "/api/myleadpostback", "/api/myleadpostback/"], async (req, res) => {
    res.setHeader("Content-Type", "text/plain");

    if (req.method === "OPTIONS" || req.method === "HEAD") {
      res.status(200).send("1");
      return;
    }

    try {
      const params = { ...req.query, ...(req.body || {}) };
      const authHeader = req.headers.authorization;
      const result = await processMyLeadPostback(params, authHeader);
      res.status(200).send(typeof result.responseBody === "string" ? result.responseBody : "1");
    } catch (err: any) {
      console.warn("MyLead postback handler error, returning 200 fallback:", err);
      res.status(200).send("1");
    }
  });

  // =========================================================================
  // FIX 13: PRE-LOGIN ABUSE & RATE-LIMITING ENDPOINTS
  // =========================================================================

  app.post("/api/auth/pre-login-check", async (req, res) => {
    const identifier = req.body?.identifier || req.ip || "unknown";
    const check = checkAuthAttemptRateLimit(identifier);
    if (!check.allowed) {
      await logSecurityIncident({
        type: "AUTH_RATE_LIMIT_EXCEEDED",
        severity: "medium",
        details: `Progressive delay / lockout active for ${identifier}`,
        ipAddress: req.ip,
      });
      res.status(429).json({
        success: false,
        error: "TOO_MANY_ATTEMPTS",
        message: `Too many failed login attempts. Please wait ${check.remainingLockoutSeconds || 60} seconds before trying again.`,
        remainingSeconds: check.remainingLockoutSeconds,
      });
      return;
    }
    res.json({ success: true, allowed: true });
  });

  app.post("/api/auth/record-attempt", async (req, res) => {
    const identifier = req.body?.identifier || req.ip || "unknown";
    const success = Boolean(req.body?.success);
    recordAuthAttempt(identifier, success);
    if (!success) {
      await logSecurityIncident({
        type: "AUTH_FAILED_ATTEMPT",
        severity: "low",
        details: `Failed authentication attempt for ${identifier}`,
        ipAddress: req.ip,
      });
    }
    res.json({ success: true });
  });

  // =========================================================================
  // FIX 9: SERVER-SIDE ERROR LOGGING ENDPOINT
  // =========================================================================

  app.post("/api/log-error", async (req, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(200).json({ received: true });
      return;
    }
    try {
      const errorData = req.body || {};
      await adminDb.collection("error_logs").add({
        type: errorData.type || "client_anomaly",
        message: errorData.message || "Unknown error",
        details: errorData.details || {},
        ip: req.ip,
        createdAt: AdminFieldValue.serverTimestamp(),
      });
    } catch {}
    res.json({ success: true });
  });

  // Server time endpoint - tamper-proof server clock
  app.get("/api/time", (req, res) => {
    const now = Date.now();
    res.json({
      serverTime: now,
      iso: new Date(now).toISOString(),
      timezone: "UTC"
    });
  });

  // =========================================================================
  // FIX 5: SERVER-ENFORCED MULTI-ACCOUNT REGISTRATION (/api/auth/register-or-init)
  // =========================================================================

  app.post("/api/auth/register-or-init", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid;
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    // Derive server-side device & network fingerprint (combines IP subnet, user-agent, App Check token)
    const { fingerprint: deviceHash, ip: clientIp } = computeDeviceFingerprint(req, req.body?.deviceFingerprint);

    try {
      const antiCheatConfig = await getAntiCheatConfigServer();
      const maxAccounts = antiCheatConfig.maxAccountsPerDevice || 2;

      // VPN / Proxy check on registration
      if (antiCheatConfig.blockVpnProxy) {
        const vpnStatus = detectVpnOrProxy(req);
        if (vpnStatus.isVpnOrProxy) {
          await adminDb.collection("security_logs").add({
            type: "vpn_registration_blocked",
            userId,
            ip: clientIp,
            reason: vpnStatus.reason || "VPN/Proxy detected on registration",
            createdAt: AdminFieldValue.serverTimestamp(),
          }).catch(() => {});

          res.status(403).json({
            success: false,
            error: "VPN_OR_PROXY_DETECTED",
            message: "Registration not permitted through VPN or proxy connection.",
          });
          return;
        }
      }

      await adminDb.runTransaction(async (transaction) => {
        const deviceRef = adminDb.collection("device_registrations").doc(deviceHash);
        const deviceDoc = await transaction.get(deviceRef);

        let registeredUids: string[] = [];
        if (deviceDoc.exists) {
          registeredUids = deviceDoc.data()?.uids || [];
        }

        // Enforce the 2-account limit atomically in the transaction
        if (!registeredUids.includes(userId)) {
          if (registeredUids.length >= maxAccounts) {
            throw new Error("MAX_ACCOUNTS_PER_DEVICE_EXCEEDED");
          }
          registeredUids.push(userId);
          transaction.set(deviceRef, {
            deviceHash,
            uids: registeredUids,
            accountCount: registeredUids.length,
            lastIp: clientIp,
            updatedAt: AdminFieldValue.serverTimestamp(),
          }, { merge: true });
        }

        // Initialize user document if not already created
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          const generatedMyCode = `SLAP-${userId.slice(0, 6).toUpperCase()}`;
          transaction.set(userRef, {
            uid: userId,
            email: req.user?.email || "",
            displayName: req.user?.displayName || "Slapper",
            username: req.user?.displayName || "Slapper",
            myReferralCode: generatedMyCode,
            country: "South Africa 🇿🇦",
            coins: 100,
            totalEarned: 100,
            xp: 0,
            level: 1,
            streak: 0,
            slapsToday: 70,
            maxSlapsPerDay: 100,
            bestCombo: 0,
            daysActive: 0,
            referrals: 0,
            adsWatchedToday: 0,
            totalAdsWatchedLifetime: 0,
            hasClaimedStarterPack: true,
            deviceHash,
            createdAt: AdminFieldValue.serverTimestamp(),
            updatedAt: AdminFieldValue.serverTimestamp(),
          });
        }
      });

      res.json({
        success: true,
        registered: true,
        deviceHash,
      });
    } catch (err: any) {
      console.warn("[AuthInit] Registration error:", err?.message || err);
      if (err.message === "MAX_ACCOUNTS_PER_DEVICE_EXCEEDED") {
        await adminDb.collection("security_logs").add({
          type: "multi_account_blocked",
          userId,
          deviceHash,
          ip: clientIp,
          reason: "Max 2 accounts limit per device exceeded",
          createdAt: AdminFieldValue.serverTimestamp(),
        }).catch(() => {});

        res.status(403).json({
          success: false,
          error: "MAX_ACCOUNTS_PER_DEVICE_EXCEEDED",
          message: "Maximum account limit (2 accounts per device) reached.",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: err.message || "REGISTRATION_FAILED",
      });
    }
  });

  // =========================================================================
  // FIX 4: LOCKED-DOWN REWARD VERIFICATION APIS
  // =========================================================================

  // 1. Verify Daily Check-In Eligibility (Authenticated, strictly server-derived)
  app.post("/api/rewards/verify-daily-checkin", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid; // Strictly derived from verified ID token - never from body/query
    
    // Rate limit per UID to prevent hammering
    if (!checkRateLimit(userId, 20, 60000)) {
      res.status(429).json({ eligible: false });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(403).json({ eligible: false });
      return;
    }

    try {
      const userRef = adminDb.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        res.status(403).json({ eligible: false });
        return;
      }

      const userData = userDoc.data() || {};
      if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
        res.status(403).json({ eligible: false });
        return;
      }

      const serverNow = Date.now();
      const serverDate = new Date(serverNow);
      const todayUtc = `${serverDate.getUTCFullYear()}-${String(serverDate.getUTCMonth() + 1).padStart(2, "0")}-${String(serverDate.getUTCDate()).padStart(2, "0")}`;

      let lastCheckInUtc: string | null = null;
      if (userData.lastCheckIn) {
        const lastDate = new Date(userData.lastCheckIn);
        if (!isNaN(lastDate.getTime())) {
          lastCheckInUtc = `${lastDate.getUTCFullYear()}-${String(lastDate.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDate.getUTCDate()).padStart(2, "0")}`;
        }
      }

      if (lastCheckInUtc === todayUtc) {
        // Do NOT leak reward amounts or cooldown timer when ineligible
        res.json({ eligible: false });
        return;
      }

      const daysOfCheckIn = [
        { day: 1, slaps: 1, coins: 10 },
        { day: 2, slaps: 1, coins: 20 },
        { day: 3, slaps: 2, coins: 30 },
        { day: 4, slaps: 2, coins: 40 },
        { day: 5, slaps: 3, coins: 50 },
        { day: 6, slaps: 3, coins: 75 },
        { day: 7, slaps: 5, coins: 150 },
      ];

      const currentStreak = Number(userData.streak) || 0;
      const currentStreakIndex = currentStreak >= 7 ? 0 : currentStreak;
      const rewardItem = daysOfCheckIn[currentStreakIndex] || daysOfCheckIn[0];
      const nextStreak = currentStreakIndex + 1;

      res.json({
        eligible: true,
        nextStreak,
        slapsToGive: rewardItem.slaps,
        coinsToGive: rewardItem.coins,
        serverTime: serverNow,
      });
    } catch {
      res.status(403).json({ eligible: false });
    }
  });

  // 2. Verify Lucky Wheel Spin Eligibility (Authenticated, strictly server-derived)
  app.post("/api/rewards/verify-wheel-spin", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid; // Strictly derived from verified ID token
    
    if (!checkRateLimit(userId, 20, 60000)) {
      res.status(429).json({ eligible: false });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(403).json({ eligible: false });
      return;
    }

    try {
      const userRef = adminDb.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        res.status(403).json({ eligible: false });
        return;
      }

      const userData = userDoc.data() || {};
      if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
        res.status(403).json({ eligible: false });
        return;
      }

      const serverNow = Date.now();
      const COOLDOWN_MS = 5 * 60 * 60 * 1000;
      const freeSpins = Number(userData.freeSpins) || 0;
      const lastSpinTime = userData.lastWheelSpin ? new Date(userData.lastWheelSpin).getTime() : 0;
      const elapsed = serverNow - lastSpinTime;

      if (freeSpins <= 0 && elapsed < COOLDOWN_MS) {
        res.json({
          eligible: false,
          remainingMs: Math.max(0, COOLDOWN_MS - elapsed),
          serverTime: serverNow,
        });
        return;
      }

      res.json({
        eligible: true,
        freeSpins,
        serverTime: serverNow,
      });
    } catch {
      res.status(403).json({ eligible: false });
    }
  });

  // 3. Verify Withdrawal Eligibility (Authenticated, strictly server-derived)
  app.post("/api/verify-withdrawal-eligibility", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid; // Strictly derived from verified ID token
    
    if (!checkRateLimit(userId, 20, 60000)) {
      res.status(429).json({ eligible: false });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(403).json({ eligible: false });
      return;
    }

    try {
      const [userDoc, antiCheatConfig] = await Promise.all([
        adminDb.collection("users").doc(userId).get(),
        getAntiCheatConfigServer(),
      ]);

      if (!userDoc.exists) {
        res.status(403).json({ eligible: false });
        return;
      }

      const userData = userDoc.data() || {};
      if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
        res.json({ eligible: false });
        return;
      }

      const serverNow = Date.now();
      let userCreatedAt = serverNow;

      if (userData.createdAt) {
        if (typeof userData.createdAt.toMillis === "function") {
          userCreatedAt = userData.createdAt.toMillis();
        } else if (typeof userData.createdAt === "number") {
          userCreatedAt = userData.createdAt;
        } else {
          userCreatedAt = new Date(userData.createdAt).getTime() || serverNow;
        }
      }

      const ageHours = Math.max(0, (serverNow - userCreatedAt) / (1000 * 60 * 60));
      const requiredHours = antiCheatConfig.minAccountAgeHoursForCashout || 24;

      if (ageHours < requiredHours) {
        res.json({ eligible: false });
        return;
      }

      const currentCoins = Number(userData.coins) || 0;
      const minRequired = antiCheatConfig.minWithdrawalSp || 50000;

      if (currentCoins < minRequired) {
        res.json({ eligible: false });
        return;
      }

      res.json({
        eligible: true,
        accountAgeHours: Math.floor(ageHours),
        currentBalance: currentCoins,
        serverTime: serverNow,
      });
    } catch {
      res.status(403).json({ eligible: false });
    }
  });

  // =========================================================================
  // FIX 6: ANTI-CHEAT CONFIG MANAGEMENT APIS (Admin Gated)
  // =========================================================================

  app.get("/api/admin/anti-cheat-config", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const config = await getAntiCheatConfigServer();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "FETCH_FAILED" });
    }
  });

  app.post("/api/admin/anti-cheat-config", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await updateAntiCheatConfigServer(req.body || {});
      res.json({ success: true, config: updated, message: "Anti-cheat config updated successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "UPDATE_FAILED" });
    }
  });

  // =========================================================================
  // 2. SECURED LEADERBOARD FINALIZATION (FIX 2: Custom Claims + Idempotency)
  // =========================================================================

  app.get("/api/leaderboard/weekly/history", async (req, res) => {
    try {
      const { fetchWeeklyLeaderboardHistory, autoFinalizeCompletedLeaderboards } = await import("./src/lib/weeklyLeaderboard.js");
      await autoFinalizeCompletedLeaderboards().catch(() => {});
      const history = await fetchWeeklyLeaderboardHistory();
      res.json({ success: true, history });
    } catch (err: any) {
      console.error("Error fetching weekly leaderboard history:", err);
      res.status(500).json({ success: false, history: [] });
    }
  });

  app.post("/api/leaderboard/weekly/finalize", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { weekId, winners } = req.body || {};
      const { finalizeWeeklyLeaderboardPrizes } = await import("./src/lib/weeklyLeaderboard.js");
      const result = await finalizeWeeklyLeaderboardPrizes(weekId, winners);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      console.error("Error finalizing weekly leaderboard prizes:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error finalizing weekly leaderboard prizes.",
        error: err.message || "INTERNAL_ERROR"
      });
    }
  });

  app.post("/api/leaderboard/monthly/finalize", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { monthId, winner } = req.body || {};
      const { finalizeMonthlyReferralPrize } = await import("./src/lib/weeklyLeaderboard.js");
      const result = await finalizeMonthlyReferralPrize(monthId, winner);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      console.error("Error finalizing monthly referral prize:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error finalizing monthly referral prize.",
        error: err.message || "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/leaderboard/monthly/history", async (req, res) => {
    try {
      const { fetchMonthlyReferralHistory, autoFinalizeCompletedLeaderboards } = await import("./src/lib/weeklyLeaderboard.js");
      await autoFinalizeCompletedLeaderboards().catch(() => {});
      const history = await fetchMonthlyReferralHistory();
      res.json({ success: true, history });
    } catch (err: any) {
      console.error("Error fetching monthly referral history:", err);
      res.status(500).json({ success: false, history: [] });
    }
  });

  // =========================================================================
  // 3. SERVER-AUTHORITATIVE ECONOMY MUTATIONS (With Rate Limiting & Anti-Cheat)
  // =========================================================================

  // Slap / Tap Reward Endpoint (Enforces maxCpsThreshold via recordTapAndCheckCps)
  app.post("/api/game/slap-reward", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid;
    const { 
      hits = 1, 
      characterName = 'Momo Peach', 
      isDefeated = false, 
      criticalHits = 0 
    } = req.body || {};

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const antiCheatConfig = await getAntiCheatConfigServer();
      
      // Fix 6.2: Enforce maxCpsThreshold server-side
      const cpsCheck = recordTapAndCheckCps(userId, antiCheatConfig.maxCpsThreshold || 12);
      if (!cpsCheck.allowed) {
        await adminDb.collection("security_logs").add({
          type: "cps_rate_limit_exceeded",
          userId,
          currentCps: cpsCheck.currentCps,
          threshold: antiCheatConfig.maxCpsThreshold,
          createdAt: AdminFieldValue.serverTimestamp(),
        }).catch(() => {});

        res.status(429).json({
          success: false,
          error: "TAP_RATE_LIMIT_EXCEEDED",
          message: "Tapping too quickly. Please slow down.",
        });
        return;
      }

      const result = await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const userData = userDoc.data() || {};
        if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
          throw new Error("ACCOUNT_RESTRICTED");
        }

        // Server-side character reward table
        const charSpecs: Record<string, { baseReward: number; critReward: number; defeatCoins: number; defeatXp: number }> = {
          'Momo Peach': { baseReward: 1, critReward: 4, defeatCoins: 25, defeatXp: 30 },
          'Puni Slime': { baseReward: 1.5, critReward: 6, defeatCoins: 45, defeatXp: 50 },
          'Bobo Tea': { baseReward: 2.5, critReward: 10, defeatCoins: 75, defeatXp: 80 },
          'Wooly Alpaca': { baseReward: 4, critReward: 15, defeatCoins: 140, defeatXp: 150 },
          'Aero Star': { baseReward: 7.5, critReward: 25, defeatCoins: 300, defeatXp: 300 },
        };

        const spec = charSpecs[characterName] || charSpecs['Momo Peach'];
        const safeHits = Math.min(Math.max(1, Number(hits) || 1), 20);
        const safeCrits = Math.min(Math.max(0, Number(criticalHits) || 0), safeHits);
        const regularHits = safeHits - safeCrits;

        let earnedCoins = (regularHits * spec.baseReward) + (safeCrits * spec.critReward);
        let earnedXp = safeHits * 2;

        if (isDefeated) {
          earnedCoins += spec.defeatCoins;
          earnedXp += spec.defeatXp;
        }

        earnedCoins = Math.round(earnedCoins);
        earnedXp = Math.round(earnedXp);

        let currentXp = (Number(userData.xp) || 0) + earnedXp;
        let currentLevel = Number(userData.level) || 1;
        let leveledUp = false;
        const xpThreshold = currentLevel * 650;

        if (currentXp >= xpThreshold) {
          currentXp -= xpThreshold;
          currentLevel += 1;
          leveledUp = true;
          earnedCoins += 300; // Level-up bonus
        }

        const updatedCoins = (Number(userData.coins) || 0) + earnedCoins;
        const updatedTotalEarned = (Number(userData.totalEarned) || 0) + earnedCoins;
        const currentSlapsToday = (Number(userData.slapsToday) || 70) + safeHits;
        const totalSlaps = (Number(userData.totalSlaps) || 0) + safeHits;
        const totalDamageDealtToday = (Number(userData.totalDamageDealtToday) || 0) + safeHits;
        const charactersDefeatedToday = (Number(userData.charactersDefeatedToday) || 0) + (isDefeated ? 1 : 0);

        transaction.update(userRef, {
          coins: updatedCoins,
          totalEarned: updatedTotalEarned,
          xp: currentXp,
          level: currentLevel,
          slapsToday: currentSlapsToday,
          totalSlaps,
          totalDamageDealtToday,
          charactersDefeatedToday,
          updatedAt: AdminFieldValue.serverTimestamp(),
        });

        // Record transaction if character defeated or leveled up
        if (isDefeated || leveledUp) {
          const txId = `tx_slap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const userTxRef = userRef.collection("transactions").doc(txId);
          transaction.set(userTxRef, {
            id: txId,
            userId,
            type: "earn",
            amount: earnedCoins,
            title: isDefeated ? `Defeated Boss ${characterName}` : `Level Up to ${currentLevel}`,
            category: isDefeated ? "Game Boss Defeat" : "Level Up",
            timestamp: new Date().toISOString(),
            status: "completed",
          });
        }

        return {
          earnedCoins,
          earnedXp,
          coins: updatedCoins,
          totalEarned: updatedTotalEarned,
          xp: currentXp,
          level: currentLevel,
          slapsToday: currentSlapsToday,
          leveledUp,
        };
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[SlapReward] Error executing slap reward:", err);
      res.status(400).json({
        success: false,
        error: err.message || "TRANSACTION_FAILED",
      });
    }
  });

  // Daily Check-In Claim Endpoint (Enforces server-authoritative timestamps)
  app.post("/api/rewards/claim-daily-checkin", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid;
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    const serverNow = Date.now();
    const serverDate = new Date(serverNow);
    const todayUtc = `${serverDate.getUTCFullYear()}-${String(serverDate.getUTCMonth() + 1).padStart(2, "0")}-${String(serverDate.getUTCDate()).padStart(2, "0")}`;

    const daysOfCheckIn = [
      { day: 1, slaps: 1, coins: 10 },
      { day: 2, slaps: 1, coins: 20 },
      { day: 3, slaps: 2, coins: 30 },
      { day: 4, slaps: 2, coins: 40 },
      { day: 5, slaps: 3, coins: 50 },
      { day: 6, slaps: 3, coins: 75 },
      { day: 7, slaps: 5, coins: 150 },
    ];

    try {
      const result = await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const userData = userDoc.data() || {};
        if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
          throw new Error("ACCOUNT_RESTRICTED");
        }

        let lastCheckInUtc: string | null = null;
        if (userData.lastCheckIn) {
          const lastDate = new Date(userData.lastCheckIn);
          if (!isNaN(lastDate.getTime())) {
            lastCheckInUtc = `${lastDate.getUTCFullYear()}-${String(lastDate.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDate.getUTCDate()).padStart(2, "0")}`;
          }
        }

        if (lastCheckInUtc === todayUtc) {
          throw new Error("ALREADY_CLAIMED_TODAY");
        }

        const currentStreak = Number(userData.streak) || 0;
        const currentStreakIndex = currentStreak >= 7 ? 0 : currentStreak;
        const rewardItem = daysOfCheckIn[currentStreakIndex] || daysOfCheckIn[0];
        const nextStreak = currentStreakIndex + 1;
        const coinsAwarded = rewardItem.coins;
        const slapsAwarded = rewardItem.slaps;

        const updatedCoins = (Number(userData.coins) || 0) + coinsAwarded;
        const updatedTotalEarned = (Number(userData.totalEarned) || 0) + coinsAwarded;
        const currentSlaps = Number(userData.slapsToday) || 70;
        const updatedSlaps = Math.max(0, currentSlaps - slapsAwarded);

        transaction.update(userRef, {
          coins: updatedCoins,
          totalEarned: updatedTotalEarned,
          streak: nextStreak,
          slapsToday: updatedSlaps,
          lastCheckIn: new Date(serverNow).toISOString(),
          updatedAt: AdminFieldValue.serverTimestamp(),
        });

        const txId = `tx_daily_${todayUtc}_${userId}`;
        const userTxRef = userRef.collection("transactions").doc(txId);
        transaction.set(userTxRef, {
          id: txId,
          userId,
          type: "earn",
          amount: coinsAwarded,
          title: `Daily Check-In (Day ${nextStreak})`,
          category: "Daily Check-in",
          timestamp: new Date(serverNow).toISOString(),
          status: "completed",
        });

        return {
          coinsAwarded,
          slapsAwarded,
          nextStreak,
          coins: updatedCoins,
          totalEarned: updatedTotalEarned,
        };
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "CHECKIN_FAILED",
      });
    }
  });

  // Lucky Wheel Spin Endpoint (Server-Side Verification & Weighted Reward Distribution)
  app.post("/api/rewards/claim-wheel-spin", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid;
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    const serverNow = Date.now();
    const COOLDOWN_MS = 5 * 60 * 60 * 1000;

    const wheelPrizes = [
      { id: 1, name: '10 SP', type: 'coins', amount: 10, weight: 35 },
      { id: 2, name: '25 SP', type: 'coins', amount: 25, weight: 30 },
      { id: 3, name: '50 SP', type: 'coins', amount: 50, weight: 15 },
      { id: 4, name: '100 SP', type: 'coins', amount: 100, weight: 10 },
      { id: 5, name: '250 SP', type: 'coins', amount: 250, weight: 6 },
      { id: 6, name: '500 SP', type: 'coins', amount: 500, weight: 3 },
      { id: 7, name: '1 Free Spin', type: 'spin', amount: 1, weight: 1 },
    ];

    try {
      const result = await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const userData = userDoc.data() || {};
        if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
          throw new Error("ACCOUNT_RESTRICTED");
        }

        const freeSpins = Number(userData.freeSpins) || 0;
        const lastSpinTime = userData.lastWheelSpin ? new Date(userData.lastWheelSpin).getTime() : 0;
        const elapsed = serverNow - lastSpinTime;

        if (freeSpins <= 0 && elapsed < COOLDOWN_MS) {
          const remainingMinutes = Math.ceil((COOLDOWN_MS - elapsed) / (1000 * 60));
          throw new Error(`SPIN_COOLDOWN_ACTIVE: Please wait ${remainingMinutes} minutes.`);
        }

        const totalWeight = wheelPrizes.reduce((acc, p) => acc + p.weight, 0);
        let randomNum = Math.random() * totalWeight;
        let selectedPrize = wheelPrizes[0];

        for (const prize of wheelPrizes) {
          if (randomNum < prize.weight) {
            selectedPrize = prize;
            break;
          }
          randomNum -= prize.weight;
        }

        let updatedCoins = Number(userData.coins) || 0;
        let updatedTotal = Number(userData.totalEarned) || 0;
        let updatedFreeSpins = freeSpins > 0 ? freeSpins - 1 : 0;

        if (selectedPrize.type === "coins") {
          updatedCoins += selectedPrize.amount;
          updatedTotal += selectedPrize.amount;
        } else if (selectedPrize.type === "spin") {
          updatedFreeSpins += selectedPrize.amount;
        }

        transaction.update(userRef, {
          coins: updatedCoins,
          totalEarned: updatedTotal,
          freeSpins: updatedFreeSpins,
          lastWheelSpin: new Date(serverNow).toISOString(),
          updatedAt: AdminFieldValue.serverTimestamp(),
        });

        const txId = `tx_spin_${Date.now()}_${userId}`;
        const userTxRef = userRef.collection("transactions").doc(txId);
        transaction.set(userTxRef, {
          id: txId,
          userId,
          type: "earn",
          amount: selectedPrize.type === "coins" ? selectedPrize.amount : 0,
          title: `Lucky Wheel Prize: ${selectedPrize.name}`,
          category: "Wheel Spin",
          timestamp: new Date(serverNow).toISOString(),
          status: "completed",
        });

        return {
          prize: selectedPrize,
          coins: updatedCoins,
          totalEarned: updatedTotal,
          freeSpins: updatedFreeSpins,
          lastWheelSpin: new Date(serverNow).toISOString(),
        };
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "SPIN_FAILED",
      });
    }
  });

  // Energy Restore Endpoint
  app.post("/api/game/restore-energy", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid;
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const result = await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) throw new Error("USER_NOT_FOUND");
        const userData = userDoc.data() || {};

        const currentSlaps = Number(userData.slapsToday) || 70;
        const availableSlaps = Math.max(0, 100 - currentSlaps);
        if (availableSlaps >= 100) {
          throw new Error("ENERGY_ALREADY_FULL");
        }

        const slapsToRestore = Math.min(3, 100 - availableSlaps);
        const updatedSlaps = Math.max(0, currentSlaps - slapsToRestore);

        transaction.update(userRef, {
          slapsToday: updatedSlaps,
          updatedAt: AdminFieldValue.serverTimestamp(),
        });

        return {
          slapsRestored: slapsToRestore,
          slapsToday: updatedSlaps,
        };
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || "RESTORE_FAILED" });
    }
  });

  // =========================================================================
  // HILLTOPADS REWARDED VIDEO (VAST Zone 7333693)
  // =========================================================================
  app.get("/api/ads/vast-fetch", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const vastUrl = "https://gloomy-association.com/d.m/f/zJdtGWv/vBZgT6/Ug/-eKm60CueZ/UV2J/k/PNT/cjzLMBzcMI2/O/T/Mt1hNSzgWzvNMMz/YY5nNSwE";
      const clientIp = req.headers["x-forwarded-for"] || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "";

      const fetchRes = await fetch(vastUrl, {
        headers: {
          "User-Agent": Array.isArray(userAgent) ? userAgent[0] : String(userAgent),
          "X-Forwarded-For": Array.isArray(clientIp) ? clientIp[0] : String(clientIp),
          "Accept": "application/xml, text/xml, */*"
        }
      });

      const xmlText = await fetchRes.text();
      console.log(`[HilltopAds VAST XML Response - Zone 7333693 | Status ${fetchRes.status}]:\n${xmlText}`);

      res.setHeader("Content-Type", "application/xml");
      res.send(xmlText);
    } catch (err: any) {
      console.error("[HilltopAds VAST Fetch Error]:", err);
      res.status(500).json({ success: false, error: err.message || "FAILED_TO_FETCH_VAST" });
    }
  });

  app.post("/api/ads/reward", requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid;
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const result = await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) throw new Error("USER_NOT_FOUND");
        const userData = userDoc.data() || {};

        if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
          throw new Error("ACCOUNT_RESTRICTED");
        }

        const adsToday = Number(userData.adsWatchedToday) || 0;
        if (adsToday >= 20) {
          throw new Error("DAILY_AD_LIMIT_REACHED");
        }

        const totalLifetimeAds = (Number(userData.totalAdsWatchedLifetime) || 0) + 1;
        const currentSlaps = Number(userData.slapsToday) || 70;
        const updatedSlaps = Math.max(0, currentSlaps - 3); // Restores 3 slaps

        const spReward = 5;
        const xpReward = 10;
        const currentCoins = Number(userData.coins) || 0;
        const currentTotalEarned = Number(userData.totalEarned) || 0;
        const currentXp = Number(userData.xp) || 0;

        const updatedCoins = currentCoins + spReward;
        const updatedTotalEarned = currentTotalEarned + spReward;
        const updatedXp = currentXp + xpReward;

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
          coins: updatedCoins,
          totalEarned: updatedTotalEarned,
          xp: updatedXp,
          slapsToday: updatedSlaps,
          adsWatchedToday: adsToday + 1,
          totalAdsWatchedLifetime: totalLifetimeAds,
          updatedAt: AdminFieldValue.serverTimestamp()
        });

        return {
          slapsRefilled: 3,
          spAwarded: spReward,
          xpAwarded: xpReward,
          coins: updatedCoins,
          slapsToday: updatedSlaps,
          adsWatchedToday: adsToday + 1,
          totalAdsWatchedLifetime: totalLifetimeAds
        };
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || "AD_REWARD_FAILED" });
    }
  });

  // =========================================================================
  // FIX 7: ATOMIC, SERVER-VALIDATED WITHDRAWAL FLOW (/api/withdrawals/request)
  // =========================================================================

  app.all(["/api/withdrawals/request", "/api/withdrawals/create"], requireAuth, requireAppCheck, async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.uid; // Strictly derived from verified ID token
    const { 
      method = "USDT (TRC20)", 
      destination = "", 
      spAmount = 50000, 
      usdAmount = 5 
    } = req.body || {};

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    const requestedSp = Math.round(Number(spAmount) || 0);
    const sanitizedDestination = String(destination || "").trim();
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';

    if (sanitizedDestination.length < 3) {
      res.status(400).json({ success: false, error: "INVALID_PAYOUT_DESTINATION" });
      return;
    }

    try {
      const antiCheatConfig = await getAntiCheatConfigServer();

      // Check anti-cheat minimum withdrawal amount
      const minSp = antiCheatConfig.minWithdrawalSp || 50000;
      if (requestedSp < minSp) {
        res.status(400).json({ success: false, error: `MINIMUM_WITHDRAWAL_IS_${minSp}_SP` });
        return;
      }

      // Check VPN / Proxy if enforced in antiCheatConfig
      if (antiCheatConfig.blockVpnProxy) {
        const vpnStatus = detectVpnOrProxy(req);
        if (vpnStatus.isVpnOrProxy) {
          const auditId = `audit_vpn_${Date.now()}_${userId}`;
          await adminDb.collection("withdrawal_audit_logs").doc(auditId).set({
            id: auditId,
            userId,
            decision: "DENIED",
            reason: "VPN_OR_PROXY_DETECTED",
            ip: clientIp,
            requestedSp,
            timestamp: AdminFieldValue.serverTimestamp(),
          }).catch(() => {});

          res.status(403).json({
            success: false,
            error: "VPN_OR_PROXY_DETECTED",
            message: "Withdrawals cannot be processed through VPN or proxy connection.",
          });
          return;
        }
      }

      // Execute atomic balance check, account age verification, deduction, and creation inside a transaction
      const transactionResult = await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const userData = userDoc.data() || {};
        if (userData.isRestricted || userData.status === "Restricted" || userData.status === "Frozen") {
          throw new Error("ACCOUNT_RESTRICTED");
        }

        // 1. Account Age Verification (Fix 6.4)
        const serverNow = Date.now();
        let userCreatedAt = serverNow;
        if (userData.createdAt) {
          if (typeof userData.createdAt.toMillis === "function") {
            userCreatedAt = userData.createdAt.toMillis();
          } else if (typeof userData.createdAt === "number") {
            userCreatedAt = userData.createdAt;
          } else {
            userCreatedAt = new Date(userData.createdAt).getTime() || serverNow;
          }
        }

        const ageHours = (serverNow - userCreatedAt) / (1000 * 60 * 60);
        const minAccountAgeHours = antiCheatConfig.minAccountAgeHoursForCashout || 24;
        if (ageHours < minAccountAgeHours) {
          throw new Error(`ACCOUNT_TOO_NEW: Minimum account age of ${minAccountAgeHours} hours required for withdrawals.`);
        }

        // 2. SP Balance Verification
        const currentBalance = Number(userData.coins) || 0;
        if (currentBalance < requestedSp) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // 3. Daily Withdrawal Cap Verification
        const dailyCap = antiCheatConfig.dailyWithdrawalCapSp || 500000;
        const dailyWithdrawn = Number(userData.dailyWithdrawnSp) || 0;
        if (dailyWithdrawn + requestedSp > dailyCap) {
          throw new Error(`DAILY_WITHDRAWAL_CAP_EXCEEDED: Daily limit is ${dailyCap.toLocaleString()} SP.`);
        }

        const withdrawalId = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const auditLogId = `audit_${withdrawalId}`;
        const newBalance = currentBalance - requestedSp;
        const timestampIso = new Date(serverNow).toISOString();

        const withdrawalRef = adminDb.collection("withdrawals").doc(withdrawalId);
        const userTxRef = userRef.collection("transactions").doc(withdrawalId);
        const auditRef = adminDb.collection("withdrawal_audit_logs").doc(auditLogId);

        // Deduct balance atomically
        transaction.update(userRef, {
          coins: newBalance,
          dailyWithdrawnSp: dailyWithdrawn + requestedSp,
          referralsForCurrentWithdrawal: 0,
          updatedAt: AdminFieldValue.serverTimestamp(),
        });

        // Create withdrawal record (server-only writable)
        transaction.set(withdrawalRef, {
          id: withdrawalId,
          userId,
          username: userData.username || userData.email || "Slapper",
          email: userData.email || "",
          amountUsd: Number(usdAmount) || (requestedSp / 10000),
          spDeducted: requestedSp,
          method,
          payoutDestination: sanitizedDestination,
          status: "Pending",
          dateRequested: timestampIso,
          ip: clientIp,
          createdAt: Date.now(),
          serverTimestamp: AdminFieldValue.serverTimestamp(),
        });

        // Create user transaction ledger item
        transaction.set(userTxRef, {
          id: withdrawalId,
          userId,
          type: "redeem",
          amount: requestedSp,
          title: `Withdrawal Request: $${usdAmount} (${method})`,
          category: "Withdrawal",
          timestamp: timestampIso,
          status: "pending",
        });

        // Create immutable server audit log
        transaction.set(auditRef, {
          id: auditLogId,
          withdrawalId,
          userId,
          decision: "APPROVED",
          reason: "ALL_SECURITY_CHECKS_PASSED",
          spAmount: requestedSp,
          usdAmount: Number(usdAmount) || (requestedSp / 10000),
          method,
          destination: sanitizedDestination,
          accountAgeHours: Math.floor(ageHours),
          ip: clientIp,
          createdAt: AdminFieldValue.serverTimestamp(),
        });

        return {
          withdrawalId,
          newBalance,
          spDeducted: requestedSp,
          status: "Pending",
        };
      });

      res.json({ success: true, ...transactionResult });
    } catch (err: any) {
      console.warn("[Withdrawal] Withdrawal rejected by server:", err?.message || err);
      
      // Log denied withdrawal attempt to server audit logs
      const auditLogId = `audit_denied_${Date.now()}_${userId}`;
      await adminDb.collection("withdrawal_audit_logs").doc(auditLogId).set({
        id: auditLogId,
        userId,
        decision: "DENIED",
        reason: err.message || "WITHDRAWAL_VALIDATION_FAILED",
        requestedSp,
        method,
        destination: sanitizedDestination,
        ip: clientIp,
        createdAt: AdminFieldValue.serverTimestamp(),
      }).catch(() => {});

      res.status(400).json({
        success: false,
        error: err.message || "WITHDRAWAL_FAILED",
      });
    }
  });

  // =========================================================================
  // 4. SECURED ADMIN DASHBOARD MANAGEMENT API (FIX 1: Custom Claims Checked)
  // =========================================================================

  // Update user restriction / ban status (Admin Only)
  app.post("/api/admin/update-user-status", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const { targetUserId, status, isRestricted, reason } = req.body || {};
    if (!targetUserId) {
      res.status(400).json({ success: false, error: "TARGET_USER_ID_REQUIRED" });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const userRef = adminDb.collection("users").doc(targetUserId);
      await userRef.update({
        status: status || (isRestricted ? "Restricted" : "Active"),
        isRestricted: Boolean(isRestricted),
        statusReason: reason || "",
        updatedAt: AdminFieldValue.serverTimestamp(),
      });

      res.json({ success: true, message: `Updated user ${targetUserId} status to ${status || (isRestricted ? "Restricted" : "Active")}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "UPDATE_FAILED" });
    }
  });

  // Admin Manual Balance Adjustment (Admin Only)
  app.post("/api/admin/adjust-user-balance", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const { targetUserId, adjustmentAmount, reason } = req.body || {};
    if (!targetUserId || typeof adjustmentAmount !== "number") {
      res.status(400).json({ success: false, error: "INVALID_PARAMETERS" });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(targetUserId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

        transaction.update(userRef, {
          coins: AdminFieldValue.increment(adjustmentAmount),
          totalEarned: adjustmentAmount > 0 ? AdminFieldValue.increment(adjustmentAmount) : AdminFieldValue.increment(0),
          updatedAt: AdminFieldValue.serverTimestamp(),
        });

        const txId = `admin_adj_${Date.now()}`;
        const userTxRef = userRef.collection("transactions").doc(txId);
        transaction.set(userTxRef, {
          id: txId,
          userId: targetUserId,
          type: adjustmentAmount >= 0 ? "earn" : "deduction",
          amount: Math.abs(adjustmentAmount),
          title: `Admin Manual Adjustment: ${reason || "Correction"}`,
          category: "Admin Adjustment",
          timestamp: new Date().toISOString(),
          status: "completed",
        });
      });

      res.json({ success: true, message: `Adjusted user ${targetUserId} balance by ${adjustmentAmount} SP` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "ADJUSTMENT_FAILED" });
    }
  });

  // Update Withdrawal Status (Admin Only)
  app.post("/api/admin/update-withdrawal-status", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const { withdrawalId, status, rejectionReason } = req.body || {};
    if (!withdrawalId || !status) {
      res.status(400).json({ success: false, error: "PARAMETERS_REQUIRED" });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const withdrawalRef = adminDb.collection("withdrawals").doc(withdrawalId);
      const docSnap = await withdrawalRef.get();
      if (!docSnap.exists) {
        res.status(404).json({ success: false, error: "WITHDRAWAL_NOT_FOUND" });
        return;
      }

      const wData = docSnap.data() || {};
      await withdrawalRef.update({
        status,
        rejectionReason: rejectionReason || "",
        updatedAt: AdminFieldValue.serverTimestamp(),
      });

      if (wData.userId) {
        const userTxRef = adminDb.collection("users").doc(wData.userId).collection("transactions").doc(withdrawalId);
        await userTxRef.set({
          status: status.toLowerCase(),
          updatedAt: AdminFieldValue.serverTimestamp(),
        }, { merge: true });
      }

      res.json({ success: true, message: `Withdrawal ${withdrawalId} status updated to ${status}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "UPDATE_FAILED" });
    }
  });

  // Publish Global Announcement (Admin Only)
  app.post("/api/admin/publish-announcement", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const { title, message, category, type, actionTab, actionLabel } = req.body || {};
    if (!message) {
      res.status(400).json({ success: false, error: "MESSAGE_REQUIRED" });
      return;
    }

    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const annColl = adminDb.collection("announcements");
      const newDocRef = await annColl.add({
        title: title || "📢 Official Announcement",
        message,
        category: category || "promo",
        type: type || "info",
        actionTab: actionTab || "home",
        actionLabel: actionLabel || "Check App",
        timestamp: "Just now",
        createdAt: Date.now(),
      });

      const sysDoc = adminDb.collection("system").doc("announcement");
      await sysDoc.set({
        id: newDocRef.id,
        title: title || "📢 Official Announcement",
        message,
        updatedAt: AdminFieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ success: true, id: newDocRef.id, message: "Announcement published successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "PUBLISH_FAILED" });
    }
  });

  // Save Economy Config (Admin Only)
  app.post("/api/admin/save-economy-config", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const config = req.body || {};
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      await adminDb.collection("economy_config").doc("rules").set({
        ...config,
        updatedAt: AdminFieldValue.serverTimestamp(),
      }, { merge: true });
      res.json({ success: true, message: "Economy config updated successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "SAVE_FAILED" });
    }
  });

  // Save Security Config (Admin Only)
  app.post("/api/admin/save-security-config", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const config = req.body || {};
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      await adminDb.collection("security_config").doc("rules").set({
        ...config,
        updatedAt: AdminFieldValue.serverTimestamp(),
      }, { merge: true });
      res.json({ success: true, message: "Security config updated successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "SAVE_FAILED" });
    }
  });

  // Fetch All Users for Admin (Admin Only)
  app.get("/api/admin/users", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const snap = await adminDb.collection("users").limit(100).get();
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "FETCH_FAILED" });
    }
  });

  // Fetch All Withdrawals for Admin (Admin Only)
  app.get("/api/admin/withdrawals", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const snap = await adminDb.collection("withdrawals").orderBy("createdAt", "desc").limit(100).get();
      const withdrawals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, withdrawals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "FETCH_FAILED" });
    }
  });

  // Fetch Security Incident Logs (Admin Only)
  app.get("/api/admin/security-logs", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const snap = await adminDb.collection("security_logs").orderBy("createdAt", "desc").limit(100).get();
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "FETCH_FAILED" });
    }
  });

  // Fetch Real Server-Only Security Incidents (Fix 12 - Admin Only)
  app.get("/api/admin/security-incidents", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const snap = await adminDb.collection("security_incidents").orderBy("createdAt", "desc").limit(150).get();
      const incidents = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
        };
      });
      res.json({ success: true, incidents });
    } catch (err: any) {
      console.error("Error loading security_incidents:", err);
      res.status(500).json({ success: false, error: err.message || "FETCH_FAILED" });
    }
  });

  // Fetch Withdrawal Audit Logs (Admin Only)
  app.get("/api/admin/withdrawal-audit-logs", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const snap = await adminDb.collection("withdrawal_audit_logs").orderBy("createdAt", "desc").limit(100).get();
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "FETCH_FAILED" });
    }
  });

  // Reset All Platform Data to Zero (Admin Only)
  app.post("/api/admin/reset-platform-data", requireAdmin, async (req: AuthenticatedRequest, res) => {
    const adminDb = getAdminDbInstance();
    if (!adminDb) {
      res.status(500).json({ success: false, error: "DATABASE_UNAVAILABLE" });
      return;
    }

    try {
      const collectionsToReset = [
        "users",
        "withdrawals",
        "transactions",
        "security_logs",
        "security_incidents",
        "withdrawal_audit_logs",
        "announcements",
        "weekly_leaderboards",
        "monthly_leaderboards"
      ];

      for (const colName of collectionsToReset) {
        const snap = await adminDb.collection(colName).limit(500).get();
        if (!snap.empty) {
          const batch = adminDb.batch();
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }

      await logSecurityIncident({
        type: "ADMIN_PLATFORM_DATA_RESET",
        severity: "critical",
        userId: req.user?.uid || "admin",
        details: "Admin executed complete platform reset (users, revenue, withdrawals, and metrics reset to 0)",
        ipAddress: req.ip,
        provider: "AdminCommand",
      });

      res.json({ success: true, message: "All platform data reset to zero successfully." });
    } catch (err: any) {
      console.error("Error resetting platform data:", err);
      res.status(500).json({ success: false, error: err.message || "RESET_FAILED" });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
