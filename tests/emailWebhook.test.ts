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

  it('skips automatic digest delivery when the build has no mailer secret', async () => {
    await expect(
      sendWeeklySummaryEmail(summary, [], { enabled: true, toEmail: 'review@example.com' }, 'en')
    ).resolves.toBeUndefined();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws a clear error for manual test delivery when the build has no mailer secret', async () => {
    await expect(
      sendWeeklySummaryEmail(summary, [], { enabled: true, toEmail: 'review@example.com' }, 'en', {
        requireConfigured: true
      })
    ).rejects.toThrow('Official mailer is not configured in this build.');
  });
});
