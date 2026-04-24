import type {
  DueProblem,
  EmailProvider,
  ExtensionStorageState,
  ReminderDeliveryState,
  ReminderProblemDelivery,
  WeeklySummaryStats
} from '../types';
import { daysBetween } from '../date';

export function normalizeReminderDelivery(input?: Partial<ReminderDeliveryState>): ReminderDeliveryState {
  const emailByProblemId: ReminderDeliveryState['emailByProblemId'] = {};

  for (const [problemId, delivery] of Object.entries(input?.emailByProblemId ?? {})) {
    emailByProblemId[problemId] = normalizeProblemDelivery(problemId, delivery);
  }

  return {
    lastDailyNotificationDate: input?.lastDailyNotificationDate,
    lastWeeklySummarySentDate: input?.lastWeeklySummarySentDate,
    emailByProblemId
  };
}

export function normalizeProblemDelivery(
  problemId: string,
  input?: Partial<ReminderProblemDelivery>
): ReminderProblemDelivery {
  return {
    problemId: input?.problemId ?? problemId,
    lastSentAt: input?.lastSentAt,
    lastSentDate: input?.lastSentDate,
    provider: input?.provider,
    successCount: input?.successCount ?? 0,
    failureCount: input?.failureCount ?? 0,
    lastErrorAt: input?.lastErrorAt,
    lastError: input?.lastError
  };
}

export function shouldSendDailyNotification(state: ExtensionStorageState, today: string): boolean {
  return state.metadata.reminderDelivery?.lastDailyNotificationDate !== today;
}

export function shouldSendWeeklySummary(
  state: ExtensionStorageState,
  today: string,
  summary: WeeklySummaryStats
): boolean {
  if (
    !state.settings.reminders.enabled ||
    !state.settings.reminders.notifyOverdue ||
    !state.settings.emailWebhook.enabled
  ) {
    return false;
  }

  // 最近7天没有刷题，不发周报（避免用户未刷题期也发送）
  if (summary.reviewedProblemsThisWeekCount === 0) {
    return false;
  }

  const lastWeeklySummarySentDate = normalizeReminderDelivery(state.metadata.reminderDelivery).lastWeeklySummarySentDate;
  if (!lastWeeklySummarySentDate) {
    return true;
  }

  // 距离上次发送超过7天，且有刷题记录，则补发
  return daysBetween(lastWeeklySummarySentDate, today) >= 7;
}

export function markDailyNotificationSent(
  state: ExtensionStorageState,
  today: string,
  timestamp: string
): ExtensionStorageState {
  return {
    ...state,
    metadata: {
      ...state.metadata,
      lastNotificationAt: timestamp,
      reminderDelivery: {
        ...normalizeReminderDelivery(state.metadata.reminderDelivery),
        lastDailyNotificationDate: today
      }
    }
  };
}

export function markWeeklySummarySent(
  state: ExtensionStorageState,
  today: string,
  timestamp: string
): ExtensionStorageState {
  return {
    ...state,
    metadata: {
      ...state.metadata,
      lastNotificationAt: timestamp,
      reminderDelivery: {
        ...normalizeReminderDelivery(state.metadata.reminderDelivery),
        lastWeeklySummarySentDate: today
      }
    }
  };
}

export function markEmailSent(
  state: ExtensionStorageState,
  problemId: string,
  provider: EmailProvider,
  today: string,
  timestamp: string
): ExtensionStorageState {
  const delivery = normalizeReminderDelivery(state.metadata.reminderDelivery);
  const existing = normalizeProblemDelivery(problemId, delivery.emailByProblemId[problemId]);

  return {
    ...state,
    metadata: {
      ...state.metadata,
      reminderDelivery: {
        ...delivery,
        emailByProblemId: {
          ...delivery.emailByProblemId,
          [problemId]: {
            ...existing,
            lastSentAt: timestamp,
            lastSentDate: today,
            provider,
            successCount: existing.successCount + 1,
            lastErrorAt: undefined,
            lastError: undefined
          }
        }
      }
    }
  };
}

export function markEmailFailure(
  state: ExtensionStorageState,
  problemId: string,
  error: unknown,
  timestamp: string
): ExtensionStorageState {
  const delivery = normalizeReminderDelivery(state.metadata.reminderDelivery);
  const existing = normalizeProblemDelivery(problemId, delivery.emailByProblemId[problemId]);

  return {
    ...state,
    metadata: {
      ...state.metadata,
      reminderDelivery: {
        ...delivery,
        emailByProblemId: {
          ...delivery.emailByProblemId,
          [problemId]: {
            ...existing,
            failureCount: existing.failureCount + 1,
            lastErrorAt: timestamp,
            lastError: error instanceof Error ? error.message : String(error)
          }
        }
      }
    }
  };
}
