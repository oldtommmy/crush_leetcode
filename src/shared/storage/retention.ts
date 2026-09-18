import type { ReviewLog } from '../types';

/**
 * A1: `reviewLogsById` is the only unbounded part of the single-key blob, so a
 * long-term heavy user eventually pushes the serialized state past the
 * chrome.storage.local soft cap and writes start throwing.
 *
 * Rather than let the log map grow forever we keep only the most recent
 * {@link MAX_REVIEW_LOGS_PER_PROBLEM} logs per problem. This bounds growth at
 * O(problems) instead of O(reviews) while preserving everything the app relies
 * on: FSRS same-day rollback only needs the latest log, and stats/hot-question
 * signals only look at recent reviews.
 */
export const MAX_REVIEW_LOGS_PER_PROBLEM = 20;

/**
 * Prune the review-log map so each problem keeps at most `maxPerProblem` logs,
 * newest first (by `reviewedAt`, with the log id as a stable tie-break). Returns
 * a new map; the input is not mutated. When nothing needs pruning the original
 * reference is returned so callers can cheaply detect a no-op.
 */
export function pruneReviewLogs(
  reviewLogsById: Record<string, ReviewLog>,
  maxPerProblem = MAX_REVIEW_LOGS_PER_PROBLEM
): Record<string, ReviewLog> {
  const byProblem = new Map<string, Array<{ id: string; log: ReviewLog }>>();
  for (const [id, log] of Object.entries(reviewLogsById)) {
    const bucket = byProblem.get(log.problemId);
    if (bucket) {
      bucket.push({ id, log });
    } else {
      byProblem.set(log.problemId, [{ id, log }]);
    }
  }

  let removed = false;
  const kept: Record<string, ReviewLog> = {};
  for (const bucket of byProblem.values()) {
    if (bucket.length <= maxPerProblem) {
      for (const entry of bucket) {
        kept[entry.id] = entry.log;
      }
      continue;
    }

    removed = true;
    bucket
      .sort((a, b) => {
        const diff = new Date(b.log.reviewedAt).getTime() - new Date(a.log.reviewedAt).getTime();
        if (diff !== 0) {
          return diff;
        }
        return b.id.localeCompare(a.id);
      })
      .slice(0, maxPerProblem)
      .forEach((entry) => {
        kept[entry.id] = entry.log;
      });
  }

  return removed ? kept : reviewLogsById;
}
