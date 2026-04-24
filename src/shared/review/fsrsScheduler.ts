import { fsrs, Card, Rating, createEmptyCard, State, ReviewLog as FSRSLog } from 'ts-fsrs';
import { FSRSState, Problem, ReviewRating, ReviewLog } from '../types';

/**
 * Maps our custom ReviewRating to ts-fsrs Rating
 */
export function mapRating(rating: ReviewRating): Rating {
  switch (rating) {
    case 'no_clue':
      return Rating.Again;
    case 'hard':
      return Rating.Hard;
    case 'normal':
      return Rating.Good;
    case 'too_easy':
      return Rating.Easy;
    default:
      return Rating.Good;
  }
}

/**
 * Converts a Problem's FSRS fields to a ts-fsrs Card object
 */
export function problemToCard(problem: Problem): Card {
  return {
    due: new Date(problem.nextReviewAt),
    stability: problem.stability,
    difficulty: problem.difficultyScore,
    elapsed_days: problem.elapsedDays,
    scheduled_days: problem.scheduledDays,
    reps: problem.reps,
    state: problem.state as number as State,
    last_review: problem.lastReviewAt ? new Date(problem.lastReviewAt) : undefined,
    lapses: problem.lapses ?? 0,
    learning_steps: problem.learning_steps ?? 0,
  };
}

/**
 * Converts our ReviewLog to ts-fsrs ReviewLog object for rollback
 */
export function logToFSRSLog(log: ReviewLog): FSRSLog {
  return {
    rating: mapRating(log.rating),
    state: log.state as number as State,
    due: new Date(log.generatedDueAt),
    stability: log.stability,
    difficulty: log.difficultyScore,
    elapsed_days: log.elapsedDays,
    last_elapsed_days: 0, // Not strictly needed for rollback
    scheduled_days: log.scheduledDays,
    review: new Date(log.reviewedAt),
    learning_steps: log.learning_steps,
  };
}

/**
 * Core FSRS Scheduler Wrapper
 */
export class FSRSScheduler {
  private static f = fsrs({
    enable_short_term: true
  });

  /**
   * Calculates next state for a problem given a rating
   */
  public static next(problem: Problem | undefined, rating: ReviewRating, now = new Date()): Card {
    const card: Card = problem ? problemToCard(problem) : createEmptyCard(now);
    const fsrsRating = mapRating(rating);
    const schedulingCards = this.f.repeat(card, now);
    
    const item = (schedulingCards as any)[fsrsRating];
    return { ...item.card };
  }

  /**
   * Rolls back a card to its state before the review recorded in the log
   */
  public static rollback(currentProblem: Problem, lastLog: ReviewLog): Card {
    const card = problemToCard(currentProblem);
    const log = logToFSRSLog(lastLog);
    return this.f.rollback(card, log);
  }

  /**
   * Legacy Migration: Converts a reviewStage to approximate FSRS stability
   */
  public static estimateStabilityFromStage(stage: number, baseIntervals: number[]): number {
    return baseIntervals[Math.min(stage, baseIntervals.length - 1)] || 1;
  }
}
