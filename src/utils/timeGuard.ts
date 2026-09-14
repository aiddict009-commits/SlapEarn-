// Re-export from central timeManager to maintain backward compatibility safely
// All old atomic-time, network-mismatch, and time-dilation blocking logic has been removed.
import {
  timeManager,
  TimeSyncState,
  getServerNow,
  getServerDate,
  getServerDateString,
  resyncServerTime,
} from './timeManager';

export interface TimeSecurityStatus {
  isTampered: boolean;
  reason: string | null;
  message: string;
  driftSeconds: number;
  speedRatio: number;
  lastVerifiedServerTime: number | null;
}

export type TimeGuardCallback = (status: TimeSecurityStatus) => void;

class SafeTimeAdapter {
  public subscribe(callback: TimeGuardCallback): () => void {
    return timeManager.subscribe((syncState: TimeSyncState) => {
      callback({
        isTampered: false, // Never block user
        reason: null,
        message: syncState.isSynced ? 'Server time synchronized' : 'Offline resilient mode',
        driftSeconds: 0,
        speedRatio: 1.0,
        lastVerifiedServerTime: syncState.serverTime,
      });
    });
  }

  public getStatus(): TimeSecurityStatus {
    const state = timeManager.getState();
    return {
      isTampered: false,
      reason: null,
      message: state.isSynced ? 'Server time synchronized' : 'Offline resilient mode',
      driftSeconds: 0,
      speedRatio: 1.0,
      lastVerifiedServerTime: state.serverTime,
    };
  }

  public async verifyNetworkTime(): Promise<TimeSecurityStatus> {
    const time = await resyncServerTime();
    return {
      isTampered: false,
      reason: null,
      message: 'Server time synchronized',
      driftSeconds: 0,
      speedRatio: 1.0,
      lastVerifiedServerTime: time,
    };
  }

  public resetTamperingState() {}
  public resetBaseline() {}
}

export const timeGuard = new SafeTimeAdapter();
export { getServerNow, getServerDate, getServerDateString, resyncServerTime };
