import { describe, expect, it } from 'vitest';
import {
  markDailyNotificationSent,
  markEmailFailure,
  markWeeklySummarySent,
  normalizeReminderDelivery,
  shouldSendDailyNotification,
  shouldSendWeeklySummary
} from '../src/shared/reminders/delivery';
import { createState } from './helpers/stateFactory';
import type { WeeklySummaryStats } from '../src/shared/types';

const weeklySummary: WeeklySummaryStats = {
  totalProblems: 5,
  dueCount: 2,
  overdueCount: 1,
  reviewedProblemsThisWeekCount: 3,
  acceptedProblemsThisWeekCount: 1,
  dailyReviewPoints: [
    { date: '2026-04-15', label: '04-15', reviewCount: 0 },
    { date: '2026-04-16', label: '04-16', reviewCount: 1 },
    { date: '2026-04-17', label: '04-17', reviewCount: 0 },
    { date: '2026-04-18', label: '04-18', reviewCount: 2 },
    { date: '2026-04-19', label: '04-19', reviewCount: 0 },
    { date: '2026-04-20', label: '04-20', reviewCount: 1 },
    { date: '2026-04-21', label: '04-21', reviewCount: 0 }
  ]
};

describe('reminder delivery', () => {
  it('sends weekly summary only when email reminders are enabled and enough days have passed', () => {
    const state = createState({
      settings: {
        ...createState().settings,
        reminders: {
          enabled: true,
          dailyReminderTime: '10:00',
          notifyOverdue: true,
          overdueThresholdDays: 3
        },
        emailWebhook: {
          enabled: true,
          toEmail: 'review@example.com'
        }
      },
      metadata: {
        ...createState().metadata,
        reminderDelivery: normalizeReminderDelivery({
          lastWeeklySummarySentDate: '2026-04-14',
          emailByProblemId: {}
        })
      }
    });

    expect(shouldSendWeeklySummary(state, '2026-04-21', weeklySummary)).toBe(true);
  });

  it('does not send weekly summary when reminders are disabled or interval has not elapsed', () => {
    const state = createState({
      settings: {
        ...createState().settings,
        reminders: {
          enabled: true,
          dailyReminderTime: '10:00',
          notifyOverdue: true,
          overdueThresholdDays: 3
        },
        emailWebhook: {
          enabled: true,
          toEmail: 'review@example.com'
        }
      },
      metadata: {
        ...createState().metadata,
        reminderDelivery: normalizeReminderDelivery({
          lastWeeklySummarySentDate: '2026-04-18',
          emailByProblemId: {}
        })
      }
    });

    expect(shouldSendWeeklySummary(state, '2026-04-21', weeklySummary)).toBe(false);
    expect(
      shouldSendWeeklySummary(
        createState({
          settings: {
            ...state.settings,
            reminders: {
              ...state.settings.reminders,
              notifyOverdue: false
            }
          }
        }),
        '2026-04-21',
        weeklySummary
      )
    ).toBe(false);
  });

  it('sends weekly summary when problems were accepted even without reviews this week', () => {
    const state = createState({
      settings: {
        ...createState().settings,
        reminders: {
          enabled: true,
          dailyReminderTime: '10:00',
          notifyOverdue: true,
          overdueThresholdDays: 3
        },
        emailWebhook: {
          enabled: true,
          toEmail: 'review@example.com'
        }
      },
      metadata: {
        ...createState().metadata,
        reminderDelivery: normalizeReminderDelivery({
          lastWeeklySummarySentDate: '2026-04-14',
          emailByProblemId: {}
        })
      }
    });

    const acceptedOnlySummary: WeeklySummaryStats = {
      totalProblems: 5,
      dueCount: 2,
      overdueCount: 1,
      reviewedProblemsThisWeekCount: 0,
      acceptedProblemsThisWeekCount: 1,
      dailyReviewPoints: []
    };

    expect(shouldSendWeeklySummary(state, '2026-04-21', acceptedOnlySummary)).toBe(true);
  });

  it('does not send weekly summary when recipient email is missing', () => {
    const state = createState({
      settings: {
        ...createState().settings,
        reminders: {
          enabled: true,
          dailyReminderTime: '10:00',
          notifyOverdue: true,
          overdueThresholdDays: 3
        },
        emailWebhook: {
          enabled: true
        }
      },
      metadata: {
        ...createState().metadata,
        reminderDelivery: normalizeReminderDelivery({
          lastWeeklySummarySentDate: '2026-04-14',
          emailByProblemId: {}
        })
      }
    });

    expect(shouldSendWeeklySummary(state, '2026-04-21', weeklySummary)).toBe(false);
  });

  it('does not send weekly summary when no problems were accepted this week', () => {
    const state = createState({
      settings: {
        ...createState().settings,
        reminders: {
          enabled: true,
          dailyReminderTime: '10:00',
          notifyOverdue: true,
          overdueThresholdDays: 3
        },
        emailWebhook: {
          enabled: true,
          toEmail: 'review@example.com'
        }
      },
      metadata: {
        ...createState().metadata,
        reminderDelivery: normalizeReminderDelivery({
          lastWeeklySummarySentDate: '2026-04-14',
          emailByProblemId: {}
        })
      }
    });

    const noActivitySummary: WeeklySummaryStats = {
      totalProblems: 5,
      dueCount: 2,
      overdueCount: 1,
      reviewedProblemsThisWeekCount: 3,
      acceptedProblemsThisWeekCount: 0,
      dailyReviewPoints: []
    };

    // 超过 7 天但没有新增 AC，不发。
    expect(shouldSendWeeklySummary(state, '2026-04-21', noActivitySummary)).toBe(false);
  });

  it('updates daily notification and weekly summary metadata', () => {
    const baseState = createState();
    const afterNotification = markDailyNotificationSent(baseState, '2026-04-21', '2026-04-21T10:00:00.000Z');
    expect(shouldSendDailyNotification(afterNotification, '2026-04-21')).toBe(false);

    const afterWeeklySummary = markWeeklySummarySent(afterNotification, '2026-04-21', '2026-04-21T10:05:00.000Z');
    expect(afterWeeklySummary.metadata.reminderDelivery?.lastWeeklySummarySentDate).toBe('2026-04-21');

    const afterFailure = markEmailFailure(afterWeeklySummary, 'weekly-summary', new Error('timeout'), '2026-04-21T10:06:00.000Z');
    expect(afterFailure.metadata.reminderDelivery?.emailByProblemId['weekly-summary']).toMatchObject({
      failureCount: 1,
      lastError: 'timeout'
    });
  });
});
