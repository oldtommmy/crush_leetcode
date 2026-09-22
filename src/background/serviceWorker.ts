import {
  isDailyAlarm,
  isSecureSyncAlarm,
  scheduleDailyAlarm,
  scheduleSecureSyncAlarm
} from './alarms';
import { sendWeeklySummaryEmail } from './emailWebhook';
import { notifyDailyPlan, notifyTest, notifyWeeklyReportExported } from './notifications';
import { exportWeeklyReportHtml } from './weeklyReportExport';
import { getHotQuestionsRuntimeData, updateHotQuestionCompany } from './hotQuestions';
import { getCachedJson } from './remoteJsonCache';
import { createSingleFlight } from './singleFlight';
import { secureAutoSyncScheduler, shouldScheduleSecureAutoSync } from '../shared/sync/autoSync';
import { todayDateString } from '../shared/date';
import { applyReview } from '../shared/review/scheduler';
import { isTrustedAnnouncementDownloadUrl, normalizeAnnouncement, shouldShowAnnouncement } from '../shared/announcements';
import { normalizeDailyCompletionMessages } from '../shared/dailyCompletionMessages';
import {
  selectDailyRemainingProblems,
  selectDueProblems,
  selectTodayCompletedProblems,
  selectWeeklySummaryStats
} from '../shared/review/selectors';
import {
  markDailyNotificationSent,
  markEmailFailure,
  markWeeklySummarySent,
  markWeeklyReportExported,
  shouldSendDailyNotification,
  shouldSendWeeklySummary,
  shouldExportWeeklyReport
} from '../shared/reminders/delivery';
import {
  getState,
  importState,
  previewImportState,
  saveNote,
  setState,
  updateState
} from '../shared/storage/chromeStorage';
import type { AnnouncementAction, DueProblem, RuntimeRequest, RuntimeResponse } from '../shared/types';
import {
  ANNOUNCEMENTS_URL,
  DAILY_COMPLETION_MESSAGES_URL,
  MAX_DAILY_REVIEW_LIMIT,
  MIN_DAILY_REVIEW_LIMIT,
  STORAGE_KEY
} from '../shared/constants';
import {
  buildContentSettingsData,
  buildPopupDailyPlanData,
  buildProblemNoteData,
  buildProblemReviewContextData,
  isValidProblemId,
  normalizeSafeLeetCodeUrl,
  reminderScheduleChanged
} from './runtimeData';

const ANNOUNCEMENT_CACHE_KEY = 'quizRecallRemoteAnnouncement';
const DAILY_COMPLETION_CACHE_KEY = 'quizRecallRemoteDailyCompletion';
const REMOTE_CONFIG_TTL_MS = 5 * 60 * 1000;

let reviewWriteQueue: Promise<unknown> = Promise.resolve();

function normalizeDailyReviewLimitInput(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return MIN_DAILY_REVIEW_LIMIT;
  }

  return Math.min(MAX_DAILY_REVIEW_LIMIT, Math.max(MIN_DAILY_REVIEW_LIMIT, Math.round(value)));
}

function requestPayload(request: RuntimeRequest): Record<string, unknown> | undefined {
  const payload = (request as { payload?: unknown }).payload;
  return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : undefined;
}

function requireProblemId(request: RuntimeRequest): string {
  const problemId = requestPayload(request)?.problemId;
  if (!isValidProblemId(problemId)) {
    throw new Error('Invalid problemId payload.');
  }
  return problemId;
}

function requireSafeLeetCodeUrl(request: RuntimeRequest): string {
  const url = normalizeSafeLeetCodeUrl(requestPayload(request)?.url);
  if (!url) {
    throw new Error('Unsupported URL.');
  }
  return url;
}

function enqueueReviewWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = reviewWriteQueue.then(task, task);
  reviewWriteQueue = next.catch(() => undefined);
  return next;
}

async function performReminderCheck(): Promise<DueProblem[]> {
  const state = await getState();
  const now = new Date();
  const today = todayDateString(now);
  const dueProblems = selectDueProblems(state, now);
  const completedTodayProblems = selectTodayCompletedProblems(state, now);
  const remainingGoalSlots = Math.max(0, state.settings.dailyReviewLimit - completedTodayProblems.length);
  const dailyRemainingProblems = selectDailyRemainingProblems(state, now, remainingGoalSlots);
  const timestamp = now.toISOString();

  // A2: side effects (notify / email / export) can take a while; other contexts
  // may write during those awaits. So we never write back the whole `state`
  // snapshot captured above. Instead each marker is committed through
  // updateState, which re-reads fresh state and only touches the delivery
  // metadata fields, leaving concurrent problem/settings edits intact.

  if (state.settings.reminders.enabled && dailyRemainingProblems.length > 0 && shouldSendDailyNotification(state, today)) {
    try {
      await notifyDailyPlan(dailyRemainingProblems, state.settings.locale);
      await updateState((latest) => markDailyNotificationSent(latest, today, timestamp));
    } catch (error) {
      console.warn('Failed to create daily review notification.', error);
    }
  }

  const weeklySummary = selectWeeklySummaryStats(state);
  if (shouldSendWeeklySummary(state, today, weeklySummary)) {
    const attemptTimestamp = new Date().toISOString();
    try {
      await sendWeeklySummaryEmail(weeklySummary, dueProblems, state.settings.emailWebhook, state.settings.locale);
      await updateState((latest) =>
        markWeeklySummarySent(
          {
            ...latest,
            settings: {
              ...latest.settings,
              emailWebhook: {
                ...latest.settings.emailWebhook,
                lastSentAt: attemptTimestamp,
                lastError: undefined
              }
            }
          },
          today,
          attemptTimestamp
        )
      );
    } catch (error) {
      await updateState((latest) =>
        markEmailFailure(
          {
            ...latest,
            settings: {
              ...latest.settings,
              emailWebhook: {
                ...latest.settings.emailWebhook,
                lastError: error instanceof Error ? error.message : String(error)
              }
            }
          },
          'weekly-summary',
          error,
          attemptTimestamp
        )
      );
    }
  }

  if (shouldExportWeeklyReport(state, today, weeklySummary)) {
    const exportTimestamp = new Date().toISOString();
    try {
      const result = await exportWeeklyReportHtml(weeklySummary, dueProblems, state.settings.locale, now);
      await updateState((latest) => markWeeklyReportExported(latest, today, exportTimestamp));
      try {
        await notifyWeeklyReportExported(result.filename, state.settings.locale);
      } catch (notificationError) {
        console.warn('Weekly report exported, but notification failed.', notificationError);
      }
    } catch (error) {
      console.warn('Failed to export weekly report.', error);
    }
  }

  return dueProblems;
}

const runReminderCheck = createSingleFlight(performReminderCheck);

async function exportWeeklyReport(): Promise<{ filename: string; downloadId: number }> {
  const state = await getState();
  const now = new Date();
  const dueProblems = selectDueProblems(state, now);
  const summary = selectWeeklySummaryStats(state, now);
  if (summary.totalProblems === 0) {
    throw new Error('Add at least one problem before exporting a weekly report.');
  }

  const result = await exportWeeklyReportHtml(summary, dueProblems, state.settings.locale, now);
  // A2: commit only the export marker against fresh state, not the pre-export snapshot.
  await updateState((latest) => markWeeklyReportExported(latest, todayDateString(now), now.toISOString()));
  return result;
}

async function sendTestEmail(): Promise<void> {
  const state = await getState();
  const dueProblems = selectDueProblems(state);
  const summary = selectWeeklySummaryStats(state);
  if (summary.totalProblems === 0) {
    throw new Error('Add at least one problem before sending a test email.');
  }
  if (!state.settings.emailWebhook.toEmail?.trim()) {
    throw new Error('Set a recipient email before sending a test digest.');
  }
  if (!state.settings.emailWebhook.betaAccessCode?.trim()) {
    throw new Error('Enter the official digest beta access code from the confirmation email.');
  }
  const today = todayDateString();
  const timestamp = new Date().toISOString();

  try {
    await sendWeeklySummaryEmail(summary, dueProblems, state.settings.emailWebhook, state.settings.locale, {
      requireConfigured: true
    });
    await updateState((latest) =>
      markWeeklySummarySent(
        {
          ...latest,
          settings: {
            ...latest.settings,
            emailWebhook: {
              ...latest.settings.emailWebhook,
              lastSentAt: timestamp,
              lastError: undefined
            }
          }
        },
        today,
        timestamp
      )
    );
  } catch (error) {
    await updateState((latest) =>
      markEmailFailure(
        {
          ...latest,
          settings: {
            ...latest.settings,
            emailWebhook: {
              ...latest.settings.emailWebhook,
              lastError: error instanceof Error ? error.message : String(error)
            }
          }
        },
        'weekly-summary',
        error,
        timestamp
      )
    );
    throw error;
  }
}

function currentExtensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

async function checkAnnouncement() {
  const state = await getState();
  const cached = await getCachedJson({
    cacheKey: ANNOUNCEMENT_CACHE_KEY,
    url: ANNOUNCEMENTS_URL,
    ttlMs: REMOTE_CONFIG_TTL_MS,
    normalize: (input) => ({ announcement: normalizeAnnouncement(input) })
  });
  const announcement = cached.announcement;
  if (!announcement) return undefined;

  return shouldShowAnnouncement(
    announcement,
    currentExtensionVersion(),
    state.metadata.dismissedAnnouncementIds
  )
    ? announcement
    : undefined;
}

async function getDailyCompletionMessages() {
  return getCachedJson({
    cacheKey: DAILY_COMPLETION_CACHE_KEY,
    url: DAILY_COMPLETION_MESSAGES_URL,
    ttlMs: REMOTE_CONFIG_TTL_MS,
    normalize: normalizeDailyCompletionMessages
  });
}

async function dismissAnnouncement(noticeId: string) {
  const trimmedNoticeId = noticeId.trim();
  if (!trimmedNoticeId) return;

  await updateState((state) => ({
    ...state,
    metadata: {
      ...state.metadata,
      dismissedAnnouncementIds: [
        ...new Set([...(state.metadata.dismissedAnnouncementIds ?? []), trimmedNoticeId])
      ]
    }
  }));
}

async function openAnnouncementAction(action: AnnouncementAction) {
  const url = new URL(action.url);
  if (url.protocol !== 'https:') {
    throw new Error('Unsupported announcement URL.');
  }

  if (action.download) {
    if (!isTrustedAnnouncementDownloadUrl(url.toString())) {
      throw new Error('Untrusted announcement download URL.');
    }
    await chrome.downloads.download({
      url: url.toString()
    });
    return;
  }

  await chrome.tabs.create({ url: url.toString() });
}

async function handleMessage(request: RuntimeRequest): Promise<RuntimeResponse> {
  if (request.type === 'UPSERT_ACCEPTED_REVIEW') {
    await enqueueReviewWrite(() => updateState((state) => {
      const problemId = `${request.payload.identity.platform}:${request.payload.identity.titleSlug}`;
      
      // Find last log for this problem to support same-day rollback
      const problemLogs = Object.values(state.reviewLogsById)
        .filter(l => l.problemId === problemId)
        .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
      const lastLog = problemLogs[0];

      const result = applyReview(
        state.problemsById[problemId],
        request.payload.identity,
        request.payload.rating,
        request.payload.source,
        state.settings.reviewPolicy,
        new Date(),
        lastLog
      );

      return {
        ...state,
        problemsById: {
          ...state.problemsById,
          [result.problem.id]: result.problem
        },
        reviewLogsById: {
          ...state.reviewLogsById,
          [result.log.id]: result.log
        }
      };
    }));

    return { ok: true };
  }

  if (request.type === 'CHECK_ANNOUNCEMENT') {
    try {
      return { ok: true, data: await checkAnnouncement() };
    } catch (error) {
      console.warn('Failed to check announcement.', error);
      return { ok: true, data: undefined };
    }
  }

  if (request.type === 'GET_DAILY_COMPLETION_MESSAGES') {
    try {
      return { ok: true, data: await getDailyCompletionMessages() };
    } catch (error) {
      console.warn('Failed to fetch daily completion messages.', error);
      return { ok: true, data: undefined };
    }
  }

  if (request.type === 'DISMISS_ANNOUNCEMENT') {
    await dismissAnnouncement(request.payload.noticeId);
    return { ok: true };
  }

  if (request.type === 'OPEN_ANNOUNCEMENT_ACTION') {
    await openAnnouncementAction(request.payload.action);
    return { ok: true };
  }

  if (request.type === 'GET_POPUP_DAILY_PLAN') {
    return { ok: true, data: buildPopupDailyPlanData(await getState()) };
  }

  if (request.type === 'GET_CONTENT_SETTINGS') {
    return { ok: true, data: buildContentSettingsData(await getState()) };
  }

  if (request.type === 'GET_PROBLEM_REVIEW_CONTEXT') {
    const problemId = requireProblemId(request);
    return { ok: true, data: buildProblemReviewContextData(await getState(), problemId) };
  }

  if (request.type === 'GET_PROBLEM_NOTE') {
    const problemId = requireProblemId(request);
    return { ok: true, data: buildProblemNoteData(await getState(), problemId) };
  }

  if (request.type === 'GET_HOT_QUESTIONS') {
    const state = await getState();
    return { ok: true, data: await getHotQuestionsRuntimeData(state, { force: request.payload?.force }) };
  }

  if (request.type === 'REFRESH_HOT_QUESTIONS') {
    const state = await getState();
    return { ok: true, data: await getHotQuestionsRuntimeData(state, { force: true }) };
  }

  if (request.type === 'UPDATE_HOT_QUESTION_COMPANY') {
    const state = await getState();
    return { ok: true, data: await updateHotQuestionCompany(state, request.payload.companyId) };
  }

  if (request.type === 'UPDATE_DAILY_REVIEW_LIMIT') {
    const limit = normalizeDailyReviewLimitInput(request.payload.limit);
    await updateState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        dailyReviewLimit: limit
      }
    }));
    return { ok: true, data: { dailyReviewLimit: limit } };
  }

  if (request.type === 'SAVE_NOTE') {
    const problemId = requireProblemId(request);
    if (typeof requestPayload(request)?.markdown !== 'string') {
      throw new Error('Invalid note payload.');
    }
    const note = await saveNote(problemId, request.payload.markdown);
    return { ok: true, data: note };
  }

  if (request.type === 'OPEN_PROBLEM' || request.type === 'OPEN_URL') {
    await chrome.tabs.create({ url: requireSafeLeetCodeUrl(request) });
    return { ok: true };
  }

  if (request.type === 'SEND_TEST_EMAIL') {
    await sendTestEmail();
    return { ok: true };
  }

  if (request.type === 'EXPORT_WEEKLY_REPORT') {
    return { ok: true, data: await exportWeeklyReport() };
  }

  if (request.type === 'SEND_TEST_NOTIFICATION') {
    const state = await getState();
    return { ok: true, data: await notifyTest(state.settings.locale) };
  }

  if (request.type === 'CHECK_REMINDERS') {
    return { ok: true, data: await runReminderCheck() };
  }

  if (request.type === 'PREVIEW_IMPORT') {
    const state = await getState();
    return { ok: true, data: previewImportState(state, request.payload.input) };
  }

  if (request.type === 'IMPORT_STATE_CONFIRMED') {
    const state = await importState(request.payload.input);
    return { ok: true, data: state };
  }

  if (request.type === 'RESET_TO_TODAY') {
    const problemId = requireProblemId(request);
    await updateState((state) => {
      const problem = state.problemsById[problemId];
      if (!problem) return state;

      return {
        ...state,
        problemsById: {
          ...state.problemsById,
          [problem.id]: {
            ...problem,
            nextReviewAt: new Date().toISOString(),
            lastReviewedAt: undefined, // 核心：清除今日已复习标记
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
    return { ok: true };
  }

  if (request.type === 'ARCHIVE_PROBLEM') {
    const problemId = requireProblemId(request);
    await updateState((state) => {
      const problem = state.problemsById[problemId];
      if (!problem) return state;
      return {
        ...state,
        problemsById: {
          ...state.problemsById,
          [problem.id]: {
            ...problem,
            archived: true,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
    return { ok: true };
  }

  return { ok: false, error: 'Unknown request.' };
}

let reminderAlarmRescheduleQueue: Promise<void> = Promise.resolve();

function rescheduleDailyAlarmFromLatestState(): void {
  reminderAlarmRescheduleQueue = reminderAlarmRescheduleQueue
    .catch(() => undefined)
    .then(async () => {
      const state = await getState();
      await scheduleDailyAlarm(state.settings);
    });
  reminderAlarmRescheduleQueue.catch(console.error);
}

async function runSecureSyncAlarm(): Promise<void> {
  const state = await getState();
  const config = state.settings.cloudSync;
  if (!config.enabled || !config.recoveryCode || config.status === 'conflict') return;
  secureAutoSyncScheduler.resume();
  secureAutoSyncScheduler.schedule(state);
  await secureAutoSyncScheduler.flush();
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  const stateChange = changes[STORAGE_KEY];
  if (areaName !== 'local' || !stateChange) return;
  if (reminderScheduleChanged(stateChange.oldValue, stateChange.newValue)) {
    rescheduleDailyAlarmFromLatestState();
  }
  if (shouldScheduleSecureAutoSync(stateChange.oldValue, stateChange.newValue)) {
    scheduleSecureSyncAlarm();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  getState()
    .then((state) => scheduleDailyAlarm(state.settings))
    .catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  getState()
    .then((state) => {
      scheduleDailyAlarm(state.settings).catch(console.error);
      // 启动时检查是否需要补发周报
      runReminderCheck().catch(console.error);
    })
    .catch(console.error);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (isDailyAlarm(alarm.name)) {
    getState()
      .then(async (state) => {
        await scheduleDailyAlarm(state.settings);
        await runReminderCheck();
      })
      .catch(console.error);
    return;
  }
  if (isSecureSyncAlarm(alarm.name)) {
    runSecureSyncAlarm().catch(() => {
      console.warn('Crush LeetCode secure sync alarm failed.');
    });
  }
});

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  handleMessage(request)
    .then(sendResponse)
    .catch((error) => {
      const response: RuntimeResponse = {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
      sendResponse(response);
    });
  return true;
});
