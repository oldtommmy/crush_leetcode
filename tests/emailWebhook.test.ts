import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendWeeklySummaryEmail } from '../src/background/emailWebhook';
import type { WeeklySummaryStats } from '../src/shared/types';

const summary: WeeklySummaryStats = {
  totalProblems: 1,
  dueCount: 0,
  overdueCount: 0,
  reviewedProblemsThisWeekCount: 1,
  acceptedProblemsThisWeekCount: 1,
  dailyReviewPoints: []
};

describe('emailWebhook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('skips automatic digest delivery when no beta access code is configured', async () => {
    await expect(
      sendWeeklySummaryEmail(summary, [], { enabled: true, toEmail: 'review@example.com' }, 'en')
    ).resolves.toBeUndefined();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws a clear error for manual test delivery when no beta access code is configured', async () => {
    await expect(
      sendWeeklySummaryEmail(summary, [], { enabled: true, toEmail: 'review@example.com' }, 'en', {
        requireConfigured: true
      })
    ).rejects.toThrow('Official digest requires the beta access code');
  });

  it('does not send a compiled-in shared secret header (D3)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    await sendWeeklySummaryEmail(
      summary,
      [],
      { enabled: true, toEmail: 'review@example.com', betaAccessCode: 'BETA-1234' },
      'en',
      { requireConfigured: true }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['X-Crush-Secret']).toBeUndefined();
    expect(Object.keys(headers)).toEqual(['Content-Type']);
    // The per-user access code travels in the body, validated server-side.
    expect(JSON.parse(init?.body as string).betaAccessCode).toBe('BETA-1234');
  });
});
