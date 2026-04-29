import { fsrs, Card, Rating, createEmptyCard, State, ReviewLog as FSRSLog, RecordLogItem, Grade } from 'ts-fsrs';
import { FSRS_MAX_INTERVAL_DAYS } from '../constants';
import { FSRSState, Problem, ReviewRating, ReviewLog } from '../types';

export interface FSRSScheduleResult {
  card: Card;
  log: FSRSLog;
}

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
    due: new Date(log.fsrsDueAt ?? log.previousNextReviewAt ?? log.generatedDueAt),
    stability: log.stability,
    difficulty: log.difficultyScore,
    elapsed_days: log.elapsedDays,
    last_elapsed_days: log.lastElapsedDays ?? 0,
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
    enable_short_term: true,
    maximum_interval: FSRS_MAX_INTERVAL_DAYS
  });

  private static initialReviewScheduler = fsrs({
    enable_short_term: false,
    maximum_interval: FSRS_MAX_INTERVAL_DAYS
  });

  private static clampInterval(card: Card, now: Date): Card {
    if (card.scheduled_days <= FSRS_MAX_INTERVAL_DAYS) {
      return card;
    }

    const due = new Date(now);
    due.setDate(due.getDate() + FSRS_MAX_INTERVAL_DAYS);

    return {
      ...card,
      due,
      scheduled_days: FSRS_MAX_INTERVAL_DAYS
    };
  }

  /**
   * Calculates next state for a problem given a rating
   */
  public static schedule(problem: Problem | undefined, rating: ReviewRating, now = new Date()): FSRSScheduleResult {
    const card: Card = problem ? problemToCard(problem) : createEmptyCard(now);
    const fsrsRating = mapRating(rating);
    const scheduler = problem ? this.f : this.initialReviewScheduler;
    const schedulingCards = scheduler.repeat(card, now);

    const item = schedulingCards[fsrsRating as Grade] as RecordLogItem;
    return {
      card: this.clampInterval({ ...item.card }, now),
      log: { ...item.log }
    };
  }

  public static next(problem: Problem | undefined, rating: ReviewRating, now = new Date()): Card {
    return this.schedule(problem, rating, now).card;
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
