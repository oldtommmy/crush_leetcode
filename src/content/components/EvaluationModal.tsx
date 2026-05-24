import { useEffect, useState } from 'react';
import type {
  ExtensionStorageState,
  Locale,
  Problem,
  ProblemIdentity,
  ReviewLog,
  ReviewRating,
  RuntimeRequest,
  RuntimeResponse
} from '../../shared/types';
import { RATING_LABELS } from '../../shared/review/ratingPolicy';
import { t } from '../../shared/i18n/messages';
import { displayProblemTitle } from '../../shared/leetcode/display';
import { calculateNextReview, problemIdFor } from '../../shared/review/scheduler';
import { DEFAULT_REVIEW_POLICY } from '../../shared/constants';

interface EvaluationModalProps {
  identity: ProblemIdentity;
  locale: Locale;
  source: 'accepted_modal' | 'daily_plan';
  onClose: () => void;
  onSaved?: () => void;
}

const ratings: ReviewRating[] = ['too_easy', 'normal', 'hard', 'no_clue'];

const ratingStyles: Record<ReviewRating, { border: string, bg: string, text: string, hover: string }> = {
  too_easy: {
    border: 'border-blue-200 dark:border-blue-900/30',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:border-blue-400 dark:hover:border-blue-500'
  },
  normal: {
    border: 'border-emerald-200 dark:border-emerald-900/30',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    hover: 'hover:border-emerald-400 dark:hover:border-emerald-500'
  },
  hard: {
    border: 'border-amber-200 dark:border-amber-900/30',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    hover: 'hover:border-amber-400 dark:hover:border-amber-500'
  },
  no_clue: {
    border: 'border-red-200 dark:border-red-900/30',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    hover: 'hover:border-red-400 dark:hover:border-red-500'
  }
};

function getReviewPreview(
  existing: Problem | undefined,
  rating: ReviewRating,
  policy: typeof DEFAULT_REVIEW_POLICY,
  now: Date,
  lastLog?: ReviewLog
): ReturnType<typeof calculateNextReview> {
  try {
    return calculateNextReview(existing, rating, policy, now, lastLog);
  } catch {
    return calculateNextReview(undefined, rating, policy, now);
  }
}

async function sendRating(identity: ProblemIdentity, rating: ReviewRating, source: 'accepted_modal' | 'daily_plan') {
  const request: RuntimeRequest = {
    type: 'UPSERT_ACCEPTED_REVIEW',
    payload: {
      identity,
      rating,
      source
    }
  };
  const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse;
  if (!response.ok) {
    throw new Error(response.error ?? 'Failed to save review.');
  }
}

export function EvaluationModal({ identity, locale, source, onClose, onSaved }: EvaluationModalProps) {
  const language = locale === 'zh-CN' ? 'zh' : 'en';
  const displayTitle = displayProblemTitle(identity, locale);
  const [existingProblem, setExistingProblem] = useState<Problem | undefined>();
  const [lastLog, setLastLog] = useState<ReviewLog | undefined>();
  const [policy, setPolicy] = useState(DEFAULT_REVIEW_POLICY);
  const now = new Date();

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'GET_DAILY_PLAN' } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<{ state: ExtensionStorageState, lastLogsByProblemId: Record<string, ReviewLog> }>) => {
        if (response.ok && response.data) {
          const problemId = problemIdFor(identity);
          const existing = response.data.state.problemsById[problemId];
          if (existing) {
            setExistingProblem(existing);
            setLastLog(response.data.lastLogsByProblemId[problemId]);
          }
          if (response.data.state.settings.reviewPolicy) {
            setPolicy(response.data.state.settings.reviewPolicy);
          }
        }
      })
      .catch(console.error);
  }, [identity]);

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 font-sans">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 dark:border-neutral-800 dark:bg-[#1a1a1a]">
        <div className="bg-neutral-900 px-6 py-8 text-center dark:bg-[#262626]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">{t(locale, 'acceptedTitle')}</h2>
          <p className="mt-2 text-sm font-medium text-neutral-400 truncate">{displayTitle}</p>
        </div>

        <div className="p-6">
          <p className="mb-6 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {t(locale, 'acceptedSubtitle')}
          </p>
          <p className="mb-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            {t(locale, 'ratingHint')}
          </p>
          
          <div className="grid grid-cols-1 gap-3">
            {ratings.map((rating) => {
              const scheduled = getReviewPreview(existingProblem, rating, policy, now, lastLog);
              const style = ratingStyles[rating];
              return (
                <button
                  key={rating}
                  className={`flex items-center justify-between rounded-2xl border ${style.border} ${style.bg} px-6 py-4 transition-all ${style.hover} hover:shadow-md active:scale-[0.98] group`}
                  onClick={() => {
                    sendRating(identity, rating, source)
                      .then(() => {
                        onSaved?.();
                        onClose();
                      })
                      .catch((error) => alert(error instanceof Error ? error.message : String(error)));
                  }}
                >
                  <span className={`text-sm font-bold ${style.text}`}>
                    {RATING_LABELS[rating][language]}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-400">
                      {scheduled.intervalDays} {t(locale, 'daysLater')}
                    </span>
                    <span className="text-[9px] text-neutral-400/60 dark:text-neutral-500/40">
                      {t(locale, 'nextReview')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          
          <button
            className="mt-6 w-full py-2 text-sm font-bold text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            onClick={onClose}
          >
            {t(locale, 'maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
}
