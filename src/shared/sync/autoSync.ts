import type { ExtensionStorageState, SecureSyncSettings } from '../types';
import { encryptSnapshot } from './encryptedSnapshot';
import { pushSecureSnapshot, SecureSyncError } from './secureSyncApi';
import { buildSanitizedSnapshot } from './snapshotPolicy';

export const AUTO_SYNC_DEBOUNCE_MS = 45_000;
export const AUTO_SYNC_MAX_RETRIES = 3;

export interface AutoSyncSchedulerHooks {
  upload: (state: ExtensionStorageState) => Promise<void>;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  retryDelayMs?: (attempt: number) => number;
  onError?: (error: unknown) => void;
  onConflict?: (error: SecureSyncError) => void;
}

export interface AutoSyncScheduler {
  schedule(state: ExtensionStorageState): void;
  suppress<T>(task: () => T | Promise<T>): Promise<T>;
  cancel(): void;
  resume(): void;
  flush(): Promise<void>;
}

export function createAutoSyncScheduler(hooks: AutoSyncSchedulerHooks): AutoSyncScheduler {
  const scheduleTimer = hooks.setTimeout ?? setTimeout;
  const clearScheduleTimer = hooks.clearTimeout ?? clearTimeout;
  const retryDelayMs = hooks.retryDelayMs ?? ((attempt: number) => {
    const base = 1_000 * 2 ** attempt;
    return Math.min(30_000, Math.round(base * (1 + Math.random() * 0.25)));
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: ExtensionStorageState | undefined;
  let inFlight: Promise<void> | undefined;
  let suppressed = 0;
  let stoppedForConflict = false;

  const clearTimer = () => {
    if (timer !== undefined) clearScheduleTimer(timer);
    timer = undefined;
  };

  const wait = (delay: number) => new Promise<void>((resolve) => {
    timer = scheduleTimer(() => {
      timer = undefined;
      resolve();
    }, delay);
  });

  const runUpload = async (state: ExtensionStorageState): Promise<void> => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await hooks.upload(state);
        return;
      } catch (error) {
        if (error instanceof SecureSyncError && error.code === 'conflict') {
          stoppedForConflict = true;
          latest = undefined;
          hooks.onConflict?.(error);
          return;
        }
        if (attempt >= AUTO_SYNC_MAX_RETRIES) {
          hooks.onError?.(error);
          return;
        }
        await wait(retryDelayMs(attempt));
      }
    }
  };

  const start = async (): Promise<void> => {
    clearTimer();
    if (inFlight || suppressed > 0 || stoppedForConflict || !latest) return;
    const state = latest;
    latest = undefined;
    inFlight = runUpload(state).finally(() => {
      inFlight = undefined;
      if (latest && !stoppedForConflict && suppressed === 0) {
        timer = scheduleTimer(() => {
          timer = undefined;
          void start();
        }, AUTO_SYNC_DEBOUNCE_MS);
      }
    });
    await inFlight;
  };

  return {
    schedule(state) {
      if (suppressed > 0 || stoppedForConflict) return;
      latest = state;
      if (inFlight) return;
      clearTimer();
      timer = scheduleTimer(() => {
        timer = undefined;
        void start();
      }, AUTO_SYNC_DEBOUNCE_MS);
    },
    async suppress<T>(task: () => T | Promise<T>): Promise<T> {
      suppressed += 1;
      clearTimer();
      latest = undefined;
      try {
        return await task();
      } finally {
        suppressed -= 1;
      }
    },
    cancel() {
      clearTimer();
      latest = undefined;
    },
    resume() {
      stoppedForConflict = false;
    },
    async flush() {
      clearTimer();
      await start();
      if (inFlight) await inFlight;
    }
  };
}

function isStorageState(value: unknown): value is ExtensionStorageState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExtensionStorageState>;
  return Boolean(candidate.settings && candidate.metadata && candidate.problemsById && candidate.reviewLogsById && candidate.notesByProblemId);
}

/** Schedule only for sync-relevant changes, never for sync status/revision bookkeeping. */
export function shouldScheduleSecureAutoSync(previousValue: unknown, nextValue: unknown): boolean {
  if (!isStorageState(nextValue)) return false;
  const nextConfig = nextValue.settings.cloudSync;
  if (!nextConfig.enabled || !nextConfig.recoveryCode || nextConfig.status === 'conflict' || nextConfig.status === 'pending') return false;
  if (!isStorageState(previousValue)) return true;
  if (!previousValue.settings.cloudSync.enabled) return true;
  return JSON.stringify(buildSanitizedSnapshot(previousValue)) !== JSON.stringify(buildSanitizedSnapshot(nextValue));
}

let secureSyncStatusWriter: ((patch: Partial<SecureSyncSettings>) => Promise<void>) | undefined;

export function configureSecureSyncStatusWriter(
  writer: (patch: Partial<SecureSyncSettings>) => Promise<void>
): void {
  secureSyncStatusWriter = writer;
}

export const secureAutoSyncScheduler = createAutoSyncScheduler({
  async upload(state) {
    const config = state.settings.cloudSync;
    const recoveryCode = config.recoveryCode;
    if (!config.enabled || !recoveryCode) return;
    const { lookupId, envelope } = await encryptSnapshot(state, recoveryCode);
    const result = await pushSecureSnapshot(lookupId, envelope, config.revision);
    await secureSyncStatusWriter?.({
      revision: result.revision,
      status: 'synced',
      conflict: undefined,
      lastSyncedAt: result.updatedAt ?? new Date().toISOString(),
      lastError: undefined
    });
  },
  // Deliberately do not log the error object: browser/network errors can include
  // request details. Status is surfaced on the next explicit sync operation.
  onError() {
    void secureSyncStatusWriter?.({ status: 'error', lastError: 'Automatic secure sync failed.' });
    console.warn('Crush LeetCode secure sync upload failed.');
  },
  onConflict(error) {
    void secureSyncStatusWriter?.({
      status: 'conflict',
      conflict: { remoteRevision: error.remoteRevision, detectedAt: new Date().toISOString() },
      lastError: error.message
    });
    console.warn('Crush LeetCode secure sync stopped because the remote snapshot changed.');
  }
});

export function withAutoSyncSuppressed<T>(task: () => T | Promise<T>): Promise<T> {
  return secureAutoSyncScheduler.suppress(task);
}
