import type { ExtensionStorageState, Locale, PetSize, ReviewPolicy, UserSettings } from './types';

declare const __CRUSH_ANNOUNCEMENTS_URL__: string | undefined;
declare const __CRUSH_DAILY_COMPLETION_MESSAGES_URL__: string | undefined;
declare const __CRUSH_CODETOP_BASE_URL__: string | undefined;
declare const __CRUSH_SUPABASE_URL__: string | undefined;
declare const __CRUSH_SUPABASE_ANON_KEY__: string | undefined;

export const STORAGE_KEY = 'quizRecallState';
export const STORAGE_VERSION = 2;
export const HOT_QUESTIONS_CACHE_KEY = 'crushLC.hotQuestionsCache';
export const DAILY_ALARM_NAME = 'quizRecall.dailyReminder';
export const DEFAULT_DAILY_REVIEW_LIMIT = 10;
export const MIN_DAILY_REVIEW_LIMIT = 1;
export const MAX_DAILY_REVIEW_LIMIT = 50;
export const PET_SIZE_PIXELS: Record<PetSize, number> = {
  small: 36,
  medium: 44,
  large: 52
};
export const DEFAULT_PET_SIZE: PetSize = 'medium';
export const FSRS_MAX_INTERVAL_DAYS = 365;
export const ANNOUNCEMENTS_URL =
  __CRUSH_ANNOUNCEMENTS_URL__?.trim() ||
  'https://mail.crushlc.site/extension/announcements.json';
export const DAILY_COMPLETION_MESSAGES_URL =
  __CRUSH_DAILY_COMPLETION_MESSAGES_URL__?.trim() ||
  'https://mail.crushlc.site/extension/daily-completion-messages.json';
export const CODETOP_BASE_URL =
  (__CRUSH_CODETOP_BASE_URL__?.trim() || 'https://mail.crushlc.site/codetop').replace(/\/+$/, '');
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
  petSize: DEFAULT_PET_SIZE,
  dailyReviewLimit: DEFAULT_DAILY_REVIEW_LIMIT
};

/**
 * First-run default locale follows Chrome's UI language:
 * zh-* (zh-CN / zh-TW / zh-HK ...) -> 'zh-CN', anything else -> 'en'.
 * Falls back to 'en' outside an extension context (e.g. tests) or on API errors.
 */
export function detectDefaultLocale(): Locale {
  try {
    const ui =
      typeof chrome !== 'undefined' &&
      chrome.i18n &&
      typeof chrome.i18n.getUILanguage === 'function'
        ? chrome.i18n.getUILanguage()
        : '';
    return ui.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  } catch {
    return 'en';
  }
}

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
