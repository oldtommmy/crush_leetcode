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

export function daysBetween(fromDate: string, toDate = todayDateString()): number {
  const from = new Date(`${fromDate.slice(0, DATE_LENGTH)}T00:00:00`);
  const to = new Date(`${toDate.slice(0, DATE_LENGTH)}T00:00:00`);
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
