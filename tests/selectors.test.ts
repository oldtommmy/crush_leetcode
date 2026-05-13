import { describe, expect, it } from 'vitest';
import {
  selectDailyRemainingProblems,
  selectDueProblems,
  selectReviewStats,
  selectTodayCompletedProblems,
  selectWeeklySummaryStats
} from '../src/shared/review/selectors';
import { createProblem, createReviewLog, createState } from './helpers/stateFactory';

describe('review selectors', () => {
  it('selects due problems ordered by overdue days', () => {
    const overdue = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      nextReviewAt: '2026-04-19'
    });
    const dueToday = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      nextReviewAt: '2026-04-21'
    });
    const future = createProblem({
      id: 'leetcode:lru-cache',
      titleSlug: 'lru-cache',
      title: 'LRU Cache',
      url: 'https://leetcode.com/problems/lru-cache/',
      nextReviewAt: '2026-04-22'
    });

    const state = createState({
      problemsById: {
        [overdue.id]: overdue,
        [dueToday.id]: dueToday,
        [future.id]: future
      }
    });

    const result = selectDueProblems(state, '2026-04-21');
    expect(result.map((problem) => problem.id)).toEqual([overdue.id, dueToday.id]);
    expect(result[0].daysOverdue).toBe(2);
    expect(result[1].daysOverdue).toBe(0);
  });

  it('treats problems scheduled later today as due for the daily plan', () => {
    const laterToday = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      nextReviewAt: '2026-04-21T23:30:00.000Z'
    });
    const tomorrow = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      nextReviewAt: '2026-04-22T00:01:00.000Z'
    });

    const state = createState({
      problemsById: {
        [laterToday.id]: laterToday,
        [tomorrow.id]: tomorrow
      }
    });

    expect(selectDueProblems(state, new Date('2026-04-21T08:00:00.000Z')).map((problem) => problem.id)).toEqual([
      laterToday.id
    ]);
  });

  it('selects only problems completed on the same local day', () => {
    const completed = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      lastReviewedAt: '2026-04-21T01:00:00.000Z'
    });
    const previousDay = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      lastReviewedAt: '2026-04-19T10:00:00.000Z'
    });

    const state = createState({
      problemsById: {
        [completed.id]: completed,
        [previousDay.id]: previousDay
      }
    });

    const result = selectTodayCompletedProblems(state, new Date('2026-04-21T10:00:00.000Z'));
    expect(result.map((problem) => problem.id)).toEqual([completed.id]);
  });

  it('excludes already reviewed today from the daily remaining list only', () => {
    const reviewedToday = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      nextReviewAt: '2026-04-19',
      lastReviewedAt: '2026-04-21T08:00:00.000Z'
    });
    const notReviewedToday = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      nextReviewAt: '2026-04-19',
      lastReviewedAt: '2026-04-20T08:00:00.000Z'
    });
    const state = createState({
      problemsById: {
        [reviewedToday.id]: reviewedToday,
        [notReviewedToday.id]: notReviewedToday
      }
    });

    expect(selectDueProblems(state, new Date('2026-04-21T10:00:00.000Z')).map((problem) => problem.id)).toEqual([
      reviewedToday.id,
      notReviewedToday.id
    ]);
    expect(selectDailyRemainingProblems(state, new Date('2026-04-21T10:00:00.000Z')).map((problem) => problem.id)).toEqual([
      notReviewedToday.id
    ]);
  });

  it('limits daily remaining problems without changing due problem ordering', () => {
    const mostUrgent = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      nextReviewAt: '2026-04-18',
      stability: 1,
      lastReviewAt: '2026-04-18T08:00:00.000Z'
    });
    const second = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      nextReviewAt: '2026-04-19',
      stability: 2,
      lastReviewAt: '2026-04-19T08:00:00.000Z'
    });
    const deferred = createProblem({
      id: 'leetcode:lru-cache',
      titleSlug: 'lru-cache',
      title: 'LRU Cache',
      url: 'https://leetcode.com/problems/lru-cache/',
      nextReviewAt: '2026-04-20',
      stability: 3,
      lastReviewAt: '2026-04-20T08:00:00.000Z'
    });

    const state = createState({
      problemsById: {
        [deferred.id]: deferred,
        [second.id]: second,
        [mostUrgent.id]: mostUrgent
      }
    });

    expect(selectDueProblems(state, new Date('2026-04-21T10:00:00.000Z'))).toHaveLength(3);
    expect(selectDailyRemainingProblems(state, new Date('2026-04-21T10:00:00.000Z'), 2).map((problem) => problem.id)).toEqual([
      mostUrgent.id,
      second.id
    ]);
    expect(selectDailyRemainingProblems(state, new Date('2026-04-21T10:00:00.000Z'), 0)).toEqual([]);
  });

  it('computes aggregate review stats', () => {
    const due = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      nextReviewAt: '2026-04-19',
      lastReviewedAt: '2026-04-21T08:00:00.000Z'
    });
    const future = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      nextReviewAt: '2026-04-25'
    });

    const state = createState({
      problemsById: {
        [due.id]: due,
        [future.id]: future
      },
      reviewLogsById: {
        review_1: createReviewLog({
          id: 'review_1',
          problemId: due.id,
          reviewedAt: '2026-04-20T08:00:00.000Z'
        }),
        review_2: createReviewLog({
          id: 'review_2',
          problemId: future.id,
          reviewedAt: '2026-04-18T08:00:00.000Z'
        })
      }
    });

    expect(selectReviewStats(state, new Date('2026-04-21T10:00:00.000Z'))).toEqual({
      totalProblems: 2,
      dueCount: 1,
      overdueCount: 1,
      completedTodayCount: 1,
      reviewedLast7DaysCount: 2
    });
  });

  it('excludes archived problems from last 7 days review stats', () => {
    const active = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/'
    });
    const archived = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      archived: true
    });

    const state = createState({
      problemsById: {
        [active.id]: active,
        [archived.id]: archived
      },
      reviewLogsById: {
        review_1: createReviewLog({
          id: 'review_1',
          problemId: active.id,
          reviewedAt: '2026-04-21T08:00:00.000Z'
        }),
        review_2: createReviewLog({
          id: 'review_2',
          problemId: archived.id,
          reviewedAt: '2026-04-21T09:00:00.000Z'
        })
      }
    });

    expect(selectReviewStats(state, new Date('2026-04-21T10:00:00.000Z')).reviewedLast7DaysCount).toBe(1);
  });

  it('computes weekly summary stats and daily review bars', () => {
    const reviewed = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Medium',
      tags: ['Array', 'Hash Table'],
      stability: 18,
      nextReviewAt: '2026-04-19',
      lastAcceptedAt: '2026-04-20T08:00:00.000Z'
    });
    const accepted = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      difficulty: 'Hard',
      tags: ['Graph', 'Hash Table'],
      stability: 4,
      nextReviewAt: '2026-04-25',
      lastAcceptedAt: '2026-04-21T08:00:00.000Z'
    });

    const state = createState({
      problemsById: {
        [reviewed.id]: reviewed,
        [accepted.id]: accepted
      },
      reviewLogsById: {
        review_1: createReviewLog({
          id: 'review_1',
          problemId: reviewed.id,
          reviewedAt: '2026-04-20T08:00:00.000Z'
        }),
        review_2: createReviewLog({
          id: 'review_2',
          problemId: accepted.id,
          reviewedAt: '2026-04-20T09:00:00.000Z'
        }),
        review_3: createReviewLog({
          id: 'review_3',
          problemId: reviewed.id,
          reviewedAt: '2026-04-21T08:00:00.000Z'
        })
      }
    });

    expect(selectWeeklySummaryStats(state, new Date('2026-04-21T10:00:00.000Z'))).toMatchObject({
      totalProblems: 2,
      dueCount: 1,
      overdueCount: 1,
      reviewedProblemsThisWeekCount: 2,
      acceptedProblemsThisWeekCount: 2
    });
    expect(selectWeeklySummaryStats(state, new Date('2026-04-21T10:00:00.000Z')).dailyReviewPoints).toEqual([
      { date: '2026-04-15', label: '04-15', reviewCount: 0 },
      { date: '2026-04-16', label: '04-16', reviewCount: 0 },
      { date: '2026-04-17', label: '04-17', reviewCount: 0 },
      { date: '2026-04-18', label: '04-18', reviewCount: 0 },
      { date: '2026-04-19', label: '04-19', reviewCount: 0 },
      { date: '2026-04-20', label: '04-20', reviewCount: 2 },
      { date: '2026-04-21', label: '04-21', reviewCount: 1 }
    ]);

    const summary = selectWeeklySummaryStats(state, new Date('2026-04-21T10:00:00.000Z'));
    expect(summary.difficultyBreakdown).toEqual([
      { difficulty: 'Medium', count: 1 },
      { difficulty: 'Hard', count: 1 }
    ]);
    expect(summary.topTags).toEqual([
      { tag: 'Hash Table', count: 2 },
      { tag: 'Array', count: 1 },
      { tag: 'Graph', count: 1 }
    ]);
    expect(summary.acceptedProblemCards?.map((problem) => problem.id)).toEqual([
      accepted.id,
      reviewed.id
    ]);
    expect(summary.reviewedProblemCards?.map((problem) => problem.id)).toEqual([
      reviewed.id,
      accepted.id
    ]);
  });

  it('excludes archived problems from weekly summary review logs', () => {
    const active = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/'
    });
    const archived = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/',
      archived: true
    });

    const state = createState({
      problemsById: {
        [active.id]: active,
        [archived.id]: archived
      },
      reviewLogsById: {
        review_1: createReviewLog({
          id: 'review_1',
          problemId: active.id,
          reviewedAt: '2026-04-21T08:00:00.000Z'
        }),
        review_2: createReviewLog({
          id: 'review_2',
          problemId: archived.id,
          reviewedAt: '2026-04-21T09:00:00.000Z'
        })
      }
    });

    const summary = selectWeeklySummaryStats(state, new Date('2026-04-21T10:00:00.000Z'));
    expect(summary.totalProblems).toBe(1);
    expect(summary.reviewedProblemsThisWeekCount).toBe(1);
    expect(summary.dailyReviewPoints.at(-1)?.reviewCount).toBe(1);
  });
});
