import type { ExtensionStorageState, ReviewPolicy, UserSettings } from './types';

declare const __CRUSH_ANNOUNCEMENTS_URL__: string | undefined;
declare const __CRUSH_DAILY_COMPLETION_MESSAGES_URL__: string | undefined;
declare const __CRUSH_SUPABASE_URL__: string | undefined;
declare const __CRUSH_SUPABASE_ANON_KEY__: string | undefined;

export const STORAGE_KEY = 'quizRecallState';
export const STORAGE_VERSION = 1;
export const DAILY_ALARM_NAME = 'quizRecall.dailyReminder';
export const DEFAULT_DAILY_REVIEW_LIMIT = 10;
export const MIN_DAILY_REVIEW_LIMIT = 1;
export const MAX_DAILY_REVIEW_LIMIT = 50;
export const FSRS_MAX_INTERVAL_DAYS = 365;
export const ANNOUNCEMENTS_URL =
  __CRUSH_ANNOUNCEMENTS_URL__?.trim() ||
  'https://mail.crushlc.site/extension/announcements.json';
export const DAILY_COMPLETION_MESSAGES_URL =
  __CRUSH_DAILY_COMPLETION_MESSAGES_URL__?.trim() ||
  'https://mail.crushlc.site/extension/daily-completion-messages.json';
export const CRUSH_SUPABASE_URL = __CRUSH_SUPABASE_URL__?.trim() || '';
export const CRUSH_SUPABASE_ANON_KEY = __CRUSH_SUPABASE_ANON_KEY__?.trim() || '';

export const DEFAULT_REVIEW_POLICY: ReviewPolicy = {
  baseIntervalsDays: [1, 2, 4, 7, 14, 30, 60, 120],
  ratingAdjustments: {
    too_easy: {
      stageDelta: 1,
      intervalMultiplier: 1.3
    },
    normal: {
      stageDelta: 1,
      intervalMultiplier: 1
    },
    hard: {
      stageDelta: -1,
      intervalMultiplier: 0.5
    },
    no_clue: {
      stageDelta: 0,
      fixedIntervalDays: 1
    }
  }
};

export const DEFAULT_SETTINGS: UserSettings = {
  autoShowAcceptedModal: true,
  locale: 'en',
  reviewPolicy: DEFAULT_REVIEW_POLICY,
  reminders: {
    enabled: true,
    dailyReminderTime: '10:00',
    notifyOverdue: true,
    overdueThresholdDays: 3,
    weeklyReportExportEnabled: false
  },
  emailWebhook: {
    enabled: false
  },
  cloudSync: {
    enabled: false
  },
  themeMode: 'system',
  dailyReviewLimit: DEFAULT_DAILY_REVIEW_LIMIT
};

export const DEFAULT_STATE: ExtensionStorageState = {
  version: STORAGE_VERSION,
  problemsById: {},
  reviewLogsById: {},
  notesByProblemId: {},
  settings: DEFAULT_SETTINGS,
  metadata: {
    storageBackend: 'local',
    reminderDelivery: {
      lastWeeklyReportExportedDate: undefined,
      emailByProblemId: {}
    }
  }
};
