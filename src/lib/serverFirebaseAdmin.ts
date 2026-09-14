import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, Auth as AdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Firestore as AdminFirestore, FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
import { getAppCheck as getAdminAppCheck, AppCheck as AdminAppCheck } from 'firebase-admin/app-check';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Safely read firebase configuration
function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Notice: Could not read firebase-applet-config.json:', err);
  }
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'slapearn',
    firestoreDatabaseId: '(default)',
  };
}

let cachedAdminApp: App | null = null;

export function getAdminAppInstance(): App {
  if (cachedAdminApp) return cachedAdminApp;

  const existingApps = getAdminApps();
  if (existingApps.length > 0) {
    cachedAdminApp = existingApps[0] as App;
    return cachedAdminApp;
  }

  const config = getFirebaseConfig();
  cachedAdminApp = initAdminApp({
    projectId: config.projectId,
  });
  return cachedAdminApp;
}

export function getAdminAuthInstance(): AdminAuth {
  const app = getAdminAppInstance();
  return getAdminAuth(app);
}

export function getAdminDbInstance(): AdminFirestore {
  const app = getAdminAppInstance();
  const config = getFirebaseConfig();
  return getAdminFirestore(app, config.firestoreDatabaseId || '(default)');
}

export function getAdminAppCheckInstance(): AdminAppCheck {
  const app = getAdminAppInstance();
  return getAdminAppCheck(app);
}

export { AdminFieldValue };

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  admin?: boolean;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  appCheckToken?: string;
  deviceFingerprint?: string;
  clientIp?: string;
}

/**
 * Extracts and verifies Firebase ID Token from Authorization header (Bearer <token>)
 */
export async function verifyFirebaseTokenFromReq(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return null;

  try {
    const adminAuth = getAdminAuthInstance();
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: Boolean(decodedToken.admin),
      ...decodedToken,
    };
  } catch (err) {
    console.warn('[AdminAuth] Invalid or expired Firebase ID token:', err);
    return null;
  }
}

/**
 * Extracts and verifies Firebase App Check token
 */
export async function verifyAppCheckFromReq(req: Request): Promise<{ isValid: boolean; appId?: string; error?: string }> {
  const appCheckToken = (req.headers['x-firebase-appcheck'] as string) || (req.headers['x-app-check-token'] as string);
  
  if (!appCheckToken) {
    // If not provided in development / sandbox mode, pass with notice
    return { isValid: process.env.NODE_ENV !== 'production', error: 'MISSING_APP_CHECK_TOKEN' };
  }

  try {
    const appCheck = getAdminAppCheckInstance();
    const appCheckClaims = await appCheck.verifyToken(appCheckToken);
    return { isValid: true, appId: appCheckClaims.appId };
  } catch (err: any) {
    console.warn('[AppCheck] App Check token verification notice:', err?.message || err);
    // If running in development sandbox or with debug token, allow graceful passage
    if (process.env.NODE_ENV !== 'production' || appCheckToken.startsWith('debug_')) {
      return { isValid: true, appId: 'debug-app-id' };
    }
    return { isValid: false, error: err?.message || 'INVALID_APP_CHECK_TOKEN' };
  }
}

/**
 * Express Middleware: Requires verified Firebase Authentication
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = await verifyFirebaseTokenFromReq(req);
  if (!user) {
    res.status(401).json({
      success: false,
      eligible: false,
      error: 'UNAUTHORIZED',
      message: 'Valid Firebase authentication token required.',
    });
    return;
  }
  req.user = user;
  next();
}

/**
 * Express Middleware: Optional/Enforced Firebase App Check verification
 */
export async function requireAppCheck(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const checkResult = await verifyAppCheckFromReq(req);
  if (!checkResult.isValid && process.env.ENFORCE_APP_CHECK === 'true') {
    res.status(403).json({
      success: false,
      eligible: false,
      error: 'APP_CHECK_FAILED',
      message: 'App Check token is invalid or missing.',
    });
    return;
  }
  next();
}

/**
 * Express Middleware: Requires Firebase custom claim `admin: true` OR a secure secret key header
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check optional server-to-server admin secret with constant-time comparison
  const adminSecretHeader = req.headers['x-admin-secret'] as string | undefined;
  const configuredSecret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_CRON_SECRET;

  if (adminSecretHeader && configuredSecret) {
    try {
      const headerBuf = Buffer.from(adminSecretHeader);
      const secretBuf = Buffer.from(configuredSecret);
      if (headerBuf.length === secretBuf.length && crypto.timingSafeEqual(headerBuf, secretBuf)) {
        req.user = { uid: 'system-admin-service', admin: true };
        return next();
      }
    } catch {
      // fallback to token check
    }
  }

  const user = await verifyFirebaseTokenFromReq(req);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token required.',
    });
    return;
  }

  if (!user.admin) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Admin authorization required. Custom claim { admin: true } missing.',
    });
    return;
  }

  req.user = user;
  next();
}

// =========================================================================
// ANTI-CHEAT & RATE LIMITING INFRASTRUCTURE (FIX 4, 5, 6, 7)
// =========================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const uidRateLimits = new Map<string, RateLimitEntry>();
const tapTimestampsPerUid = new Map<string, number[]>();

/**
 * Per-UID Rate Limiting (Fix 4: Prevents hammering endpoints)
 */
export function checkRateLimit(uid: string, limit = 30, windowMs = 60000): boolean {
  if (!uid) return false;
  const now = Date.now();
  const entry = uidRateLimits.get(uid);

  if (!entry || now > entry.resetAt) {
    uidRateLimits.set(uid, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Track taps per UID to enforce maxCpsThreshold (Fix 6.2)
 */
export function recordTapAndCheckCps(uid: string, maxCps = 12): { allowed: boolean; currentCps: number } {
  if (!uid) return { allowed: false, currentCps: 0 };
  const now = Date.now();
  let taps = tapTimestampsPerUid.get(uid) || [];

  // Filter out taps older than 1000ms
  taps = taps.filter(t => now - t <= 1000);
  taps.push(now);
  tapTimestampsPerUid.set(uid, taps);

  const currentCps = taps.length;
  if (currentCps > maxCps) {
    return { allowed: false, currentCps };
  }

  return { allowed: true, currentCps };
}

/**
 * VPN / Proxy detection heuristic (Fix 6.5)
 */
export function detectVpnOrProxy(req: Request): { isVpnOrProxy: boolean; ip: string; reason?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';

  if (
    req.headers['x-tor-exit'] || 
    req.headers['x-anonymous-proxy'] || 
    req.headers['x-varnish'] ||
    req.headers['proxy-connection']
  ) {
    return { isVpnOrProxy: true, ip, reason: 'Proxy/TOR header signature detected' };
  }

  return { isVpnOrProxy: false, ip };
}

/**
 * Multi-factor server-derived device fingerprint (Fix 5.3)
 * Combines client IP subnet, user-agent, App Check attestation, and client entropy
 */
export function computeDeviceFingerprint(req: Request, clientFingerprint?: string): { fingerprint: string; ip: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown-ua';
  const appCheckToken = (req.headers['x-firebase-appcheck'] as string) || '';

  // Extract IP subnet (e.g. 192.168.1) to group localized network devices
  const ipSubnet = rawIp.split('.').slice(0, 3).join('.');
  const combined = `${ipSubnet}|${userAgent}|${clientFingerprint || 'anon'}|${appCheckToken.slice(0, 16)}`;
  const fingerprint = crypto.createHash('sha256').update(combined).digest('hex').slice(0, 32);

  return { fingerprint, ip: rawIp };
}

// =========================================================================
// SERVER-SIDE ANTI-CHEAT CONFIG (FIX 6.1)
// =========================================================================

export interface AntiCheatConfig {
  maxCpsThreshold: number;
  blockVpnProxy: boolean;
  maxAccountsPerDevice: number;
  enforceServerClock: boolean;
  minAccountAgeHoursForCashout: number;
  dailyWithdrawalCapSp: number;
  minWithdrawalSp: number;
  referralsRequiredForCashout: number;
  updatedAt?: string;
}

export const DEFAULT_ANTI_CHEAT_CONFIG: AntiCheatConfig = {
  maxCpsThreshold: 12,
  blockVpnProxy: true,
  maxAccountsPerDevice: 2,
  enforceServerClock: true,
  minAccountAgeHoursForCashout: 24,
  dailyWithdrawalCapSp: 500000,
  minWithdrawalSp: 50000,
  referralsRequiredForCashout: 0,
};

let cachedAntiCheatConfig: AntiCheatConfig | null = null;
let lastAntiCheatConfigFetch = 0;

/**
 * Read anti-cheat configuration from Firestore server-only collection `server_config/anti_cheat`
 */
export async function getAntiCheatConfigServer(): Promise<AntiCheatConfig> {
  const now = Date.now();
  if (cachedAntiCheatConfig && now - lastAntiCheatConfigFetch < 30000) {
    return cachedAntiCheatConfig;
  }

  const adminDb = getAdminDbInstance();
  if (!adminDb) return DEFAULT_ANTI_CHEAT_CONFIG;

  try {
    const docRef = adminDb.collection('server_config').doc('anti_cheat');
    const snap = await docRef.get();
    if (snap.exists) {
      cachedAntiCheatConfig = { ...DEFAULT_ANTI_CHEAT_CONFIG, ...(snap.data() as Partial<AntiCheatConfig>) };
    } else {
      await docRef.set({
        ...DEFAULT_ANTI_CHEAT_CONFIG,
        createdAt: AdminFieldValue.serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });
      cachedAntiCheatConfig = DEFAULT_ANTI_CHEAT_CONFIG;
    }
    lastAntiCheatConfigFetch = now;
    return cachedAntiCheatConfig;
  } catch (err) {
    console.warn('[AntiCheat] Could not read server_config/anti_cheat from Firestore, using default:', err);
    return DEFAULT_ANTI_CHEAT_CONFIG;
  }
}

/**
 * Update anti-cheat configuration in Firestore (Admin only)
 */
export async function updateAntiCheatConfigServer(updates: Partial<AntiCheatConfig>): Promise<AntiCheatConfig> {
  const adminDb = getAdminDbInstance();
  if (!adminDb) throw new Error('DATABASE_UNAVAILABLE');

  const current = await getAntiCheatConfigServer();
  const merged: AntiCheatConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const docRef = adminDb.collection('server_config').doc('anti_cheat');
  await docRef.set(merged, { merge: true });

  cachedAntiCheatConfig = merged;
  lastAntiCheatConfigFetch = Date.now();
  return merged;
}

// =========================================================================
// SECURITY INCIDENT LOGGER (FIX 12)
// =========================================================================

export interface SecurityIncident {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  username?: string;
  details: string;
  ipAddress?: string;
  deviceId?: string;
  appCheckStatus?: string;
  provider?: string;
  status: 'unresolved' | 'investigating' | 'resolved' | 'dismissed';
  metadata?: Record<string, any>;
  createdAt: any;
}

/**
 * Server-only logger for security events into Firestore `security_incidents` (Fix 12)
 */
export async function logSecurityIncident(incident: {
  type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  username?: string;
  details: string;
  ipAddress?: string;
  deviceId?: string;
  appCheckStatus?: string;
  provider?: string;
  metadata?: Record<string, any>;
}): Promise<string | null> {
  const adminDb = getAdminDbInstance();
  if (!adminDb) return null;
  try {
    const docRef = await adminDb.collection('security_incidents').add({
      type: incident.type,
      severity: incident.severity || 'medium',
      userId: incident.userId || 'anonymous',
      username: incident.username || 'unknown',
      details: incident.details,
      ipAddress: incident.ipAddress || 'unknown',
      deviceId: incident.deviceId || 'unknown',
      appCheckStatus: incident.appCheckStatus || 'unknown',
      provider: incident.provider || 'system',
      status: 'unresolved',
      metadata: incident.metadata || {},
      createdAt: AdminFieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('[SecurityIncident] Logging failed:', err);
    return null;
  }
}

// =========================================================================
// AUTH RATE LIMITING & ABUSE PROTECTION (FIX 13)
// =========================================================================

interface AuthAttemptRecord {
  attempts: number;
  lockoutUntil: number;
}
const authAttemptsMap = new Map<string, AuthAttemptRecord>();

export function checkAuthAttemptRateLimit(identifier: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const now = Date.now();
  const record = authAttemptsMap.get(identifier);
  if (!record) {
    return { allowed: true };
  }
  if (record.lockoutUntil > now) {
    return {
      allowed: false,
      remainingLockoutSeconds: Math.ceil((record.lockoutUntil - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordAuthAttempt(identifier: string, success: boolean): void {
  const now = Date.now();
  const record = authAttemptsMap.get(identifier) || { attempts: 0, lockoutUntil: 0 };
  if (success) {
    authAttemptsMap.delete(identifier);
    return;
  }
  record.attempts += 1;
  if (record.attempts >= 5) {
    // 15 minutes lockout
    record.lockoutUntil = now + 15 * 60 * 1000;
  } else if (record.attempts >= 3) {
    // 2 minutes progressive delay
    record.lockoutUntil = now + 2 * 60 * 1000;
  }
  authAttemptsMap.set(identifier, record);
}
