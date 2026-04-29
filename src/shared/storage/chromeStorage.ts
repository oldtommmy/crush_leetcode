import {
  DEFAULT_DAILY_REVIEW_LIMIT,
  DEFAULT_STATE,
  MAX_DAILY_REVIEW_LIMIT,
  MIN_DAILY_REVIEW_LIMIT,
  STORAGE_KEY
} from '../constants';
import { problemIdFor } from '../review/scheduler';
import { FSRSScheduler } from '../review/fsrsScheduler';
import { normalizeReminderDelivery } from '../reminders/delivery';
import {
  DebugScenarioPreset,
  ExtensionStorageState,
  FSRSState,
  ImportPreview,
  Problem,
  ProblemNote,
  ReviewLog,
  ReviewPolicy
} from '../types';
// configEncryption removed - API key now built-in
import { EmailWebhookSettings } from '../types';

export const DEBUG_SCENARIO_PRESETS: DebugScenarioPreset[] = ['empty', 'mixed', 'overdue', 'import_preview'];
const DEBUG_TOOLS_ENABLED = true;
export const MAX_NOTE_MARKDOWN_BYTES = 200 * 1024;
const DEFAULT_LOCAL_STORAGE_QUOTA_BYTES = 10 * 1024 * 1024;
const STORAGE_QUOTA_HEADROOM_RATIO = 0.9;

let stateWriteQueue: Promise<unknown> = Promise.resolve();

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function assertNoteSize(markdown: string): void {
  const size = byteLength(markdown);
  if (size > MAX_NOTE_MARKDOWN_BYTES) {
    throw new Error(`Note is too large (${Math.ceil(size / 1024)}KB). Keep each note under ${MAX_NOTE_MARKDOWN_BYTES / 1024}KB.`);
  }
}

function localStorageQuotaBytes(): number {
  return (chrome.storage.local as { QUOTA_BYTES?: number }).QUOTA_BYTES ?? DEFAULT_LOCAL_STORAGE_QUOTA_BYTES;
}

function assertStateFitsStorage(state: ExtensionStorageState): void {
  const payload = {
    [STORAGE_KEY]: {
      ...state,
      metadata: {
        ...state.metadata,
        storageBackend: 'local'
      }
    }
  };
  const size = byteLength(JSON.stringify(payload));
  const softLimit = Math.floor(localStorageQuotaBytes() * STORAGE_QUOTA_HEADROOM_RATIO);
  if (size > softLimit) {
    throw new Error(`Storage is near capacity (${Math.ceil(size / 1024)}KB). Export a backup and reduce large notes before saving more data.`);
  }
}

function enqueueStateWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = stateWriteQueue.then(task, task);
  stateWriteQueue = next.catch(() => undefined);
  return next;
}

function isValidDateInput(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function normalizeDate(value: unknown, fallback: string): string {
  return isValidDateInput(value) ? value : fallback;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeDailyReviewLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_DAILY_REVIEW_LIMIT;
  }

  return Math.min(MAX_DAILY_REVIEW_LIMIT, Math.max(MIN_DAILY_REVIEW_LIMIT, Math.round(value)));
}

function normalizeState(value: unknown, fallback: FSRSState): FSRSState {
  return value === FSRSState.New ||
    value === FSRSState.Learning ||
    value === FSRSState.Review ||
    value === FSRSState.Relearning
    ? value
    : fallback;
}

function normalizeProblem(problem: any, policy: ReviewPolicy): Problem {
  const timestamp = new Date().toISOString();
  const fallbackState = (problem.reviewStage ?? 0) > 0 ? FSRSState.Review : FSRSState.New;
  const nextReviewAt = normalizeDate(problem.nextReviewAt, timestamp);
  const lastReviewedAt = isValidDateInput(problem.lastReviewedAt) ? problem.lastReviewedAt : undefined;
  const lastReviewAt = isValidDateInput(problem.lastReviewAt) ? problem.lastReviewAt : lastReviewedAt;
  const fallbackStability = FSRSScheduler.estimateStabilityFromStage(problem.reviewStage ?? 0, policy.baseIntervalsDays);
  const base = {
    ...problem,
    nextReviewAt,
    lastReviewedAt,
    lastReviewAt,
    firstAcceptedAt: normalizeDate(problem.firstAcceptedAt, timestamp),
    lastAcceptedAt: normalizeDate(problem.lastAcceptedAt, timestamp),
    createdAt: normalizeDate(problem.createdAt, timestamp),
    updatedAt: normalizeDate(problem.updatedAt, timestamp),

    stability: normalizePositiveNumber(problem.stability, fallbackStability),
    difficultyScore: normalizePositiveNumber(problem.difficultyScore, 5),
    elapsedDays: normalizeNonNegativeNumber(problem.elapsedDays, 0),
    scheduledDays: normalizeNonNegativeNumber(problem.scheduledDays, problem.currentIntervalDays ?? 0),
    reps: normalizeNonNegativeNumber(problem.reps, problem.reviewCount ?? 0),
    lapses: normalizeNonNegativeNumber(problem.lapses, 0),
    learning_steps: normalizeNonNegativeNumber(problem.learning_steps, 0),
    state: normalizeState(problem.state, fallbackState),
    
    // Legacy field fallbacks
    reviewStage: problem.reviewStage ?? 0,
    currentIntervalDays: problem.currentIntervalDays ?? 0,
    easeFactor: problem.easeFactor ?? 1,
  };

  return base as Problem;
}

function normalizeReviewLog(log: any): ReviewLog {
  const timestamp = new Date().toISOString();
  const reviewedAt = normalizeDate(log.reviewedAt, timestamp);
  const generatedDueAt = normalizeDate(log.generatedDueAt ?? log.nextReviewAt, reviewedAt);
  return {
    ...log,
    reviewedAt,
    fsrsDueAt: normalizeDate(log.fsrsDueAt ?? log.previousNextReviewAt ?? log.generatedDueAt ?? log.nextReviewAt, reviewedAt),
    generatedDueAt,
    nextReviewAt: normalizeDate(log.nextReviewAt ?? generatedDueAt, generatedDueAt),
    createdAt: normalizeDate(log.createdAt, reviewedAt),
    stability: normalizePositiveNumber(log.stability, 1),
    difficultyScore: normalizePositiveNumber(log.difficultyScore, 5),
    elapsedDays: normalizeNonNegativeNumber(log.elapsedDays, 0),
    lastElapsedDays: normalizeNonNegativeNumber(log.lastElapsedDays, 0),
    scheduledDays: normalizeNonNegativeNumber(log.scheduledDays, log.nextIntervalDays ?? 0),
    lapses: normalizeNonNegativeNumber(log.lapses, 0),
    learning_steps: normalizeNonNegativeNumber(log.learning_steps, 0),
    state: normalizeState(log.state, FSRSState.Review),
  } as ReviewLog;
}

function normalizeDebugPresets(input?: DebugScenarioPreset[]): DebugScenarioPreset[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return [...new Set(input.filter((preset): preset is DebugScenarioPreset => DEBUG_SCENARIO_PRESETS.includes(preset)))];
}

function createDebugScenarioProblems(preset: DebugScenarioPreset): Partial<ExtensionStorageState>['problemsById'] {
  const now = new Date();
  const nowIso = now.toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const policy = DEFAULT_STATE.settings.reviewPolicy;

  if (preset === 'empty') {
    return {};
  }

  if (preset === 'overdue') {
    return {
      'leetcode:binary-tree-level-order-traversal': normalizeProblem({
        id: 'leetcode:binary-tree-level-order-traversal',
        platform: 'leetcode',
        titleSlug: 'binary-tree-level-order-traversal',
        title: '102. 二叉树的层序遍历',
        difficulty: 'Medium',
        url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/',
        reviewStage: 3,
        nextReviewAt: sevenDaysAgo,
        createdAt: sevenDaysAgo,
        updatedAt: sevenDaysAgo,
        firstAcceptedAt: sevenDaysAgo,
        lastAcceptedAt: sevenDaysAgo,
        currentIntervalDays: 7,
        easeFactor: 2.2,
        reviewCount: 4,
        overdueCount: 2,
        archived: false,
        tags: ['树', '广度优先搜索', '二叉树']
      }, policy),
      'leetcode:course-schedule': normalizeProblem({
        id: 'leetcode:course-schedule',
        platform: 'leetcode',
        titleSlug: 'course-schedule',
        title: '207. 课程表',
        difficulty: 'Medium',
        url: 'https://leetcode.com/problems/course-schedule/',
        reviewStage: 2,
        nextReviewAt: threeDaysAgo,
        createdAt: sevenDaysAgo,
        updatedAt: threeDaysAgo,
        firstAcceptedAt: sevenDaysAgo,
        lastAcceptedAt: threeDaysAgo,
        currentIntervalDays: 4,
        easeFactor: 2.0,
        reviewCount: 3,
        overdueCount: 1,
        archived: false,
        tags: ['深度优先搜索', '广度优先搜索', '图', '拓扑排序']
      }, policy),
      'leetcode:two-sum': normalizeProblem({
        id: 'leetcode:two-sum',
        platform: 'leetcode',
        titleSlug: 'two-sum',
        title: '1. 两数之和',
        difficulty: 'Easy',
        url: 'https://leetcode.com/problems/two-sum/',
        reviewStage: 1,
        nextReviewAt: oneDayAgo,
        createdAt: sevenDaysAgo,
        updatedAt: oneDayAgo,
        firstAcceptedAt: sevenDaysAgo,
        lastAcceptedAt: oneDayAgo,
        currentIntervalDays: 2,
        easeFactor: 1.8,
        reviewCount: 2,
        overdueCount: 1,
        archived: false,
        tags: ['数组', '哈希表']
      }, policy)
    };
  }

  if (preset === 'import_preview') {
    return {
      'leetcode:merge-intervals': normalizeProblem({
        id: 'leetcode:merge-intervals',
        platform: 'leetcode',
        titleSlug: 'merge-intervals',
        title: '56. 合并区间',
        difficulty: 'Medium',
        url: 'https://leetcode.com/problems/merge-intervals/',
        reviewStage: 1,
        nextReviewAt: nowIso,
        createdAt: threeDaysAgo,
        updatedAt: nowIso,
        firstAcceptedAt: threeDaysAgo,
        lastAcceptedAt: nowIso,
        currentIntervalDays: 1,
        easeFactor: 1.9,
        reviewCount: 2,
        overdueCount: 0,
        archived: false,
        tags: ['数组', '排序']
      }, policy)
    };
  }

  return {
    'leetcode:two-sum': normalizeProblem({
      id: 'leetcode:two-sum',
      platform: 'leetcode',
      titleSlug: 'two-sum',
      title: '1. 两数之和',
      difficulty: 'Easy',
      url: 'https://leetcode.com/problems/two-sum/',
      reviewStage: 1,
      nextReviewAt: nowIso,
      createdAt: sevenDaysAgo,
      updatedAt: nowIso,
      firstAcceptedAt: sevenDaysAgo,
      lastAcceptedAt: oneDayAgo,
      lastReviewedAt: nowIso,
      currentIntervalDays: 1,
      easeFactor: 1.9,
      reviewCount: 2,
      overdueCount: 0,
      archived: false,
      tags: ['数组', '哈希表']
    }, policy),
    'leetcode:add-two-numbers': normalizeProblem({
      id: 'leetcode:add-two-numbers',
      platform: 'leetcode',
      titleSlug: 'add-two-numbers',
      title: '2. 两数相加',
      difficulty: 'Medium',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      reviewStage: 2,
      nextReviewAt: threeDaysAgo,
      createdAt: sevenDaysAgo,
      updatedAt: threeDaysAgo,
      firstAcceptedAt: sevenDaysAgo,
      lastAcceptedAt: threeDaysAgo,
      currentIntervalDays: 3,
      easeFactor: 2.1,
      reviewCount: 3,
      overdueCount: 1,
      archived: false,
      tags: ['递归', '链表', '数学']
    }, policy),
    'leetcode:lru-cache': normalizeProblem({
      id: 'leetcode:lru-cache',
      platform: 'leetcode',
      titleSlug: 'lru-cache',
      title: '146. LRU 缓存',
      difficulty: 'Hard',
      url: 'https://leetcode.com/problems/lru-cache/',
      reviewStage: 3,
      nextReviewAt: tomorrow,
      createdAt: sevenDaysAgo,
      updatedAt: oneDayAgo,
      firstAcceptedAt: sevenDaysAgo,
      lastAcceptedAt: oneDayAgo,
      currentIntervalDays: 7,
      easeFactor: 2.2,
      reviewCount: 4,
      overdueCount: 0,
      archived: false,
      tags: ['设计', '哈希表', '链表', '双向链表']
    }, policy),
    'leetcode:group-anagrams': normalizeProblem({
      id: 'leetcode:group-anagrams',
      platform: 'leetcode',
      titleSlug: 'group-anagrams',
      title: '49. 字母异位词分组',
      difficulty: 'Medium',
      url: 'https://leetcode.com/problems/group-anagrams/',
      reviewStage: 0,
      nextReviewAt: twoDaysLater,
      createdAt: threeDaysAgo,
      updatedAt: nowIso,
      firstAcceptedAt: threeDaysAgo,
      lastAcceptedAt: nowIso,
      currentIntervalDays: 1,
      easeFactor: 1.5,
      reviewCount: 1,
      overdueCount: 0,
      archived: false,
      tags: ['数组', '哈希表', '字符串', '排序']
    }, policy)
  };
}

function createDebugScenarioReviewLogs(
  preset: DebugScenarioPreset,
  problemsById: Partial<ExtensionStorageState>['problemsById']
): Partial<ExtensionStorageState>['reviewLogsById'] {
  if (preset === 'empty') {
    return {};
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const logs: Partial<ExtensionStorageState>['reviewLogsById'] = {};

  const problemIds = Object.keys(problemsById ?? {});
  if (problemIds[0]) {
    logs.debug_review_1 = normalizeReviewLog({
      id: 'debug_review_1',
      problemId: problemIds[0],
      reviewedAt: oneDayAgo,
      source: 'daily_plan',
      rating: 'normal',
      previousReviewStage: 0,
      nextReviewStage: 1,
      nextIntervalDays: 1,
      nextReviewAt: oneDayAgo.slice(0, 10),
      createdAt: oneDayAgo
    });
  }
  if (problemIds[1]) {
    logs.debug_review_2 = normalizeReviewLog({
      id: 'debug_review_2',
      problemId: problemIds[1],
      reviewedAt: threeDaysAgo,
      source: 'daily_plan',
      rating: 'hard',
      previousReviewStage: 2,
      nextReviewStage: 1,
      previousIntervalDays: 3,
      nextIntervalDays: 2,
      previousNextReviewAt: threeDaysAgo.slice(0, 10),
      nextReviewAt: oneDayAgo.slice(0, 10),
      createdAt: threeDaysAgo
    });
  }

  return logs;
}

function createDebugScenarioNotes(
  preset: DebugScenarioPreset,
  problemsById: Partial<ExtensionStorageState>['problemsById']
): Partial<ExtensionStorageState>['notesByProblemId'] {
  if (preset === 'empty') {
    return {};
  }

  const nowIso = new Date().toISOString();
  const firstProblemId = Object.keys(problemsById ?? {})[0];
  if (!firstProblemId) {
    return {};
  }

  return {
    [firstProblemId]: {
      problemId: firstProblemId,
      markdown: '# Debug note\n\n- key idea\n- complexity\n- pitfalls',
      createdAt: nowIso,
      updatedAt: nowIso
    }
  };
}

function cloneDefaultState(): ExtensionStorageState {
  return structuredClone(DEFAULT_STATE);
}

function normalizeReviewPolicy(input?: Partial<ReviewPolicy>): ReviewPolicy {
  const defaultPolicy = DEFAULT_STATE.settings.reviewPolicy;
  const inputIntervals = input?.baseIntervalsDays;
  const hasCurrentPolicyShape = Boolean(inputIntervals && inputIntervals.length >= defaultPolicy.baseIntervalsDays.length);
  const baseIntervalsDays = hasCurrentPolicyShape ? inputIntervals! : defaultPolicy.baseIntervalsDays;
  const ratingAdjustments = hasCurrentPolicyShape ? input?.ratingAdjustments : undefined;

  return {
    baseIntervalsDays,
    ratingAdjustments: {
      too_easy: {
        ...defaultPolicy.ratingAdjustments.too_easy,
        ...ratingAdjustments?.too_easy
      },
      normal: {
        ...defaultPolicy.ratingAdjustments.normal,
        ...ratingAdjustments?.normal
      },
      hard: {
        ...defaultPolicy.ratingAdjustments.hard,
        ...ratingAdjustments?.hard
      },
      no_clue: {
        ...defaultPolicy.ratingAdjustments.no_clue,
        ...ratingAdjustments?.no_clue
      }
    }
  };
}

function mergeState(input?: Partial<ExtensionStorageState>): ExtensionStorageState {
  const normalizedProblemsById: ExtensionStorageState['problemsById'] = {};
  const problemIdMap = new Map<string, string>();
  const policy = normalizeReviewPolicy(input?.settings?.reviewPolicy);

  for (const [storedId, problem] of Object.entries(input?.problemsById ?? {})) {
    const canonicalId = problemIdFor(problem);
    const normalizedProblem = normalizeProblem({
      ...problem,
      id: canonicalId
    }, policy);
    const existingProblem = normalizedProblemsById[canonicalId];

    if (!existingProblem || normalizedProblem.updatedAt >= existingProblem.updatedAt) {
      normalizedProblemsById[canonicalId] = normalizedProblem;
    }

    problemIdMap.set(storedId, canonicalId);
  }

  const normalizedNotesByProblemId: ExtensionStorageState['notesByProblemId'] = {};
  for (const [storedProblemId, note] of Object.entries(input?.notesByProblemId ?? {})) {
    const canonicalProblemId = problemIdMap.get(storedProblemId) ?? storedProblemId;
    const normalizedNote = {
      ...note,
      problemId: canonicalProblemId
    };
    const existingNote = normalizedNotesByProblemId[canonicalProblemId];

    if (!existingNote || normalizedNote.updatedAt >= existingNote.updatedAt) {
      normalizedNotesByProblemId[canonicalProblemId] = normalizedNote;
    }
  }

  const normalizedReviewLogsById: ExtensionStorageState['reviewLogsById'] = {};
  for (const [logId, log] of Object.entries(input?.reviewLogsById ?? {})) {
    normalizedReviewLogsById[logId] = normalizeReviewLog({
      ...log,
      problemId: problemIdMap.get(log.problemId) ?? log.problemId
    });
  }

  return {
    ...cloneDefaultState(),
    ...input,
    problemsById: normalizedProblemsById,
    reviewLogsById: normalizedReviewLogsById,
    notesByProblemId: normalizedNotesByProblemId,
    settings: {
      ...DEFAULT_STATE.settings,
      ...input?.settings,
      reviewPolicy: policy,
      reminders: {
        ...DEFAULT_STATE.settings.reminders,
        ...input?.settings?.reminders,
        weeklyReportExportEnabled: Boolean(input?.settings?.reminders?.weeklyReportExportEnabled)
      },
      emailWebhook: {
        ...DEFAULT_STATE.settings.emailWebhook,
        ...input?.settings?.emailWebhook,
        betaAccessCode: input?.settings?.emailWebhook?.betaAccessCode?.trim() || undefined
      },
      dailyReviewLimit: normalizeDailyReviewLimit(input?.settings?.dailyReviewLimit)
    },
    metadata: {
      ...DEFAULT_STATE.metadata,
      ...input?.metadata,
      debugMode: input?.metadata?.debugMode ?? DEFAULT_STATE.metadata.debugMode,
      debugActivePreset: input?.metadata?.debugActivePreset,
      debugCoveredPresets: normalizeDebugPresets(input?.metadata?.debugCoveredPresets),
      storageBackend: 'local',
      reminderDelivery: normalizeReminderDelivery(input?.metadata?.reminderDelivery)
    }
  };
}

export async function getState(): Promise<ExtensionStorageState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const rawState = result[STORAGE_KEY];

  return mergeState(rawState);
}

async function writeStateNow(state: ExtensionStorageState): Promise<void> {
  assertStateFitsStorage(state);
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...state,
      metadata: {
        ...state.metadata,
        storageBackend: 'local'
      }
    }
  });
}

export async function setState(state: ExtensionStorageState): Promise<void> {
  return enqueueStateWrite(() => writeStateNow(state));
}

export async function updateState(
  updater: (state: ExtensionStorageState) => ExtensionStorageState | Promise<ExtensionStorageState>
): Promise<ExtensionStorageState> {
  return enqueueStateWrite(async () => {
    const state = await getState();
    const nextState = await updater(state);
    await writeStateNow(nextState);
    return nextState;
  });
}

export async function saveNote(problemId: string, markdown: string): Promise<ProblemNote> {
  assertNoteSize(markdown);
  let savedNote: ProblemNote | undefined;
  await updateState((state) => {
    const timestamp = new Date().toISOString();
    const existing = state.notesByProblemId[problemId];
    savedNote = {
      problemId,
      markdown,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    return {
      ...state,
      notesByProblemId: {
        ...state.notesByProblemId,
        [problemId]: savedNote
      }
    };
  });

  return savedNote!;
}

export async function importState(input: unknown): Promise<ExtensionStorageState> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid backup file.');
  }

  const state = mergeState(input as Partial<ExtensionStorageState>);
  await setState(state);
  return state;
}

export function previewImportState(currentState: ExtensionStorageState, input: unknown): ImportPreview {
  const preview: ImportPreview = {
    valid: false,
    problemCount: 0,
    noteCount: 0,
    reviewLogCount: 0,
    newProblemCount: 0,
    overwrittenProblemCount: 0,
    warningMessages: [],
    errorMessages: []
  };

  if (!input || typeof input !== 'object') {
    return {
      ...preview,
      errorMessages: ['Invalid backup file. Expected a JSON object.']
    };
  }

  const candidate = input as Partial<ExtensionStorageState>;
  preview.version = typeof candidate.version === 'number' ? candidate.version : undefined;

  if (candidate.version === undefined) {
    preview.warningMessages.push('Backup version is missing; defaults will be applied during import.');
  }

  if (!candidate.problemsById || typeof candidate.problemsById !== 'object') {
    preview.warningMessages.push('Backup does not contain problemsById; no problems will be imported.');
  }

  if (!candidate.notesByProblemId || typeof candidate.notesByProblemId !== 'object') {
    preview.warningMessages.push('Backup does not contain notesByProblemId; no notes will be imported.');
  }

  if (!candidate.reviewLogsById || typeof candidate.reviewLogsById !== 'object') {
    preview.warningMessages.push('Backup does not contain reviewLogsById; no review logs will be imported.');
  }

  const mergedState = mergeState(candidate);
  const importedProblems = Object.values(mergedState.problemsById);
  const importedProblemIds = new Set(importedProblems.map((problem) => problem.id));

  preview.valid = true;
  preview.problemCount = importedProblems.length;
  preview.noteCount = Object.keys(mergedState.notesByProblemId).length;
  preview.reviewLogCount = Object.keys(mergedState.reviewLogsById).length;
  preview.newProblemCount = importedProblems.filter((problem) => !currentState.problemsById[problem.id]).length;
  preview.overwrittenProblemCount = importedProblems.filter((problem) => {
    const currentProblem = currentState.problemsById[problem.id];
    return Boolean(currentProblem && problem.updatedAt >= currentProblem.updatedAt);
  }).length;

  for (const noteProblemId of Object.keys(mergedState.notesByProblemId)) {
    if (!importedProblemIds.has(noteProblemId) && !currentState.problemsById[noteProblemId]) {
      preview.warningMessages.push(`Note references unknown problem: ${noteProblemId}`);
    }
  }

  return preview;
}

export async function applyDebugScenarioPreset(preset: DebugScenarioPreset): Promise<ExtensionStorageState> {
  if (!DEBUG_TOOLS_ENABLED) {
    throw new Error('Debug tools are only available in development.');
  }

  const currentState = await getState();
  const problemsById = createDebugScenarioProblems(preset);
  const reviewLogsById = createDebugScenarioReviewLogs(preset, problemsById);
  const notesByProblemId = createDebugScenarioNotes(preset, problemsById);
  const coveredPresets = normalizeDebugPresets([...(currentState.metadata.debugCoveredPresets ?? []), preset]);
  const nextState = mergeState({
    ...currentState,
    problemsById,
    reviewLogsById,
    notesByProblemId,
    metadata: {
      ...currentState.metadata,
      debugMode: true,
      debugActivePreset: preset,
      debugCoveredPresets: coveredPresets
    }
  });
  await setState(nextState);
  return nextState;
}

export async function loadDebugQaCoveragePack(): Promise<ExtensionStorageState> {
  if (!DEBUG_TOOLS_ENABLED) {
    throw new Error('Debug tools are only available in development.');
  }

  const state = await applyDebugScenarioPreset('mixed');
  const nextState = mergeState({
    ...state,
    metadata: {
      ...state.metadata,
      debugMode: true,
      debugActivePreset: 'mixed',
      debugCoveredPresets: DEBUG_SCENARIO_PRESETS
    }
  });
  await setState(nextState);
  return nextState;
}
