import crypto from 'crypto';

/**
 * Telegram authentication helpers (SERVER ONLY — uses node:crypto).
 *
 * SlapEarn is designed to run as a Telegram Mini App, so there is **no sign-up
 * form**: identity comes from Telegram itself.
 *
 * Two supported Telegram flows are implemented here:
 *
 *  1. Mini App `initData` (the normal case)
 *     secret_key      = HMAC_SHA256("WebAppData", bot_token)
 *     data_check_str  = every field except `hash` (+ usually `signature`),
 *                       sorted alphabetically, joined with "\n" as `key=value`
 *     expected        = hex(HMAC_SHA256(data_check_str, secret_key))
 *     docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *  2. Telegram Login Widget payload (website flow, `id`/`first_name`/`hash`...)
 *     secret_key      = SHA256(bot_token)
 *     expected        = hex(HMAC_SHA256(data_check_str, secret_key))
 *     docs: https://core.telegram.org/widgets/login#checking-authorization
 *
 * NOTE: values are hashed using Node's `crypto` so this file must never be
 * imported from client-side code.
 */

export interface TelegramUserProfile {
  id: string;
  firstName: string;
  lastName?: string;
  /** @handle, without the leading @ */
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export interface TelegramAuthResult {
  /** true only when the payload carried a valid Telegram signature */
  verified: boolean;
  profile: TelegramUserProfile | null;
  startParam?: string;
  authDate?: number;
  reason?: TelegramAuthFailureReason;
  message?: string;
}

export type TelegramAuthFailureReason =
  | 'TELEGRAM_NOT_CONFIGURED'
  | 'MISSING_INIT_DATA'
  | 'MISSING_HASH'
  | 'HASH_MISMATCH'
  | 'MISSING_USER'
  | 'AUTH_DATE_EXPIRED'
  | 'AUTH_DATE_IN_FUTURE';

const WEB_APP_DATA_CONSTANT = 'WebAppData';

/** Bot token from the environment (BotFather). */
export function getTelegramBotToken(): string | null {
  const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_API_TOKEN || '').trim();
  return token.length > 0 ? token : null;
}

export function isTelegramConfigured(): boolean {
  return getTelegramBotToken() !== null;
}

/**
 * Whether unsigned (unverified) Telegram payloads may be trusted.
 *
 * This exists so the app is playable *before* the bot token is wired in.
 * It is intentionally impossible to enable silently in production: either the
 * token is missing, or the operator opted in explicitly with
 * TELEGRAM_ALLOW_UNVERIFIED=true.
 */
export function allowUnverifiedTelegramPayloads(): boolean {
  const explicit = (process.env.TELEGRAM_ALLOW_UNVERIFIED || '').trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return getTelegramBotToken() === null;
}

/** Max age of `auth_date` before the payload is rejected (default 24h). */
export function telegramMaxAgeSeconds(): number {
  const parsed = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 86400;
}

/** Constant-time comparison of two hex digests. */
function safeEqualHex(left: string, right: string): boolean {
  if (!left || !right) return false;
  let leftBuf: Buffer;
  let rightBuf: Buffer;
  try {
    leftBuf = Buffer.from(left, 'hex');
    rightBuf = Buffer.from(right, 'hex');
  } catch {
    return false;
  }
  if (leftBuf.length === 0 || leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function hmacSha256Hex(key: crypto.BinaryLike, value: string): string {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

function sha256Raw(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

/** Values that arrive as JSON objects/complex data are serialized */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Builds the Telegram data-check-string.
 * `key=value` pairs sorted alphabetically and joined by "\n".
 */
function buildDataCheckString(pairs: Array<[string, string]>, excluded: string[]): string {
  return pairs
    .filter(([key]) => !excluded.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
}

/**
 * Telegram is not 100% consistent about how values are escaped when the hash is
 * produced (URLSearchParams re-decodes `%20`/`+`, etc.). We therefore accept a
 * small set of equivalent data-check-strings — every candidate still requires a
 * valid HMAC of the bot token, so this does not weaken the signature check.
 */
function initDataCandidates(initData: string): string[] {
  const params = new URLSearchParams(initData);
  const decodedPairs = Array.from(params.entries());

  const candidates = new Set<string>([
    buildDataCheckString(decodedPairs, ['hash', 'signature']),
    buildDataCheckString(decodedPairs, ['hash']),
  ]);

  // Raw (still URL-encoded) chunks as Telegram sent them.
  const rawChunks = initData
    .split('&')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .filter((chunk) => !chunk.startsWith('hash=') && !chunk.startsWith('signature='));
  if (rawChunks.length > 0) {
    candidates.add([...rawChunks].sort().join('\n'));
  }

  return Array.from(candidates).filter((value) => value.length > 0);
}

function parseTelegramUserField(rawUser: string | null): TelegramUserProfile | null {
  if (!rawUser) return null;
  try {
    const parsed = JSON.parse(rawUser);
    return toProfileFromObject(parsed);
  } catch {
    return null;
  }
}

function toProfileFromObject(source: Record<string, any> | null | undefined): TelegramUserProfile | null {
  if (!source) return null;
  const rawId = source.id ?? source.user_id;
  if (rawId === undefined || rawId === null || `${rawId}`.trim() === '') return null;

  const firstName = typeof source.first_name === 'string' ? source.first_name : '';
  const lastName = typeof source.last_name === 'string' ? source.last_name : '';

  return {
    id: String(rawId).trim(),
    firstName: firstName || (typeof source.username === 'string' ? source.username : '') || 'Slapper',
    lastName: lastName || undefined,
    username: typeof source.username === 'string' && source.username ? source.username : undefined,
    photoUrl: typeof source.photo_url === 'string' && source.photo_url ? source.photo_url : undefined,
    languageCode: typeof source.language_code === 'string' ? source.language_code : undefined,
    isPremium: typeof source.is_premium === 'boolean' ? source.is_premium : undefined,
  };
}

export interface VerifyInitDataOptions {
  botToken?: string | null;
  maxAgeSeconds?: number;
  /** injected for tests */
  nowSeconds?: number;
}

/**
 * Verifies a Telegram Mini App `initData` query string.
 * Returns `verified: false` (never throws) when the signature cannot be trusted.
 */
export function verifyTelegramInitData(
  initData: string,
  options: VerifyInitDataOptions = {}
): TelegramAuthResult {
  if (!initData || typeof initData !== 'string') {
    return { verified: false, profile: null, reason: 'MISSING_INIT_DATA', message: 'No Telegram init data supplied.' };
  }

  const params = new URLSearchParams(initData);
  const providedHash = (params.get('hash') || '').trim();
  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw && Number.isFinite(Number(authDateRaw)) ? Number(authDateRaw) : undefined;
  const startParam = params.get('start_param') || undefined;
  const profile = parseTelegramUserField(params.get('user'));

  const base = { profile, startParam, authDate };

  const botToken = options.botToken === undefined ? getTelegramBotToken() : options.botToken;
  if (!botToken) {
    return {
      ...base,
      verified: false,
      reason: 'TELEGRAM_NOT_CONFIGURED',
      message: 'TELEGRAM_BOT_TOKEN is not configured — Telegram identity cannot be verified.',
    };
  }

  if (!providedHash) {
    return { ...base, verified: false, reason: 'MISSING_HASH', message: 'Telegram init data has no signature hash.' };
  }

  const secretKey = crypto.createHmac('sha256', WEB_APP_DATA_CONSTANT).update(botToken, 'utf8').digest();
  const matched = initDataCandidates(initData).some((candidate) =>
    safeEqualHex(hmacSha256Hex(secretKey, candidate), providedHash)
  );

  if (!matched) {
    return { ...base, verified: false, reason: 'HASH_MISMATCH', message: 'Telegram signature check failed.' };
  }

  const freshness = checkAuthDate(authDate, options.maxAgeSeconds, options.nowSeconds);
  if (freshness) return { ...base, verified: false, reason: freshness.reason, message: freshness.message };

  if (!profile) {
    return { ...base, verified: false, reason: 'MISSING_USER', message: 'Telegram init data has no user payload.' };
  }

  return { ...base, verified: true };
}

function checkAuthDate(
  authDate: number | undefined,
  maxAgeSeconds: number | undefined,
  nowSeconds?: number
): { reason: TelegramAuthFailureReason; message: string } | null {
  if (!authDate || !Number.isFinite(authDate)) return null; // older payloads without auth_date
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAge = maxAgeSeconds ?? telegramMaxAgeSeconds();

  if (authDate > now + 300) {
    return { reason: 'AUTH_DATE_IN_FUTURE', message: 'Telegram payload is dated in the future.' };
  }
  if (maxAge > 0 && now - authDate > maxAge) {
    return {
      reason: 'AUTH_DATE_EXPIRED',
      message: `Telegram payload is older than ${maxAge}s. Re-open the Mini App from Telegram.`,
    };
  }
  return null;
}

/**
 * Verifies a Telegram Login Widget payload (plain object of query params).
 */
export function verifyTelegramLoginWidget(
  data: Record<string, unknown> | null | undefined,
  options: VerifyInitDataOptions = {}
): TelegramAuthResult {
  if (!data || typeof data !== 'object') {
    return { verified: false, profile: null, reason: 'MISSING_INIT_DATA', message: 'No Telegram login payload supplied.' };
  }

  const providedHash = normalizeValue(data.hash).trim();
  const pairs: Array<[string, string]> = Object.entries(data)
    .filter(([key]) => key !== 'hash')
    .map(([key, value]) => [key, normalizeValue(value)]);

  const authDate = Number(data.auth_date);
  const profile = toProfileFromObject(data as Record<string, any>);
  const base = { profile, authDate: Number.isFinite(authDate) ? authDate : undefined };

  const botToken = options.botToken === undefined ? getTelegramBotToken() : options.botToken;
  if (!botToken) {
    return {
      ...base,
      verified: false,
      reason: 'TELEGRAM_NOT_CONFIGURED',
      message: 'TELEGRAM_BOT_TOKEN is not configured — Telegram identity cannot be verified.',
    };
  }
  if (!providedHash) {
    return { ...base, verified: false, reason: 'MISSING_HASH', message: 'Telegram login payload has no hash.' };
  }

  const secretKey = sha256Raw(botToken);
  const dataCheckString = pairs.map(([key, value]) => `${key}=${value}`).sort().join('\n');
  if (!safeEqualHex(hmacSha256Hex(secretKey, dataCheckString), providedHash)) {
    return { ...base, verified: false, reason: 'HASH_MISMATCH', message: 'Telegram login signature check failed.' };
  }

  const freshness = checkAuthDate(base.authDate, options.maxAgeSeconds, options.nowSeconds);
  if (freshness) return { ...base, verified: false, reason: freshness.reason, message: freshness.message };

  if (!profile) {
    return { ...base, verified: false, reason: 'MISSING_USER', message: 'Telegram login payload has no user id.' };
  }

  return { ...base, verified: true };
}

/**
 * Safe, deterministic SlapEarn username derived from a Telegram profile.
 * Telegram handles change, so the account is keyed by the numeric id, never the handle.
 */
export function deriveTelegramUsername(profile: TelegramUserProfile): string {
  const handle = (profile.username || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (handle && handle.length >= 3) return handle.slice(0, 20);

  const first = (profile.firstName || '').replace(/[^a-zA-Z0-9]/g, '');
  if (first) return `${first.slice(0, 14)}${profile.id.slice(-4)}`;

  return `slapper${profile.id.slice(-6)}`;
}
