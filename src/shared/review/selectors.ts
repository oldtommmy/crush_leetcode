import { daysBetween, isSameLocalDate, todayDateString, toDateString } from '../date';
import type { DueProblem, ExtensionStorageState, Problem, ReviewStats, WeeklySummaryStats } from '../types';

/**
 * Calculates Retrievability (R) based on FSRS formula: R = 0.9 ^ (t / S)
 */
export function calculateRetrievability(stability: number, lastReviewAt: string | undefined, now = new Date()): number {
  if (!lastReviewAt) return 0;
  const lastDate = new Date(lastReviewAt);
  const elapsedMs = now.getTime() - lastDate.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  
  const r = Math.pow(0.9, elapsedDays / Math.max(0.01, stability));
  return Math.max(0, Math.min(1, r));
}

/**
 * Maps stability (S) to a mastery tier
 */
export function getMasteryTier(stability: number): DueProblem['masteryTier'] {
  if (stability >= 60) return 'mastered';
  if (stability >= 14) return 'proficient';
  if (stability >= 3) return 'familiar';
  return 'new';
}

function toDueProblem(problem: Problem, now: Date): DueProblem {
  const today = todayDateString(now);
  return {
    ...problem,
    daysOverdue: Math.max(0, daysBetween(problem.nextReviewAt, today)),
    retrievability: calculateRetrievability(problem.stability, problem.lastReviewAt ?? problem.firstAcceptedAt, now),
    masteryTier: getMasteryTier(problem.stability)
  };
}

function sortDueProblems(problems: DueProblem[]): DueProblem[] {
  return problems.sort((a, b) => {
    if (Math.abs(a.retrievability - b.retrievability) > 0.001) {
      return a.retrievability - b.retrievability;
    }
    return b.daysOverdue - a.daysOverdue;
  });
}

export function selectDueProblems(state: ExtensionStorageState, nowInput: Date | string = new Date()): DueProblem[] {
  const now = typeof nowInput === 'string' ? new Date(nowInput) : nowInput;
  
  return sortDueProblems(Object.values(state.problemsById)
    .filter((problem) => {
      if (problem.archived) return false;
      return new Date(problem.nextReviewAt).getTime() <= now.getTime();
    })
    .map((problem) => toDueProblem(problem, now)));
}

export function selectDailyRemainingProblems(state: ExtensionStorageState, nowInput: Date | string = new Date()): DueProblem[] {
  const now = typeof nowInput === 'string' ? new Date(nowInput) : nowInput;
  return selectDueProblems(state, now).filter((problem) => {
    return !problem.lastReviewedAt || !isSameLocalDate(problem.lastReviewedAt, now);
  });
}

export function selectTodayCompletedProblems(state: ExtensionStorageState, nowInput: Date | string = new Date()): Problem[] {
  const now = typeof nowInput === 'string' ? new Date(nowInput) : nowInput;
  return Object.values(state.problemsById)
    .filter((problem) => !problem.archived && Boolean(problem.lastReviewedAt && isSameLocalDate(problem.lastReviewedAt, now)))
    .sort((a, b) => new Date(b.lastReviewedAt!).getTime() - new Date(a.lastReviewedAt!).getTime());
}

export function selectReviewStats(state: ExtensionStorageState, nowInput: Date | string = new Date()): ReviewStats {
  const now = typeof nowInput === 'string' ? new Date(nowInput) : nowInput;
  const problems = Object.values(state.problemsById).filter((problem) => !problem.archived);
  const activeProblemIds = new Set(problems.map((problem) => problem.id));
  const dueProblems = selectDueProblems(state, now);
  const completedToday = selectTodayCompletedProblems(state, now);
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const reviewedLast7DaysProblemIds = new Set(
    Object.values(state.reviewLogsById)
      .filter((log) => activeProblemIds.has(log.problemId) && new Date(log.reviewedAt).getTime() >= sevenDaysAgo.getTime())
      .map((log) => log.problemId)
  );

  return {
    totalProblems: problems.length,
    dueCount: dueProblems.length,
    overdueCount: dueProblems.filter((problem) => problem.daysOverdue > 0).length,
    completedTodayCount: completedToday.length,
    reviewedLast7DaysCount: reviewedLast7DaysProblemIds.size
  };
}

export function selectWeeklySummaryStats(state: ExtensionStorageState, nowInput: Date | string = new Date()): WeeklySummaryStats {
  const now = typeof nowInput === 'string' ? new Date(nowInput) : nowInput;
  const dueProblems = selectDueProblems(state, now);
  const problems = Object.values(state.problemsById).filter((problem) => !problem.archived);
  const activeProblemIds = new Set(problems.map((problem) => problem.id));
  const reviewLogs = Object.values(state.reviewLogsById);

  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const dayBuckets = new Map<string, number>();
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    dayBuckets.set(toDateString(day), 0);
  }

  const reviewedProblemIds = new Set<string>();
  for (const log of reviewLogs) {
    if (!activeProblemIds.has(log.problemId)) {
      continue;
    }

    const reviewedAt = new Date(log.reviewedAt);
    if (reviewedAt.getTime() < start.getTime()) {
      continue;
    }
    const date = toDateString(reviewedAt);
    dayBuckets.set(date, (dayBuckets.get(date) ?? 0) + 1);
    reviewedProblemIds.add(log.problemId);
  }

  const acceptedProblemsThisWeekCount = problems.filter((problem) => {
    return new Date(problem.lastAcceptedAt).getTime() >= start.getTime();
  }).length;

  const dailyReviewPoints = Array.from(dayBuckets.entries()).map(([date, reviewCount]) => ({
    date,
    label: date.slice(5),
    reviewCount
  }));

  return {
    totalProblems: problems.length,
    dueCount: dueProblems.length,
    overdueCount: dueProblems.filter((problem) => problem.daysOverdue > 0).length,
    reviewedProblemsThisWeekCount: reviewedProblemIds.size,
    acceptedProblemsThisWeekCount,
    dailyReviewPoints
  };
}
