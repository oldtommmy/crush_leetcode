import { AUTO_SYNC_DEBOUNCE_MS } from '../shared/sync/autoSync';
import { DAILY_ALARM_NAME, SECURE_SYNC_ALARM_NAME } from '../shared/constants';
import { nextLocalTime } from '../shared/date';
import type { UserSettings } from '../shared/types';

export async function scheduleDailyAlarm(settings: UserSettings): Promise<void> {
  await chrome.alarms.clear(DAILY_ALARM_NAME);
  if (!settings.reminders.enabled) {
    return;
  }

  chrome.alarms.create(DAILY_ALARM_NAME, {
    when: nextLocalTime(settings.reminders.dailyReminderTime).getTime()
  });
}

export function isDailyAlarm(name: string): boolean {
  return name === DAILY_ALARM_NAME;
}

export function scheduleSecureSyncAlarm(now = Date.now()): void {
  chrome.alarms.create(SECURE_SYNC_ALARM_NAME, {
    when: now + AUTO_SYNC_DEBOUNCE_MS
  });
}

export async function cancelSecureSyncAlarm(): Promise<void> {
  await chrome.alarms.clear(SECURE_SYNC_ALARM_NAME);
}

export function isSecureSyncAlarm(name: string): boolean {
  return name === SECURE_SYNC_ALARM_NAME;
}
