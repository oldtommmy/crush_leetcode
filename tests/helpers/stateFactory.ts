import { DEFAULT_STATE, DEFAULT_SETTINGS } from '../../src/shared/constants';
import type { ExtensionStorageState, Problem, ReviewLog } from '../../src/shared/types';
import { FSRSState } from '../../src/shared/types';

export function createProblem(overrides: Partial<Problem> & Pick<Problem, 'id' | 'titleSlug' | 'title' | 'url'>): Problem {
  const timestamp = '2026-04-21T10:00:00.000Z';
  const { id, titleSlug, title, url, ...rest } = overrides;
  return {
    id,
    platform: 'leetcode',
    titleSlug,
    title,
    difficulty: 'Easy',
    url,
    firstAcceptedAt: timestamp,
    lastAcceptedAt: timestamp,
    nextReviewAt: '2026-04-21',
    
    // FSRS Defaults
    stability: 1,
    difficultyScore: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    learning_steps: 0,
    state: FSRSState.New,
    
    // Legacy fields
    reviewStage: 1,
    currentIntervalDays: 1,
    easeFactor: 1,
    
    reviewCount: 1,
    overdueCount: 0,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...rest
  };
}

export function createReviewLog(overrides: Partial<ReviewLog> & Pick<ReviewLog, 'id' | 'problemId' | 'reviewedAt'>): ReviewLog {
  const { id, problemId, reviewedAt, ...rest } = overrides;
  return {
    id,
    problemId,
    reviewedAt,
    source: 'daily_plan',
    rating: 'normal',
    
    // FSRS Defaults for Log
    stability: 1,
    difficultyScore: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    generatedDueAt: '2026-04-22T10:00:00.000Z',
    lapses: 0,
    learning_steps: 0,
    state: FSRSState.Review,

    // Legacy fields
    previousReviewStage: 0,
    nextReviewStage: 1,
    previousIntervalDays: 1,
    nextIntervalDays: 1,
    previousNextReviewAt: '2026-04-21',
    nextReviewAt: '2026-04-22',
    createdAt: reviewedAt,
    ...rest
  };
}

export function createState(overrides?: Partial<ExtensionStorageState>): ExtensionStorageState {
  return {
    ...structuredClone(DEFAULT_STATE),
    settings: structuredClone(DEFAULT_SETTINGS),
    ...overrides,
    problemsById: overrides?.problemsById ?? {},
    reviewLogsById: overrides?.reviewLogsById ?? {},
    notesByProblemId: overrides?.notesByProblemId ?? {},
    metadata: {
      ...structuredClone(DEFAULT_STATE.metadata),
      ...overrides?.metadata
    }
  };
}
