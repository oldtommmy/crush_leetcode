import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { daysBetween, toLocalDateString } from '../src/shared/date';

// Regression for B1: nextReviewAt is a UTC ISO timestamp. Comparisons must
// resolve to the user's *local* calendar day, not the UTC day, or review due
// dates drift by ±1 across timezones.
//
// V8 caches the host timezone on startup and ignores later `process.env.TZ`
// writes, so timezone behavior cannot be exercised by mutating TZ inside the
// test worker. Instead we bundle the date module once and evaluate the pure
// day math in isolated node processes that each launch with a fixed TZ.

let bundledDateModule = '';

beforeAll(() => {
  const result = buildSync({
    entryPoints: [resolve(__dirname, '../src/shared/date.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false
  });
  bundledDateModule = result.outputFiles[0].text;
});

function evalInTimezone(tz: string, body: string): unknown {
  const script = `${bundledDateModule}\n;(() => { const __out = (${body}); process.stdout.write(JSON.stringify(__out)); })();`;
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, TZ: tz },
    encoding: 'utf8'
  });
  return JSON.parse(stdout);
}

describe('daysBetween across timezones', () => {
  it('UTC-5 evening review resolves the UTC timestamp to the local day', () => {
    // nextReviewAt is stored as 2026-09-20T01:30Z. In America/New_York that
    // instant is 2026-09-19 21:30, i.e. local calendar day 2026-09-19.
    //
    // The queue check is daysBetween(nextReviewAt, today) >= 0. On local
    // 2026-09-19 the old slice-based code read the UTC day "2026-09-20" and
    // returned -1, so the due problem was hidden a day late. The fix maps the
    // timestamp to its local day 2026-09-19 and correctly returns 0 (due today).
    const dueTodayCheck = evalInTimezone(
      'America/New_York',
      `daysBetween('2026-09-20T01:30:00.000Z', '2026-09-19')`
    );
    expect(dueTodayCheck).toBe(0);
  });

  it('UTC+8 early morning review does not surface a day early', () => {
    // Reviewed 2026-09-20 00:30 CST -> nextReviewAt 2026-09-21 00:30 locally.
    const onReviewDay = evalInTimezone(
      'Asia/Shanghai',
      `daysBetween('2026-09-20T16:30:00.000Z', '2026-09-20')`
    );
    const onDueDay = evalInTimezone(
      'Asia/Shanghai',
      `daysBetween('2026-09-20T16:30:00.000Z', '2026-09-21')`
    );
    expect(onReviewDay).toBe(-1);
    expect(onDueDay).toBe(0);
  });

  it('handles DST switch day without drift', () => {
    // US DST ends 2026-11-01. Comparing across the boundary stays day-accurate.
    const spread = evalInTimezone(
      'America/New_York',
      `daysBetween('2026-10-31T12:00:00.000Z', '2026-11-02T12:00:00.000Z')`
    );
    expect(spread).toBe(2);
  });

  it('converts a UTC ISO timestamp to the local calendar day', () => {
    expect(evalInTimezone('America/New_York', `toLocalDateString('2026-09-20T01:30:00.000Z')`)).toBe('2026-09-19');
    expect(evalInTimezone('Asia/Shanghai', `toLocalDateString('2026-09-20T16:30:00.000Z')`)).toBe('2026-09-21');
  });
});

describe('toLocalDateString (host timezone)', () => {
  it('treats a plain YYYY-MM-DD string as an unambiguous local date', () => {
    expect(toLocalDateString('2026-09-19')).toBe('2026-09-19');
  });

  it('falls back to the leading date slice for unparseable input', () => {
    expect(toLocalDateString('garbage-value-xyz')).toBe('garbage-va');
  });

  it('daysBetween returns 0 for identical date-only inputs regardless of host tz', () => {
    expect(daysBetween('2026-09-19', '2026-09-19')).toBe(0);
  });
});
