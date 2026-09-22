import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelSecureSyncAlarm, scheduleDailyAlarm, scheduleSecureSyncAlarm } from '../src/background/alarms';
import { DAILY_ALARM_NAME, DEFAULT_SETTINGS, SECURE_SYNC_ALARM_NAME } from '../src/shared/constants';
import { AUTO_SYNC_DEBOUNCE_MS } from '../src/shared/sync/autoSync';

describe('daily review alarms', () => {
  const clear = vi.fn();
  const create = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 21, 8, 0, 0));
    clear.mockResolvedValue(true);
    create.mockReturnValue(undefined);
    vi.stubGlobal('chrome', {
      alarms: {
        clear,
        create
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('schedules daily alarm using the user configured reminder time', async () => {
    await scheduleDailyAlarm({
      ...DEFAULT_SETTINGS,
      reminders: {
        ...DEFAULT_SETTINGS.reminders,
        dailyReminderTime: '09:30'
      }
    });

    expect(clear).toHaveBeenCalledWith(DAILY_ALARM_NAME);
    expect(create).toHaveBeenCalledWith(DAILY_ALARM_NAME, {
      when: new Date(2026, 3, 21, 9, 30, 0, 0).getTime()
    });
  });

  it('falls back to 10:00 for invalid configured reminder time', async () => {
    await scheduleDailyAlarm({
      ...DEFAULT_SETTINGS,
      reminders: {
        ...DEFAULT_SETTINGS.reminders,
        dailyReminderTime: 'bad-time'
      }
    });

    expect(create).toHaveBeenCalledWith(DAILY_ALARM_NAME, {
      when: new Date(2026, 3, 21, 10, 0, 0, 0).getTime()
    });
  });

  it('uses a durable one-shot alarm for the secure sync debounce', () => {
    const now = Date.now();
    scheduleSecureSyncAlarm(now);
    expect(create).toHaveBeenCalledWith(SECURE_SYNC_ALARM_NAME, {
      when: now + AUTO_SYNC_DEBOUNCE_MS
    });
  });

  it('cancels a pending secure sync alarm before manual sync', async () => {
    await cancelSecureSyncAlarm();
    expect(clear).toHaveBeenCalledWith(SECURE_SYNC_ALARM_NAME);
  });
});
