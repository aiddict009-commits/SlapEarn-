// Central Time Manager: Single Authoritative Server-Time Engine for SlapEarn
// Uses server timestamp + monotonic performance.now() elapsed time.
// Immune to device clock changes, phone date adjustments, and timezone offsets (e.g. UTC+2 in Zambia/South Africa).

export interface TimeSyncState {
  isSynced: boolean;
  isOfflineFallback: boolean;
  isStale: boolean;
  lastSyncTimestamp: number;
  serverTime: number;
  isWarningVisible: boolean;
  errorMessage: string | null;
}

export type TimeSyncListener = (state: TimeSyncState) => void;

interface CachedServerTime {
  serverTimeAtSync: number;
  savedAtMs: number;
}

class CentralTimeManager {
  // Monotonic baselines: immune to OS clock manipulation
  private baseServerTime: number = 0;
  private basePerfNow: number = performance.now();
  private isSynced: boolean = false;
  private isOfflineFallback: boolean = false;
  private isWarningDismissed: boolean = false;
  private lastSyncTimestamp: number = 0;
  private errorMessage: string | null = null;

  private listeners: Set<TimeSyncListener> = new Set();
  private syncPromise: Promise<number> | null = null;
  private periodicSyncInterval: number | null = null;

  constructor() {
    this.loadCachedServerTime();
    this.initNetworkListener();
  }

  /**
   * Load previously saved server time with elapsed-offset restoration
   */
  private loadCachedServerTime() {
    try {
      const cachedRaw = localStorage.getItem('slapearn_server_time_cache') || localStorage.getItem('slapearn_last_known_server_time');
      if (cachedRaw) {
        let cached: CachedServerTime | null = null;
        if (cachedRaw.startsWith('{')) {
          cached = JSON.parse(cachedRaw);
        } else {
          const parsed = parseInt(cachedRaw, 10);
          if (!isNaN(parsed) && parsed > 1700000000000) {
            cached = { serverTimeAtSync: parsed, savedAtMs: Date.now() };
          }
        }

        if (cached && typeof cached.serverTimeAtSync === 'number' && typeof cached.savedAtMs === 'number') {
          const cacheAge = Date.now() - cached.savedAtMs;
          // If cache age < 2 hours and non-negative, restore monotonic baseline
          if (cacheAge >= 0 && cacheAge < 2 * 60 * 60 * 1000) {
            this.baseServerTime = cached.serverTimeAtSync + cacheAge;
            this.basePerfNow = performance.now();
            this.isOfflineFallback = true;
            this.lastSyncTimestamp = cached.savedAtMs;
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Persist last known server baseline safely
   */
  private persistServerTime(serverTime: number) {
    try {
      const payload: CachedServerTime = {
        serverTimeAtSync: serverTime,
        savedAtMs: Date.now(),
      };
      localStorage.setItem('slapearn_server_time_cache', JSON.stringify(payload));
    } catch {
      // Ignore localStorage write limits
    }
  }

  private initNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        // Re-sync seamlessly when device reconnects
        this.syncServerTime().catch(() => {});
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncServerTime().catch(() => {});
        }
      });

      // Background periodic re-sync every 15 minutes (non-blocking)
      this.periodicSyncInterval = window.setInterval(() => {
        this.syncServerTime().catch(() => {});
      }, 15 * 60 * 1000);
    }
  }

  /**
   * Subscribe to time sync status changes
   */
  public subscribe(callback: TimeSyncListener): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.warn('[TimeManager] Listener callback error:', err);
      }
    });
  }

  public getState(): TimeSyncState {
    return {
      isSynced: this.isSynced,
      isOfflineFallback: this.isOfflineFallback,
      isStale: !this.isSynced && (Date.now() - this.lastSyncTimestamp > 30 * 60 * 1000),
      lastSyncTimestamp: this.lastSyncTimestamp,
      serverTime: this.getServerNow(),
      isWarningVisible: !this.isSynced && !this.isWarningDismissed,
      errorMessage: this.errorMessage,
    };
  }

  public dismissWarning() {
    this.isWarningDismissed = true;
    this.notify();
  }

  /**
   * Fetches authoritative server timestamp from /api/time and updates monotonic baseline
   */
  public async syncServerTime(force: boolean = false): Promise<number> {
    if (this.syncPromise && !force) {
      return this.syncPromise;
    }

    this.syncPromise = (async () => {
      const fetchStartPerf = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('/api/time', {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.serverTime === 'number' && !isNaN(data.serverTime)) {
            const fetchEndPerf = performance.now();
            const roundTripLatency = Math.max(0, Math.floor((fetchEndPerf - fetchStartPerf) / 2));
            
            // Set authoritative baseline
            this.baseServerTime = data.serverTime + roundTripLatency;
            this.basePerfNow = fetchEndPerf;
            this.isSynced = true;
            this.isOfflineFallback = false;
            this.lastSyncTimestamp = Date.now();
            this.errorMessage = null;

            this.persistServerTime(this.baseServerTime);
            this.notify();
            return this.baseServerTime;
          }
        }
        throw new Error(`Invalid response status ${res.status}`);
      } catch (err: any) {
        console.warn('[TimeManager] Server /api/time sync failed, operating in resilient monotonic mode:', err?.message || err);
        // Fallback: Continue running on previous baseline + monotonic performance.now()
        this.isSynced = false;
        this.isOfflineFallback = true;
        this.errorMessage = 'Operating in offline cache mode';
        this.notify();
        return this.getServerNow();
      } finally {
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  /**
   * Central monotonic function: Returns the current server timestamp in milliseconds.
   * Immune to changing phone clock, setting date forward/backward, or timezone differences.
   */
  public getServerNow(): number {
    const elapsedPerfMs = performance.now() - this.basePerfNow;
    if (this.baseServerTime > 0) {
      return this.baseServerTime + Math.max(0, elapsedPerfMs);
    }
    return Date.now();
  }

  /**
   * Returns a standard Date object corresponding to the authoritative server time.
   */
  public getServerDate(): Date {
    return new Date(this.getServerNow());
  }

  /**
   * Returns the current server date in standard UTC YYYY-MM-DD format.
   * Essential for daily check-in, challenges, and resets without local timezone bugs.
   */
  public getServerDateString(timestamp?: number | string | Date): string {
    let d: Date;
    if (timestamp instanceof Date) {
      d = isNaN(timestamp.getTime()) ? this.getServerDate() : timestamp;
    } else if (typeof timestamp === 'number') {
      d = isNaN(timestamp) || timestamp <= 0 ? this.getServerDate() : new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      d = isNaN(parsed) ? this.getServerDate() : new Date(parsed);
    } else {
      d = this.getServerDate();
    }
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculates time remaining until the next UTC midnight server day rollover.
   */
  public getRemainingTimeToDailyReset(): { totalMs: number; hours: number; minutes: number; seconds: number; formatted: string } {
    const now = this.getServerNow();
    const serverDate = new Date(now);
    
    // Tomorrow at 00:00:00.000 UTC
    const nextMidnightUtc = Date.UTC(
      serverDate.getUTCFullYear(),
      serverDate.getUTCMonth(),
      serverDate.getUTCDate() + 1,
      0, 0, 0, 0
    );

    const diffMs = Math.max(0, nextMidnightUtc - now);
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

    return { totalMs: diffMs, hours, minutes, seconds, formatted };
  }
}

// Global Singleton Instance
export const timeManager = new CentralTimeManager();

// Bootstrap immediately on module evaluation
if (typeof window !== 'undefined') {
  timeManager.syncServerTime().catch(() => {});
}

// Convenient export aliases
export const getServerNow = () => timeManager.getServerNow();
export const getServerDate = () => timeManager.getServerDate();
export const getServerDateString = (ts?: number | string | Date) => timeManager.getServerDateString(ts);
export const getRemainingTimeToDailyReset = () => timeManager.getRemainingTimeToDailyReset();
export const resyncServerTime = () => timeManager.syncServerTime(true);
export const dismissTimeWarning = () => timeManager.dismissWarning();
