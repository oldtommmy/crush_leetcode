import { describe, expect, it } from 'vitest';
import { MAX_REVIEW_LOGS_PER_PROBLEM, pruneReviewLogs } from '../src/shared/storage/retention';
import { createReviewLog } from './helpers/stateFactory';

function makeLogs(problemId: string, count: number): Record<string, ReturnType<typeof createReviewLog>> {
  const logs: Record<string, ReturnType<typeof createReviewLog>> = {};
  for (let i = 0; i < count; i += 1) {
    const id = `${problemId}#${String(i).padStart(3, '0')}`;
    // Older logs get earlier timestamps.
    const reviewedAt = new Date(Date.UTC(2026, 0, 1 + i, 0, 0, 0)).toISOString();
    logs[id] = createReviewLog({ id, problemId, reviewedAt });
  }
  return logs;
}

describe('pruneReviewLogs (A1)', () => {
  it('keeps every log when under the per-problem cap', () => {
    const logs = makeLogs('leetcode:two-sum', 5);
    const pruned = pruneReviewLogs(logs);
    // No-op returns the same reference so callers can skip a write.
    expect(pruned).toBe(logs);
    expect(Object.keys(pruned)).toHaveLength(5);
  });

  it('caps each problem at the newest MAX logs', () => {
    const logs = makeLogs('leetcode:two-sum', MAX_REVIEW_LOGS_PER_PROBLEM + 10);
    const pruned = pruneReviewLogs(logs);
    expect(Object.keys(pruned)).toHaveLength(MAX_REVIEW_LOGS_PER_PROBLEM);

    // The 10 oldest logs (index 000..009) must be dropped, newest kept.
    const keptIds = Object.keys(pruned).sort();
    expect(keptIds).not.toContain('leetcode:two-sum#000');
    expect(keptIds).toContain(`leetcode:two-sum#${String(MAX_REVIEW_LOGS_PER_PROBLEM + 9).padStart(3, '0')}`);
  });

  it('prunes per problem independently', () => {
    const logs = {
      ...makeLogs('leetcode:two-sum', MAX_REVIEW_LOGS_PER_PROBLEM + 5),
      ...makeLogs('leetcode:add-two-numbers', 3)
    };
    const pruned = pruneReviewLogs(logs);
    const twoSum = Object.values(pruned).filter((l) => l.problemId === 'leetcode:two-sum');
    const addTwo = Object.values(pruned).filter((l) => l.problemId === 'leetcode:add-two-numbers');
    expect(twoSum).toHaveLength(MAX_REVIEW_LOGS_PER_PROBLEM);
    expect(addTwo).toHaveLength(3);
  });

  it('respects a custom cap', () => {
    const logs = makeLogs('leetcode:two-sum', 10);
    const pruned = pruneReviewLogs(logs, 3);
    expect(Object.keys(pruned)).toHaveLength(3);
  });
});
