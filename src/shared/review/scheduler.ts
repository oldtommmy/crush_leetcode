import { daysBetween, isSameLocalDate } from '../date';
import type {
  Problem,
  ProblemIdentity,
  ReviewLog,
  ReviewPolicy,
  ReviewRating,
  ReviewResult,
  ReviewSource
} from '../types';
import { FSRSState } from '../types';
import { FSRSScheduler } from './fsrsScheduler';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isSameDayLog(problemId: string, log: ReviewLog | undefined, now: Date): log is ReviewLog {
  return Boolean(log && log.problemId === problemId && isSameLocalDate(log.reviewedAt, now));
}

export function problemIdFor(identity: Pick<ProblemIdentity, 'platform' | 'titleSlug'>): string {
  return `${identity.platform}:${identity.titleSlug}`;
}

/**
 * Calculates next review details for UI preview using FSRS
 */
export function calculateNextReview(
  existing: Problem | undefined,
  rating: ReviewRating,
  _policy: ReviewPolicy,
  now = new Date(),
  lastLog?: ReviewLog // NEW: support previewing a correction
): {
  nextStage: number;
  intervalDays: number;
  nextReviewAt: string;
  easeFactor: number;
} {
  let baseProblem = existing;
  const problemId = existing?.id;

  // If already reviewed today, we should preview based on the state BEFORE that review
  if (existing && problemId && isSameDayLog(problemId, lastLog, now) && isSameLocalDate(existing.lastReviewedAt ?? '', now)) {
    if (existing.reviewCount <= 1) {
      baseProblem = undefined;
    } else {
      const rolledBackCard = FSRSScheduler.rollback(existing, lastLog);
      // Create a temporary problem representing the state before today's review
      baseProblem = {
        ...existing,
        nextReviewAt: rolledBackCard.due.toISOString(),
        stability: rolledBackCard.stability,
        difficultyScore: rolledBackCard.difficulty,
        elapsedDays: rolledBackCard.elapsed_days,
        scheduledDays: rolledBackCard.scheduled_days,
        reps: rolledBackCard.reps,
        lapses: rolledBackCard.lapses,
        state: rolledBackCard.state as number as FSRSState,
        lastReviewAt: rolledBackCard.last_review?.toISOString()
      };
    }
  }

  const { card: fsrsCard } = FSRSScheduler.schedule(baseProblem, rating, now);
  return {
    nextStage: fsrsCard.state as number,
    intervalDays: fsrsCard.scheduled_days,
    nextReviewAt: fsrsCard.due.toISOString(),
    easeFactor: existing?.easeFactor ?? 1
  };
}

export function applyReview(
  existing: Problem | undefined,
  identity: ProblemIdentity,
  rating: ReviewRating,
  source: ReviewSource,
  _policy: ReviewPolicy,
  now = new Date(),
  lastLog?: ReviewLog // NEW: allow rolling back lastLog if it happened today
): ReviewResult {
  const timestamp = now.toISOString();
  const problemId = problemIdFor(identity);
  const alreadyReviewedToday = Boolean(existing?.lastReviewedAt && isSameLocalDate(existing.lastReviewedAt, now));
  
  let baseForCalculation = existing;
  let isCorrection = false;

  // Detection: If reviewed today, rollback to get the original state
  if (existing && alreadyReviewedToday) {
    if (!isSameDayLog(problemId, lastLog, now)) {
      throw new Error('Cannot correct review without same-day log.');
    }
    if (existing.reviewCount <= 1) {
      baseForCalculation = undefined;
    } else {
      const rolledBackCard = FSRSScheduler.rollback(existing, lastLog);
      baseForCalculation = {
        ...existing,
        nextReviewAt: rolledBackCard.due.toISOString(),
        stability: rolledBackCard.stability,
        difficultyScore: rolledBackCard.difficulty,
        elapsedDays: rolledBackCard.elapsed_days,
        scheduledDays: rolledBackCard.scheduled_days,
        reps: rolledBackCard.reps,
        lapses: rolledBackCard.lapses,
        state: rolledBackCard.state as number as FSRSState,
        lastReviewAt: rolledBackCard.last_review?.toISOString(),
        // Decrement review count for the calculation (it will be incremented back)
        reviewCount: Math.max(0, existing.reviewCount - 1)
      };
    }
    isCorrection = true;
  }

  // Calculate new state using FSRS.
  const { card: fsrsCard, log: fsrsLog } = FSRSScheduler.schedule(baseForCalculation, rating, now);
  
  const previousStage = baseForCalculation?.reviewStage ?? 0;
  const previousNextReviewAt = baseForCalculation?.nextReviewAt;
  const daysOverdue = previousNextReviewAt ? Math.max(0, daysBetween(previousNextReviewAt)) : 0;

  const problem: Problem = {
    id: problemId,
    platform: identity.platform,
    titleSlug: identity.titleSlug,
    title: identity.title,
    titleZh: identity.titleZh ?? existing?.titleZh,
    difficulty: identity.difficulty,
    url: identity.url,
    firstAcceptedAt: existing?.firstAcceptedAt ?? timestamp,
    lastAcceptedAt: source === 'accepted_modal' ? timestamp : (existing?.lastAcceptedAt ?? timestamp),
    lastReviewedAt: timestamp,
    nextReviewAt: fsrsCard.due.toISOString(),
    
    // FSRS Fields
    stability: fsrsCard.stability,
    difficultyScore: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    learning_steps: (fsrsCard as any).learning_steps ?? 0,
    state: fsrsCard.state as number as FSRSState,
    lastReviewAt: fsrsCard.last_review?.toISOString(),

    // Legacy fields
    reviewStage: fsrsCard.state as number,
    currentIntervalDays: fsrsCard.scheduled_days,
    easeFactor: existing?.easeFactor ?? 1,
    
    reviewCount: (baseForCalculation?.reviewCount ?? 0) + 1,
    overdueCount: (existing?.overdueCount ?? 0) + (daysOverdue > 0 && !isCorrection ? 1 : 0),
    archived: false,
    tags: identity.tags && identity.tags.length > 0 ? identity.tags : existing?.tags,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  const log: ReviewLog = {
    id: isCorrection && lastLog ? lastLog.id : createId('review'), // Reuse ID if correction
    problemId,
    reviewedAt: timestamp,
    source,
    rating,
    
    // FSRS rollback fields: state before this review.
    fsrsDueAt: fsrsLog.due.toISOString(),
    stability: fsrsLog.stability,
    difficultyScore: fsrsLog.difficulty,
    elapsedDays: fsrsLog.elapsed_days,
    lastElapsedDays: fsrsLog.last_elapsed_days,
    scheduledDays: fsrsLog.scheduled_days,
    generatedDueAt: fsrsCard.due.toISOString(),
    lapses: baseForCalculation?.lapses ?? 0,
    learning_steps: fsrsLog.learning_steps ?? 0,
    state: fsrsLog.state as number as FSRSState,

    // Legacy fields
    previousReviewStage: previousStage,
    nextReviewStage: fsrsCard.state as number,
    previousIntervalDays: baseForCalculation?.currentIntervalDays,
    nextIntervalDays: fsrsCard.scheduled_days,
    previousNextReviewAt,
    nextReviewAt: fsrsCard.due.toISOString(),
    createdAt: isCorrection && lastLog ? lastLog.createdAt : timestamp
  };

  return { problem, log };
}
