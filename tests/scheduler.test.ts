import { describe, expect, it } from 'vitest';
import { DEFAULT_REVIEW_POLICY, FSRS_MAX_INTERVAL_DAYS } from '../src/shared/constants';
import { applyReview, calculateNextReview, problemIdFor } from '../src/shared/review/scheduler';
import type { ProblemIdentity } from '../src/shared/types';
import { FSRSState } from '../src/shared/types';
import { createProblem } from './helpers/stateFactory';

const now = new Date(2026, 3, 21, 10, 0, 0);

const identity: ProblemIdentity = {
  platform: 'leetcode',
  titleSlug: 'two-sum',
  title: 'Two Sum',
  titleZh: '两数之和',
  difficulty: 'Easy',
  tags: ['Array', 'Hash Table'],
  url: 'https://leetcode.com/problems/two-sum/'
};

describe('scheduler', () => {
  it('builds stable problem ids from platform and slug', () => {
    expect(problemIdFor(identity)).toBe('leetcode:two-sum');
  });

  it('advances normal reviews with FSRS intervals', () => {
    // Initial review (undefined problem)
    const result = calculateNextReview(undefined, 'normal', DEFAULT_REVIEW_POLICY, now);

    expect(result.nextStage).toBe(FSRSState.Review);
    expect(result.intervalDays).toBe(3);
    expect(result.nextReviewAt).toContain('2026-04-24');
  });

  it('uses day-level intervals for first accepted reviews', () => {
    expect(calculateNextReview(undefined, 'no_clue', DEFAULT_REVIEW_POLICY, now).intervalDays).toBe(1);
    expect(calculateNextReview(undefined, 'hard', DEFAULT_REVIEW_POLICY, now).intervalDays).toBe(2);
    expect(calculateNextReview(undefined, 'normal', DEFAULT_REVIEW_POLICY, now).intervalDays).toBe(3);
    expect(calculateNextReview(undefined, 'too_easy', DEFAULT_REVIEW_POLICY, now).intervalDays).toBe(8);
  });

  it('schedules no-clue reviews with Relearning state', () => {
    const problem = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: '...',
      state: FSRSState.Review,
      stability: 10,
      nextReviewAt: now.toISOString()
    });
    const result = calculateNextReview(problem, 'no_clue', DEFAULT_REVIEW_POLICY, now);

    // Again rating on a Review card moves it to Relearning
    expect(result.nextStage).toBe(FSRSState.Relearning);
    expect(result.intervalDays).toBeLessThan(1);
  });

  it('creates a new problem and review log using FSRS', () => {
    const result = applyReview(undefined, identity, 'too_easy', 'accepted_modal', DEFAULT_REVIEW_POLICY, now);

    expect(result.problem.id).toBe('leetcode:two-sum');
    expect(result.problem.titleZh).toBe('两数之和');
    expect(result.problem.tags).toEqual(['Array', 'Hash Table']);
    // Initial Easy moves to Review state directly in many FSRS configs
    expect(result.problem.state).toBe(FSRSState.Review);
    expect(result.problem.reps).toBe(1);
    expect(result.log.rating).toBe('too_easy');
  });

  it('shortens or maintains interval on hard reviews', () => {
    const problem = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: '...',
      state: FSRSState.Review,
      stability: 14,
      nextReviewAt: now.toISOString()
    });
    const result = calculateNextReview(problem, 'hard', DEFAULT_REVIEW_POLICY, now);

    expect(result.intervalDays).toBeLessThanOrEqual(14);
  });

  it('corrects the latest same-day review without increasing review count', () => {
    const first = applyReview(undefined, identity, 'normal', 'accepted_modal', DEFAULT_REVIEW_POLICY, now);
    const second = applyReview(first.problem, identity, 'too_easy', 'daily_plan', DEFAULT_REVIEW_POLICY, now, first.log);

    expect(second.problem.titleZh).toBe('两数之和');
    expect(second.problem.tags).toEqual(['Array', 'Hash Table']);
    expect(second.problem.reviewCount).toBe(first.problem.reviewCount);
    expect(second.log.id).toBe(first.log.id);
    expect(second.log.rating).toBe('too_easy');
  });

  it('corrects a later same-day review from the true previous FSRS state', () => {
    const first = applyReview(undefined, identity, 'normal', 'accepted_modal', DEFAULT_REVIEW_POLICY, now);
    const secondReviewAt = new Date(first.problem.nextReviewAt);
    const second = applyReview(first.problem, identity, 'normal', 'daily_plan', DEFAULT_REVIEW_POLICY, secondReviewAt);
    const corrected = applyReview(second.problem, identity, 'too_easy', 'daily_plan', DEFAULT_REVIEW_POLICY, secondReviewAt, second.log);
    const expected = applyReview(first.problem, identity, 'too_easy', 'daily_plan', DEFAULT_REVIEW_POLICY, secondReviewAt);

    expect(corrected.problem.reviewCount).toBe(second.problem.reviewCount);
    expect(corrected.log.id).toBe(second.log.id);
    expect(corrected.problem.nextReviewAt).toBe(expected.problem.nextReviewAt);
    expect(corrected.problem.scheduledDays).toBe(expected.problem.scheduledDays);
    expect(corrected.problem.state).toBe(expected.problem.state);
    expect(corrected.problem.reps).toBe(expected.problem.reps);
  });

  it('caps repeated easy reviews to the configured maximum interval', () => {
    let problem = applyReview(undefined, identity, 'too_easy', 'accepted_modal', DEFAULT_REVIEW_POLICY, now).problem;

    for (let index = 0; index < 10; index += 1) {
      expect(problem.scheduledDays).toBeLessThanOrEqual(FSRS_MAX_INTERVAL_DAYS);
      problem = applyReview(
        problem,
        identity,
        'too_easy',
        'daily_plan',
        DEFAULT_REVIEW_POLICY,
        new Date(problem.nextReviewAt)
      ).problem;
    }
  });

  it('rejects same-day correction when the previous log is missing', () => {
    const first = applyReview(undefined, identity, 'normal', 'accepted_modal', DEFAULT_REVIEW_POLICY, now);

    expect(() => {
      applyReview(first.problem, identity, 'too_easy', 'daily_plan', DEFAULT_REVIEW_POLICY, now);
    }).toThrow('Cannot correct review without same-day log.');
  });
});
