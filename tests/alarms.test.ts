import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduleDailyAlarm } from '../src/background/alarms';
import { DAILY_ALARM_NAME, DEFAULT_SETTINGS } from '../src/shared/constants';

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
      when: new Date(2026, 3, 21, 9, 30, 0, 0).getTime(),
      periodInMinutes: 24 * 60
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
      when: new Date(2026, 3, 21, 10, 0, 0, 0).getTime(),
      periodInMinutes: 24 * 60
    });
  });
});
