import { isDailyAlarm, scheduleDailyAlarm } from './alarms';
import { sendWeeklySummaryEmail } from './emailWebhook';
import { notifyDailyPlan, notifyTest, notifyWeeklyReportExported } from './notifications';
import { exportWeeklyReportHtml } from './weeklyReportExport';
import { getHotQuestionsRuntimeData, updateHotQuestionCompany } from './hotQuestions';
import { todayDateString } from '../shared/date';
import { applyReview } from '../shared/review/scheduler';
import { normalizeAnnouncement, shouldShowAnnouncement } from '../shared/announcements';
import { normalizeDailyCompletionMessages } from '../shared/dailyCompletionMessages';
import {
  selectDailyRemainingProblems,
  selectDueProblems,
  selectReviewStats,
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
import type { AnnouncementAction, DueProblem, ReviewLog, RuntimeRequest, RuntimeResponse } from '../shared/types';
import {
  ANNOUNCEMENTS_URL,
  DAILY_COMPLETION_MESSAGES_URL,
  MAX_DAILY_REVIEW_LIMIT,
  MIN_DAILY_REVIEW_LIMIT
} from '../shared/constants';

let reviewWriteQueue: Promise<unknown> = Promise.resolve();

function normalizeDailyReviewLimitInput(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return MIN_DAILY_REVIEW_LIMIT;
  }

  return Math.min(MAX_DAILY_REVIEW_LIMIT, Math.max(MIN_DAILY_REVIEW_LIMIT, Math.round(value)));
}

function enqueueReviewWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = reviewWriteQueue.then(task, task);
  reviewWriteQueue = next.catch(() => undefined);
  return next;
}

async function runReminderCheck(): Promise<DueProblem[]> {
  let state = await getState();
  const now = new Date();
  const today = todayDateString(now);
  const dueProblems = selectDueProblems(state, now);
  const completedTodayProblems = selectTodayCompletedProblems(state, now);
  const remainingGoalSlots = Math.max(0, state.settings.dailyReviewLimit - completedTodayProblems.length);
  const dailyRemainingProblems = selectDailyRemainingProblems(state, now, remainingGoalSlots);
  const timestamp = now.toISOString();

  if (state.settings.reminders.enabled && dailyRemainingProblems.length > 0 && shouldSendDailyNotification(state, today)) {
    try {
      await notifyDailyPlan(dailyRemainingProblems, state.settings.locale);
      state = markDailyNotificationSent(state, today, timestamp);
      await setState(state);
    } catch (error) {
      console.warn('Failed to create daily review notification.', error);
    }
  }

  const weeklySummary = selectWeeklySummaryStats(state);
  if (shouldSendWeeklySummary(state, today, weeklySummary)) {
    const attemptTimestamp = new Date().toISOString();
    try {
      await sendWeeklySummaryEmail(weeklySummary, dueProblems, state.settings.emailWebhook, state.settings.locale);
      const nextState = markWeeklySummarySent(
        {
          ...state,
          settings: {
            ...state.settings,
            emailWebhook: {
              ...state.settings.emailWebhook,
              lastSentAt: attemptTimestamp,
              lastError: undefined
            }
          }
        },
        today,
        attemptTimestamp
      );
      await setState(nextState);
      state = nextState;
    } catch (error) {
      const nextState = markEmailFailure(
        {
          ...state,
          settings: {
            ...state.settings,
            emailWebhook: {
              ...state.settings.emailWebhook,
              lastError: error instanceof Error ? error.message : String(error)
            }
          }
        },
        'weekly-summary',
        error,
        attemptTimestamp
      );
      await setState(nextState);
      state = nextState;
    }
  }

  if (shouldExportWeeklyReport(state, today, weeklySummary)) {
    const exportTimestamp = new Date().toISOString();
    try {
      const result = await exportWeeklyReportHtml(weeklySummary, dueProblems, state.settings.locale, now);
      const nextState = markWeeklyReportExported(state, today, exportTimestamp);
      await setState(nextState);
      state = nextState;
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

async function exportWeeklyReport(): Promise<{ filename: string; downloadId: number }> {
  let state = await getState();
  const now = new Date();
  const dueProblems = selectDueProblems(state, now);
  const summary = selectWeeklySummaryStats(state, now);
  if (summary.totalProblems === 0) {
    throw new Error('Add at least one problem before exporting a weekly report.');
  }

  const result = await exportWeeklyReportHtml(summary, dueProblems, state.settings.locale, now);
  state = markWeeklyReportExported(state, todayDateString(now), now.toISOString());
  await setState(state);
  return result;
}

async function sendTestEmail(): Promise<void> {
  let state = await getState();
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
    state = markWeeklySummarySent(
      {
        ...state,
        settings: {
          ...state.settings,
          emailWebhook: {
            ...state.settings.emailWebhook,
            lastSentAt: timestamp,
            lastError: undefined
          }
        }
      },
      today,
      timestamp
    );
    await setState(state);
  } catch (error) {
    state = markEmailFailure(
      {
        ...state,
        settings: {
          ...state.settings,
          emailWebhook: {
            ...state.settings.emailWebhook,
            lastError: error instanceof Error ? error.message : String(error)
          }
        }
      },
        'weekly-summary',
        error,
        timestamp
      );
    await setState(state);
    throw error;
  }
}

function currentExtensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

async function checkAnnouncement() {
  const state = await getState();
  const response = await fetch(ANNOUNCEMENTS_URL, {
    cache: 'no-store',
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Announcement request failed: ${response.status}`);
  }

  const announcement = normalizeAnnouncement(await response.json());
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
  const response = await fetch(DAILY_COMPLETION_MESSAGES_URL, {
    cache: 'no-store',
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Daily completion messages request failed: ${response.status}`);
  }

  return normalizeDailyCompletionMessages(await response.json());
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
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Unsupported announcement URL.');
  }

  if (action.download) {
    await chrome.downloads.download({
      url: url.toString()
    });
    return;
  }

  await chrome.tabs.create({ url: url.toString() });
}

async function handleMessage(request: RuntimeRequest): Promise<RuntimeResponse> {
  if (request.type === 'UPSERT_ACCEPTED_REVIEW') {
    const nextState = await enqueueReviewWrite(() => updateState((state) => {
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

    return { ok: true, data: nextState };
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

  if (request.type === 'GET_DAILY_PLAN') {
    const state = await getState();
    const totalDailyRemainingProblems = selectDailyRemainingProblems(state);
    const completedTodayProblems = selectTodayCompletedProblems(state);
    const remainingGoalSlots = Math.max(0, state.settings.dailyReviewLimit - completedTodayProblems.length);
    
    // Create a map of problemId -> lastLog for UI preview rollback support
    const lastLogsByProblemId: Record<string, ReviewLog> = {};
    Object.values(state.reviewLogsById).forEach(log => {
      const existing = lastLogsByProblemId[log.problemId];
      if (!existing || log.reviewedAt > existing.reviewedAt) {
        lastLogsByProblemId[log.problemId] = log;
      }
    });

    return {
      ok: true,
      data: {
        state,
        dueProblems: selectDueProblems(state),
        dailyRemainingProblems: totalDailyRemainingProblems.slice(0, remainingGoalSlots),
        totalDailyRemainingCount: totalDailyRemainingProblems.length,
        completedTodayProblems,
        allProblems: Object.values(state.problemsById).filter(p => !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        stats: selectReviewStats(state),
        lastLogsByProblemId
      }
    };
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
    const nextState = await updateState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        dailyReviewLimit: limit
      }
    }));
    return { ok: true, data: nextState };
  }

  if (request.type === 'SAVE_NOTE') {
    const note = await saveNote(request.payload.problemId, request.payload.markdown);
    return { ok: true, data: note };
  }

  if (request.type === 'OPEN_PROBLEM' || request.type === 'OPEN_URL') {
    await chrome.tabs.create({ url: request.payload.url });
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
    await scheduleDailyAlarm(state.settings);
    return { ok: true, data: state };
  }

  if (request.type === 'RESET_TO_TODAY') {
    const nextState = await updateState((state) => {
      const problem = state.problemsById[request.payload.problemId];
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
    return { ok: true, data: nextState };
  }

  if (request.type === 'ARCHIVE_PROBLEM') {
    const nextState = await updateState((state) => {
      const problem = state.problemsById[request.payload.problemId];
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
    return { ok: true, data: nextState };
  }

  return { ok: false, error: 'Unknown request.' };
}

chrome.runtime.onInstalled.addListener(() => {
  getState()
    .then((state) => scheduleDailyAlarm(state.settings))
    .catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  getState()
    .then((state) => {
      scheduleDailyAlarm(state.settings);
      // 启动时检查是否需要补发周报
      runReminderCheck().catch(console.error);
    })
    .catch(console.error);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (isDailyAlarm(alarm.name)) {
    runReminderCheck().catch(console.error);
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
