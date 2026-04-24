import { DAILY_ALARM_NAME } from '../shared/constants';
import { nextLocalTime } from '../shared/date';
import type { UserSettings } from '../shared/types';

export async function scheduleDailyAlarm(settings: UserSettings): Promise<void> {
  await chrome.alarms.clear(DAILY_ALARM_NAME);
  if (!settings.reminders.enabled) {
    return;
  }

  chrome.alarms.create(DAILY_ALARM_NAME, {
    when: nextLocalTime(settings.reminders.dailyReminderTime).getTime(),
    periodInMinutes: 24 * 60
  });
}

export function isDailyAlarm(name: string): boolean {
  return name === DAILY_ALARM_NAME;
}
