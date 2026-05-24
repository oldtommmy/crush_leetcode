import { describe, expect, it } from 'vitest';
import { buildHotQuestionRecommendations } from '../src/shared/hotQuestions/recommendations';
import type { HotQuestion } from '../src/shared/types';
import { createProblem, createReviewLog, createState } from './helpers/stateFactory';

function hot(overrides: Partial<HotQuestion> & Pick<HotQuestion, 'leetcodeFrontendId' | 'slugTitle' | 'title' | 'frequency'>): HotQuestion {
  return {
    source: 'codetop',
    companyId: 1,
    companyName: '字节跳动',
    leetcodeQuestionId: Number(overrides.leetcodeFrontendId),
    difficulty: 2,
    rank: 1,
    sourceUpdatedAt: '2026-05-20T00:00:00.000Z',
    syncedAt: '2026-05-24T00:00:00.000Z',
    ...overrides
  };
}

describe('buildHotQuestionRecommendations', () => {
  const now = new Date('2026-05-24T10:00:00.000Z');

  it('prioritizes unsolved hot questions above mastered not-due questions', () => {
    const mastered = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: '1. Two Sum',
      url: 'https://leetcode.cn/problems/two-sum/',
      stability: 80,
      nextReviewAt: '2026-07-01',
      reviewCount: 8
    });
    const state = createState({
      problemsById: {
        [mastered.id]: mastered
      }
    });

    const recommendations = buildHotQuestionRecommendations([
      hot({ leetcodeFrontendId: '1', slugTitle: 'two-sum', title: '两数之和', frequency: 100 }),
      hot({ leetcodeFrontendId: '146', slugTitle: 'lru-cache', title: 'LRU 缓存', frequency: 80 })
    ], state, now);

    expect(recommendations[0].leetcodeFrontendId).toBe('146');
    expect(recommendations[0].reasons).toContain('not_solved');
    expect(recommendations[1].leetcodeFrontendId).toBe('1');
  });

  it('adds a review_due reason for due matched problems', () => {
    const problem = createProblem({
      id: 'leetcode:lru-cache',
      titleSlug: 'lru-cache',
      title: '146. LRU Cache',
      url: 'https://leetcode.cn/problems/lru-cache/',
      nextReviewAt: '2026-05-20',
      reviewCount: 3
    });
    const state = createState({
      problemsById: {
        [problem.id]: problem
      }
    });

    const [recommendation] = buildHotQuestionRecommendations([
      hot({ leetcodeFrontendId: '146', slugTitle: 'lru-cache', title: 'LRU 缓存', frequency: 100 })
    ], state, now);

    expect(recommendation.reasons).toContain('review_due');
    expect(recommendation.matchedProblemId).toBe(problem.id);
  });

  it('adds a previously_hard reason for hard or no-clue review history', () => {
    const problem = createProblem({
      id: 'leetcode:longest-substring-without-repeating-characters',
      titleSlug: 'longest-substring-without-repeating-characters',
      title: '3. Longest Substring Without Repeating Characters',
      url: 'https://leetcode.cn/problems/longest-substring-without-repeating-characters/',
      nextReviewAt: '2026-06-20',
      reviewCount: 4
    });
    const log = createReviewLog({
      id: 'review-hard',
      problemId: problem.id,
      reviewedAt: '2026-05-22T10:00:00.000Z',
      rating: 'no_clue'
    });
    const state = createState({
      problemsById: {
        [problem.id]: problem
      },
      reviewLogsById: {
        [log.id]: log
      }
    });

    const [recommendation] = buildHotQuestionRecommendations([
      hot({
        leetcodeFrontendId: '3',
        slugTitle: 'longest-substring-without-repeating-characters',
        title: '无重复字符的最长子串',
        frequency: 100
      })
    ], state, now);

    expect(recommendation.reasons).toContain('previously_hard');
  });

  it('marks recently updated hot questions', () => {
    const state = createState();
    const [recommendation] = buildHotQuestionRecommendations([
      hot({ leetcodeFrontendId: '25', slugTitle: 'reverse-nodes-in-k-group', title: 'K 个一组翻转链表', frequency: 100 })
    ], state, now);

    expect(recommendation.reasons).toContain('recently_updated');
  });
});
