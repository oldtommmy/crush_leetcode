import { daysBetween, todayDateString } from '../date';
import { getMasteryTier } from '../review/selectors';
import type {
  ExtensionStorageState,
  HotQuestion,
  HotQuestionRecommendation,
  HotQuestionReason,
  Problem,
  ReviewLog
} from '../types';

const RECENT_UPDATE_DAYS = 30;

function extractFrontendId(problem: Problem): string | undefined {
  const match = `${problem.titleZh ?? ''} ${problem.title}`.match(/\b(\d+[A-Z]?)\.\s*/);
  return match?.[1];
}

function buildProblemIndexes(state: ExtensionStorageState): {
  byFrontendId: Map<string, Problem>;
  bySlug: Map<string, Problem>;
} {
  const byFrontendId = new Map<string, Problem>();
  const bySlug = new Map<string, Problem>();

  for (const problem of Object.values(state.problemsById)) {
    if (problem.archived) continue;
    const frontendId = extractFrontendId(problem);
    if (frontendId) {
      byFrontendId.set(frontendId, problem);
    }
    bySlug.set(problem.titleSlug, problem);
  }

  return { byFrontendId, bySlug };
}

function latestLogForProblem(state: ExtensionStorageState, problemId: string): ReviewLog | undefined {
  return Object.values(state.reviewLogsById)
    .filter((log) => log.problemId === problemId)
    .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())[0];
}

function sourceUpdatedDays(question: HotQuestion, now: Date): number | undefined {
  if (!question.sourceUpdatedAt) return undefined;
  const updatedAt = new Date(question.sourceUpdatedAt);
  if (!Number.isFinite(updatedAt.getTime())) return undefined;
  return Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000));
}

function freshnessScore(question: HotQuestion, now: Date): { score: number; recent: boolean } {
  const days = sourceUpdatedDays(question, now);
  if (days === undefined) return { score: 0.2, recent: false };
  if (days <= 14) return { score: 1, recent: true };
  if (days <= RECENT_UPDATE_DAYS) return { score: 0.6, recent: true };
  return { score: 0.2, recent: false };
}

function personalSignal(
  problem: Problem | undefined,
  state: ExtensionStorageState,
  now: Date
): { score: number; dueScore: number; reasons: HotQuestionReason[] } {
  if (!problem) {
    return { score: 1, dueScore: 0, reasons: ['not_solved'] };
  }

  const reasons: HotQuestionReason[] = [];
  const dueDays = daysBetween(problem.nextReviewAt, todayDateString(now));
  const dueScore = dueDays >= 0 ? Math.min(1, 0.7 + Math.min(dueDays, 7) / 20) : 0;
  if (dueScore > 0) {
    reasons.push('review_due');
  }

  const latestLog = latestLogForProblem(state, problem.id);
  const wasHard = problem.lapses > 0 || latestLog?.rating === 'hard' || latestLog?.rating === 'no_clue';
  if (wasHard) {
    reasons.push('previously_hard');
    return { score: 0.85, dueScore, reasons };
  }

  return { score: problem.reviewCount <= 1 ? 0.45 : 0.15, dueScore, reasons };
}

export function buildHotQuestionRecommendations(
  questions: HotQuestion[],
  state: ExtensionStorageState,
  now: Date = new Date()
): HotQuestionRecommendation[] {
  const maxFrequency = Math.max(1, ...questions.map((question) => question.frequency));
  const indexes = buildProblemIndexes(state);

  return questions
    .map((question) => {
      const matchedProblem =
        indexes.byFrontendId.get(question.leetcodeFrontendId) ||
        indexes.bySlug.get(question.slugTitle);
      const personal = personalSignal(matchedProblem, state, now);
      const freshness = freshnessScore(question, now);
      const frequencyScore = Math.min(1, Math.max(0, question.frequency / maxFrequency));
      const reasons: HotQuestionReason[] = ['company_hot', ...personal.reasons];

      if (freshness.recent) {
        reasons.push('recently_updated');
      }

      let score =
        frequencyScore * 0.45 +
        personal.score * 0.25 +
        personal.dueScore * 0.2 +
        freshness.score * 0.1;

      if (matchedProblem && getMasteryTier(matchedProblem.stability) === 'mastered' && personal.dueScore === 0) {
        score *= 0.65;
      }

      return {
        ...question,
        score: Number(score.toFixed(4)),
        reasons: [...new Set(reasons)],
        matchedProblemId: matchedProblem?.id,
        solved: Boolean(matchedProblem)
      };
    })
    .sort((a, b) => b.score - a.score || b.frequency - a.frequency || (a.rank ?? 9999) - (b.rank ?? 9999));
}
