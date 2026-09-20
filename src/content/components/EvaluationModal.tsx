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
import { RATING_EMOJI, RATING_ORDER, RATING_STYLES } from '../../shared/ui/rating';
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

const ratings: ReviewRating[] = RATING_ORDER;

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
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-[rgba(20,18,15,.55)] p-5 clc-fade-in font-sans">
      <div className="w-full max-w-[360px] overflow-hidden rounded-xl border border-border bg-elevated shadow-lg clc-modal-in">
        <div
          className="relative px-6 pb-[22px] pt-[26px] text-center"
          style={{ background: 'radial-gradient(120% 120% at 50% 0%, var(--brand-soft), transparent 70%)' }}
        >
          <div
            className="mx-auto mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-[18px] shadow-brand clc-pop"
            style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand-strong))' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-text">{t(locale, 'acceptedTitle')}</h2>
          <p className="mt-1.5 text-xs font-medium text-text-2 truncate">{displayTitle}</p>
        </div>

        <div className="px-5 pb-[22px] pt-[18px]">
          <p className="mb-3.5 text-center text-xs text-text-3">
            {t(locale, 'ratingHint')}
          </p>

          <div className="flex flex-col gap-[9px]">
            {ratings.map((rating) => {
              const scheduled = getReviewPreview(existingProblem, rating, policy, now, lastLog);
              const style = RATING_STYLES[rating];
              return (
                <button
                  key={rating}
                  className={`flex items-center justify-between rounded-m border-[1.5px] border-transparent px-4 py-[13px] text-sm font-extrabold ${style.soft} ${style.ink} ${style.hoverBorder} transition-all duration-200 ease-spring hover:-translate-y-0.5 active:scale-[0.98]`}
                  onClick={() => {
                    sendRating(identity, rating, source)
                      .then(() => {
                        onSaved?.();
                        onClose();
                      })
                      .catch((error) => alert(error instanceof Error ? error.message : String(error)));
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{RATING_EMOJI[rating]}</span>
                    {RATING_LABELS[rating][language]}
                  </span>
                  <div className="flex flex-col items-end leading-[1.35]">
                    <span className="text-xs font-extrabold tabular-nums">
                      {scheduled.intervalDays} {t(locale, 'daysLater')}
                    </span>
                    <span className="text-[10px] font-bold opacity-80">
                      {t(locale, 'nextReview')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="mt-4 w-full py-2.5 text-sm font-extrabold text-text-3 transition-colors hover:text-text"
            onClick={onClose}
          >
            {t(locale, 'maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
}
