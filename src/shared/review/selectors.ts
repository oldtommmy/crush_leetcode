import { daysBetween, isSameLocalDate, todayDateString, toDateString } from '../date';
import type {
  DueProblem,
  ExtensionStorageState,
  Problem,
  ProblemDifficulty,
  ReviewStats,
  WeeklyProblemSummary,
  WeeklySummaryStats
} from '../types';

const DIFFICULTY_ORDER: ProblemDifficulty[] = ['Easy', 'Medium', 'Hard', 'Unknown'];

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

function toWeeklyProblemSummary(problem: Problem, now: Date): WeeklyProblemSummary {
  const today = todayDateString(now);
  return {
    id: problem.id,
    title: problem.title,
    titleZh: problem.titleZh,
    titleSlug: problem.titleSlug,
    url: problem.url,
    difficulty: problem.difficulty,
    tags: problem.tags,
    reviewCount: problem.reviewCount,
    nextReviewAt: problem.nextReviewAt,
    stability: problem.stability,
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
  const today = todayDateString(now);
  
  return sortDueProblems(Object.values(state.problemsById)
    .filter((problem) => {
      if (problem.archived) return false;
      return daysBetween(problem.nextReviewAt, today) >= 0;
    })
    .map((problem) => toDueProblem(problem, now)));
}

export function selectDailyRemainingProblems(
  state: ExtensionStorageState,
  nowInput: Date | string = new Date(),
  limit?: number
): DueProblem[] {
  const now = typeof nowInput === 'string' ? new Date(nowInput) : nowInput;
  const problems = selectDueProblems(state, now).filter((problem) => {
    return !problem.lastReviewedAt || !isSameLocalDate(problem.lastReviewedAt, now);
  });

  return typeof limit === 'number' && Number.isFinite(limit) && limit >= 0 ? problems.slice(0, limit) : problems;
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
  const latestReviewByProblemId = new Map<string, string>();
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
    const previousReviewedAt = latestReviewByProblemId.get(log.problemId);
    if (!previousReviewedAt || reviewedAt.getTime() > new Date(previousReviewedAt).getTime()) {
      latestReviewByProblemId.set(log.problemId, log.reviewedAt);
    }
  }

  const acceptedProblemsThisWeek = problems.filter((problem) => {
    return new Date(problem.lastAcceptedAt).getTime() >= start.getTime();
  });

  const difficultyBreakdown = DIFFICULTY_ORDER
    .map((difficulty) => ({
      difficulty,
      count: problems.filter((problem) => problem.difficulty === difficulty).length
    }))
    .filter((item) => item.count > 0);

  const tagCounts = new Map<string, number>();
  for (const problem of problems) {
    for (const tag of problem.tags ?? []) {
      const normalizedTag = tag.trim();
      if (normalizedTag) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);
      }
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 6);

  const acceptedProblemCards = acceptedProblemsThisWeek
    .sort((a, b) => new Date(b.lastAcceptedAt).getTime() - new Date(a.lastAcceptedAt).getTime())
    .slice(0, 4)
    .map((problem) => toWeeklyProblemSummary(problem, now));

  const reviewedProblemCards = Array.from(reviewedProblemIds)
    .map((problemId) => state.problemsById[problemId])
    .filter((problem): problem is Problem => Boolean(problem && !problem.archived))
    .sort((a, b) => {
      const bReviewedAt = latestReviewByProblemId.get(b.id) ?? '';
      const aReviewedAt = latestReviewByProblemId.get(a.id) ?? '';
      return new Date(bReviewedAt).getTime() - new Date(aReviewedAt).getTime();
    })
    .slice(0, 4)
    .map((problem) => toWeeklyProblemSummary(problem, now));

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
    acceptedProblemsThisWeekCount: acceptedProblemsThisWeek.length,
    dailyReviewPoints,
    difficultyBreakdown,
    topTags,
    acceptedProblemCards,
    reviewedProblemCards
  };
}
