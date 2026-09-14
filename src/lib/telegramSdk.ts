/**
 * Telegram Mini App helpers (client side).
 *
 * `https://telegram.org/js/telegram-web-app.js` (loaded in index.html) always
 * defines `window.Telegram.WebApp`, even in a plain browser where
 * `platform === 'unknown'`. Everything in here is therefore defensive: outside
 * Telegram the app simply behaves like a normal web app.
 *
 * Authentication itself NEVER relies on this file's "unsafe" values — the raw
 * `initData` string is forwarded to the API, which validates the signature with
 * the bot token before issuing a Firebase session.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface TelegramWebAppInitDataUnsafe {
  user?: TelegramWebAppUser;
  start_param?: string;
  auth_date?: number;
  hash?: string;
  query_id?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitDataUnsafe;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded?: boolean;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
    TelegramWebviewProxy?: unknown;
  }
}

/**
 * `initData` is captured the first time this module is evaluated: Telegram Web
 * injects it through the URL hash, and later `history.pushState` navigations
 * inside the SPA must not lose it.
 */
const capturedInitData: string = (() => {
  try {
    return window.Telegram?.WebApp?.initData || '';
  } catch {
    return '';
  }
})();

export function getTelegramWebApp(): TelegramWebApp | null {
  try {
    return window.Telegram?.WebApp || null;
  } catch {
    return null;
  }
}

/** Raw, signed payload string — send this to the API for verification. */
export function getTelegramInitData(): string {
  const live = getTelegramWebApp()?.initData;
  return (live && live.length > 0 ? live : capturedInitData) || '';
}

export function getTelegramUnsafeUser(): TelegramWebAppUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user || null;
}

export function getTelegramStartParam(): string | null {
  const fromUnsafe = getTelegramWebApp()?.initDataUnsafe?.start_param;
  if (fromUnsafe) return fromUnsafe;
  const initData = getTelegramInitData();
  if (!initData) return null;
  try {
    return new URLSearchParams(initData).get('start_param');
  } catch {
    return null;
  }
}

/**
 * True only when the app is really running inside Telegram (Mini App / Web).
 */
export function isTelegramEnvironment(): boolean {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;
  if ((webApp.platform || '').toLowerCase() === 'unknown') return false;
  return Boolean(getTelegramInitData()) || Boolean(window.TelegramWebviewProxy);
}

/** Display name that can be used before verification completes. */
export function getTelegramDisplayName(): string | null {
  const user = getTelegramUnsafeUser();
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.username || null;
}

function versionAtLeast(target: [number, number]): boolean {
  const version = getTelegramWebApp()?.version || '6.0';
  const [major = 0, minor = 0] = version.split('.').map((part) => Number(part) || 0);
  return major > target[0] || (major === target[0] && minor >= target[1]);
}

/**
 * Telegram was rendering the Mini App in a short, chrome-padded viewport, which
 * looks wrong for a full-screen game. Expanding + matching the Telegram chrome
 * colours + disabling vertical swipes (they close the app while slapping) is all
 * we need for the game to feel native.
 */
export function initTelegramChrome(): void {
  const webApp = getTelegramWebApp();
  if (!webApp || !isTelegramEnvironment()) return;

  const run = (fn?: () => void) => {
    try {
      fn?.();
    } catch {
      /* older clients simply do not support every method */
    }
  };

  run(() => webApp.ready?.());
  run(() => webApp.expand?.());
  run(() => webApp.setHeaderColor?.('#FDFBF2'));
  run(() => webApp.setBackgroundColor?.('#FDFBF2'));

  if (versionAtLeast([7, 7])) {
    run(() => webApp.disableVerticalSwipes?.());
  }
}

/**
 * Telegram Login Widget payload, if the operator ever hosts the widget and
 * redirects to the app with `?id=...&hash=...`. Verified server-side.
 */
export function getTelegramLoginWidgetPayload(): Record<string, string> | null {
  if (isTelegramEnvironment()) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const hash = params.get('hash');
    const authDate = params.get('auth_date');
    if (!id || !hash || !authDate) return null;

    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  } catch {
    return null;
  }
}
