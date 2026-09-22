import {
  selectDailyRemainingProblems,
  selectDueProblems,
  selectReviewStats,
  selectTodayCompletedProblems
} from '../shared/review/selectors';
import type {
  ExtensionStorageState,
  Locale,
  PetSize,
  Problem,
  ProblemNote,
  ReviewLog,
  ReviewPolicy,
  ReviewStats,
  DueProblem
} from '../shared/types';

export interface PopupDailyPlanData {
  locale: Locale;
  dailyReviewLimit: number;
  dueProblems: DueProblem[];
  dailyRemainingProblems: DueProblem[];
  totalDailyRemainingCount: number;
  completedTodayProblems: Problem[];
  allProblems: Problem[];
  stats: ReviewStats;
  notesByProblemId: Record<string, ProblemNote>;
}

export interface ContentSettingsData {
  locale: Locale;
  autoShowAcceptedModal: boolean;
  petSize: PetSize;
}

export interface ProblemReviewContextData {
  problem?: Problem;
  lastLog?: ReviewLog;
  reviewPolicy: ReviewPolicy;
}

interface ReminderScheduleData {
  enabled: boolean;
  dailyReminderTime: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

/** Read the non-sensitive settings that an already-open content tab may apply live. */
export function readContentSettingsData(value: unknown): ContentSettingsData | undefined {
  const settings = asRecord(asRecord(value)?.settings);
  const locale = settings?.locale;
  const autoShowAcceptedModal = settings?.autoShowAcceptedModal;
  const petSize = settings?.petSize;
  if (
    (locale !== 'en' && locale !== 'zh-CN') ||
    typeof autoShowAcceptedModal !== 'boolean' ||
    (petSize !== 'small' && petSize !== 'medium' && petSize !== 'large')
  ) {
    return undefined;
  }
  return { locale, autoShowAcceptedModal, petSize };
}

function readReminderScheduleData(value: unknown): ReminderScheduleData | undefined {
  const reminders = asRecord(asRecord(asRecord(value)?.settings)?.reminders);
  if (typeof reminders?.enabled !== 'boolean' || typeof reminders.dailyReminderTime !== 'string') {
    return undefined;
  }
  return {
    enabled: reminders.enabled,
    dailyReminderTime: reminders.dailyReminderTime
  };
}

/** Ignore unrelated state writes when deciding whether the daily alarm needs rescheduling. */
export function reminderScheduleChanged(previousValue: unknown, nextValue: unknown): boolean {
  const previous = readReminderScheduleData(previousValue);
  const next = readReminderScheduleData(nextValue);
  return previous?.enabled !== next?.enabled || previous?.dailyReminderTime !== next?.dailyReminderTime;
}

export function isValidProblemId(value: unknown): value is string {
  return typeof value === 'string' && /^(leetcode|leetcode-cn):[a-z0-9][a-z0-9-]{0,199}$/.test(value);
}

/** Runtime open requests are limited to the two LeetCode origins used by the extension. */
export function normalizeSafeLeetCodeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    const allowedHosts = new Set(['leetcode.com', 'www.leetcode.com', 'leetcode.cn', 'www.leetcode.cn']);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username || url.password) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function buildPopupDailyPlanData(state: ExtensionStorageState, now = new Date()): PopupDailyPlanData {
  const totalDailyRemainingProblems = selectDailyRemainingProblems(state, now);
  const completedTodayProblems = selectTodayCompletedProblems(state, now);
  const remainingGoalSlots = Math.max(0, state.settings.dailyReviewLimit - completedTodayProblems.length);
  return {
    locale: state.settings.locale,
    dailyReviewLimit: state.settings.dailyReviewLimit,
    dueProblems: selectDueProblems(state, now),
    dailyRemainingProblems: totalDailyRemainingProblems.slice(0, remainingGoalSlots),
    totalDailyRemainingCount: totalDailyRemainingProblems.length,
    completedTodayProblems,
    allProblems: Object.values(state.problemsById)
      .filter((problem) => !problem.archived)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    stats: selectReviewStats(state, now),
    notesByProblemId: state.notesByProblemId
  };
}

export function buildContentSettingsData(state: ExtensionStorageState): ContentSettingsData {
  return {
    locale: state.settings.locale,
    autoShowAcceptedModal: state.settings.autoShowAcceptedModal,
    petSize: state.settings.petSize
  };
}

export function buildProblemReviewContextData(
  state: ExtensionStorageState,
  problemId: string
): ProblemReviewContextData {
  let lastLog: ReviewLog | undefined;
  for (const log of Object.values(state.reviewLogsById)) {
    if (log.problemId === problemId && (!lastLog || log.reviewedAt > lastLog.reviewedAt)) {
      lastLog = log;
    }
  }
  return {
    problem: state.problemsById[problemId],
    lastLog,
    reviewPolicy: state.settings.reviewPolicy
  };
}

export function buildProblemNoteData(state: ExtensionStorageState, problemId: string): ProblemNote | undefined {
  return state.notesByProblemId[problemId];
}
