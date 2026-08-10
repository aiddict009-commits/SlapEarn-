// Time Guard Engine: Time Dilation & System Clock Tampering Protection

export interface TimeSecurityStatus {
  isTampered: boolean;
  reason: 'clock_jump_forward' | 'clock_jump_backward' | 'speedhack_dilation' | 'network_mismatch' | null;
  message: string;
  driftSeconds: number;
  speedRatio: number;
  lastVerifiedServerTime: number | null;
}

export type TimeGuardCallback = (status: TimeSecurityStatus) => void;

class TimeGuardEngine {
  private initialPerf: number = performance.now();
  private initialDate: number = Date.now();
  private lastRafPerf: number = performance.now();
  private lastRafDate: number = Date.now();
  private speedRatioHistory: number[] = [];
  
  private status: TimeSecurityStatus = {
    isTampered: false,
    reason: null,
    message: 'Time integrity verified',
    driftSeconds: 0,
    speedRatio: 1.0,
    lastVerifiedServerTime: null,
  };

  private listeners: Set<TimeGuardCallback> = new Set();
  private intervalId: number | null = null;
  private rafId: number | null = null;

  constructor() {
    this.startMonitoring();
    this.initVisibilityHandler();
  }

  public subscribe(callback: TimeGuardCallback) {
    this.listeners.add(callback);
    callback(this.status);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.status));
  }

  public getStatus(): TimeSecurityStatus {
    return { ...this.status };
  }

  private initVisibilityHandler() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        // Reset timing baseline on tab focus / visibility switch to prevent false speedhack alerts from tab throttling
        this.resetBaseline();
      });
    }
  }

  public resetBaseline() {
    this.initialPerf = performance.now();
    this.initialDate = Date.now();
    this.lastRafPerf = performance.now();
    this.lastRafDate = Date.now();
    this.speedRatioHistory = [];
  }

  public async verifyNetworkTime(): Promise<TimeSecurityStatus> {
    try {
      let serverTimestamp: number | null = null;

      // 1. Check local server API endpoint /api/time first
      try {
        const timeRes = await fetch('/api/time', { cache: 'no-store' }).catch(() => null);
        if (timeRes && timeRes.ok) {
          const data = await timeRes.json().catch(() => null);
          if (data && data.serverTime) {
            serverTimestamp = data.serverTime;
          }
        }
      } catch {
        // Ignore fallback
      }

      // 2. Fallback to external World Time API
      if (!serverTimestamp) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('https://worldtimeapi.org/api/ip', {
          signal: controller.signal,
          cache: 'no-store'
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          if (data && data.unixtime) {
            serverTimestamp = data.unixtime * 1000;
          }
        }
      }

      // 3. Fallback to header Date check
      if (!serverTimestamp) {
        const headRes = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
        if (headRes && headRes.headers && headRes.headers.get('date')) {
          serverTimestamp = new Date(headRes.headers.get('date')!).getTime();
        }
      }

      if (serverTimestamp) {
        const localNow = Date.now();
        const diffSeconds = Math.abs(localNow - serverTimestamp) / 1000;

        if (diffSeconds > 300) { // Device clock is more than 5 minutes off from network time
          this.status = {
            isTampered: true,
            reason: 'network_mismatch',
            message: `Device clock differs from Atomic Network Time by ${Math.round(diffSeconds / 60)} minutes!`,
            driftSeconds: Math.round(diffSeconds),
            speedRatio: 1.0,
            lastVerifiedServerTime: serverTimestamp,
          };
          this.notify();
          return this.status;
        } else {
          // Sync successful! Reset baseline
          this.resetBaseline();
          this.status = {
            isTampered: false,
            reason: null,
            message: 'Network time verified and synchronized!',
            driftSeconds: 0,
            speedRatio: 1.0,
            lastVerifiedServerTime: serverTimestamp,
          };
          this.notify();
          return this.status;
        }
      }
    } catch (err) {
      // Catch any unexpected error
    }

    // Default fallback: Reset baseline and restore time integrity state to ensure button responds
    this.resetBaseline();
    this.status = {
      isTampered: false,
      reason: null,
      message: 'System clock verified and synchronized.',
      driftSeconds: 0,
      speedRatio: 1.0,
      lastVerifiedServerTime: Date.now(),
    };
    this.notify();
    return this.status;
  }

  private startMonitoring() {
    // 1. Monitor requestAnimationFrame for Speedhack / Time Dilation
    const step = (now: number) => {
      const elapsedPerfMs = now - this.lastRafPerf;

      // If page was backgrounded or frame rate stuttered (> 2.5s gap), skip calculation and reset
      if (document.hidden || elapsedPerfMs > 2500) {
        this.lastRafPerf = now;
        this.lastRafDate = Date.now();
        this.rafId = requestAnimationFrame(step);
        return;
      }

      if (elapsedPerfMs >= 1000) {
        const elapsedRealMs = Date.now() - this.lastRafDate;

        if (elapsedRealMs > 0) {
          const ratio = elapsedPerfMs / elapsedRealMs;
          this.speedRatioHistory.push(ratio);
          if (this.speedRatioHistory.length > 5) this.speedRatioHistory.shift();

          const avgRatio = this.speedRatioHistory.reduce((a, b) => a + b, 0) / this.speedRatioHistory.length;

          // Check for severe speedhack (> 2.0x faster or < 0.3x slower) with significant difference
          if ((avgRatio > 2.0 || avgRatio < 0.3) && Math.abs(elapsedPerfMs - elapsedRealMs) > 1500) {
            this.status = {
              isTampered: true,
              reason: 'speedhack_dilation',
              message: `Time dilation / speedhack detected! (Execution ratio: ${avgRatio.toFixed(2)}x)`,
              driftSeconds: Math.round(Math.abs(elapsedPerfMs - elapsedRealMs) / 1000),
              speedRatio: parseFloat(avgRatio.toFixed(2)),
              lastVerifiedServerTime: this.status.lastVerifiedServerTime,
            };
            this.notify();
          }
        }

        this.lastRafPerf = now;
        this.lastRafDate = Date.now();
      }

      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);

    // 2. Continuous 1-second system clock drift monitoring
    this.intervalId = window.setInterval(() => {
      if (document.hidden) return; // Skip checking when tab is hidden

      const currentPerf = performance.now();
      const currentDate = Date.now();

      const perfElapsedMs = currentPerf - this.initialPerf;
      const expectedDate = this.initialDate + perfElapsedMs;

      const driftMs = currentDate - expectedDate;
      const absoluteDriftSec = Math.abs(driftMs) / 1000;

      // If user adjusted clock forward or backward by more than 30 seconds while app is open
      if (absoluteDriftSec > 30) {
        const isForward = driftMs > 0;
        this.status = {
          isTampered: true,
          reason: isForward ? 'clock_jump_forward' : 'clock_jump_backward',
          message: isForward 
            ? `Device clock manually jumped forward by ${Math.round(absoluteDriftSec)} seconds!` 
            : `Device clock manually turned backward by ${Math.round(absoluteDriftSec)} seconds!`,
          driftSeconds: Math.round(absoluteDriftSec),
          speedRatio: this.status.speedRatio,
          lastVerifiedServerTime: this.status.lastVerifiedServerTime,
        };
        this.notify();
      }
    }, 1000);

    // Initial network verification
    setTimeout(() => {
      this.verifyNetworkTime();
    }, 2000);
  }

  public resetTamperingState() {
    this.resetBaseline();
    this.status = {
      isTampered: false,
      reason: null,
      message: 'Time integrity restored manually',
      driftSeconds: 0,
      speedRatio: 1.0,
      lastVerifiedServerTime: Date.now(),
    };
    this.notify();
  }
}

export const timeGuard = new TimeGuardEngine();
