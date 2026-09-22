import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTO_SYNC_DEBOUNCE_MS, createAutoSyncScheduler, shouldScheduleSecureAutoSync } from '../src/shared/sync/autoSync';
import { SecureSyncError } from '../src/shared/sync/secureSyncApi';
import { createState } from './helpers/stateFactory';

afterEach(() => {
  vi.useRealTimers();
});

describe('secure auto-sync scheduler', () => {
  it('trailing-debounces and uploads only the latest state', async () => {
    vi.useFakeTimers();
    const upload = vi.fn(async () => undefined);
    const scheduler = createAutoSyncScheduler({ upload });
    const first = createState({ metadata: { storageBackend: 'local', revision: 1 } });
    const latest = createState({ metadata: { storageBackend: 'local', revision: 2 } });
    scheduler.schedule(first);
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DEBOUNCE_MS - 1);
    scheduler.schedule(latest);
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DEBOUNCE_MS);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(latest);
  });

  it('keeps one request in flight and sends a later state after the next debounce', async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const firstUpload = new Promise<void>((resolve) => { release = resolve; });
    const upload = vi.fn()
      .mockImplementationOnce(() => firstUpload)
      .mockResolvedValue(undefined);
    const scheduler = createAutoSyncScheduler({ upload });
    scheduler.schedule(createState({ metadata: { storageBackend: 'local', revision: 1 } }));
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DEBOUNCE_MS);
    scheduler.schedule(createState({ metadata: { storageBackend: 'local', revision: 2 } }));
    expect(upload).toHaveBeenCalledTimes(1);
    release();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DEBOUNCE_MS);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('schedules only for sync-relevant storage changes', () => {
    const previous = createState();
    previous.settings.cloudSync = { enabled: true, recoveryCode: 'secure-code', status: 'synced', revision: 2 };
    const statusOnly = structuredClone(previous);
    statusOnly.settings.cloudSync.status = 'syncing';
    statusOnly.metadata.revision = (statusOnly.metadata.revision ?? 0) + 1;
    expect(shouldScheduleSecureAutoSync(previous, statusOnly)).toBe(false);

    const changed = structuredClone(statusOnly);
    changed.settings.locale = 'zh-CN';
    expect(shouldScheduleSecureAutoSync(statusOnly, changed)).toBe(true);
  });

  it('does not schedule while a conflict is unresolved', () => {
    const previous = createState();
    const next = createState();
    next.settings.cloudSync = {
      enabled: true,
      recoveryCode: 'secure-code',
      status: 'conflict',
      conflict: { detectedAt: new Date().toISOString(), remoteRevision: 2 }
    };
    next.settings.locale = 'zh-CN';
    expect(shouldScheduleSecureAutoSync(previous, next)).toBe(false);
  });

  it('stops scheduling after a CAS conflict', async () => {
    vi.useFakeTimers();
    const conflict = new SecureSyncError('conflict', 'conflict', 409, 2);
    const onConflict = vi.fn();
    const upload = vi.fn(async () => { throw conflict; });
    const scheduler = createAutoSyncScheduler({ upload, onConflict });
    scheduler.schedule(createState());
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DEBOUNCE_MS);
    scheduler.schedule(createState({ metadata: { storageBackend: 'local', revision: 2 } }));
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DEBOUNCE_MS * 2);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onConflict).toHaveBeenCalledWith(conflict);
  });
});
