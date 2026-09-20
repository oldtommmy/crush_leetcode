const DATE_LENGTH = 10;

export function todayDateString(now = new Date()): string {
  return toDateString(now);
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize a date input to a local calendar date string (YYYY-MM-DD).
 *
 * Plain `YYYY-MM-DD` strings are unambiguous and returned as-is. Anything with a
 * time component (e.g. a UTC ISO timestamp like `2026-09-20T01:30:00.000Z`) is
 * converted through the local timezone first, so due-date comparisons happen on
 * the user's local calendar day rather than the UTC day. Slicing the ISO string
 * would leak the UTC day and shift review due dates by ±1 across timezones.
 */
export function toLocalDateString(value: string): string {
  if (DATE_ONLY_PATTERN.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, DATE_LENGTH);
  }
  return toDateString(parsed);
}

export function daysBetween(fromDate: string, toDate = todayDateString()): number {
  const from = new Date(`${toLocalDateString(fromDate)}T00:00:00`);
  const to = new Date(`${toLocalDateString(toDate)}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function isSameLocalDate(first: string | Date, second: string | Date): boolean {
  const firstDate = typeof first === 'string' ? new Date(first) : first;
  const secondDate = typeof second === 'string' ? new Date(second) : second;
  return toDateString(firstDate) === toDateString(secondDate);
}

export function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return { hours: 10, minutes: 0 };
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function nextLocalTime(value: string, now = new Date()): Date {
  const { hours, minutes } = parseTimeOfDay(value);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
