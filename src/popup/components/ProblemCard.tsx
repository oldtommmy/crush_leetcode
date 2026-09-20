import { useState } from 'react';
import type { DueProblem, Locale, ReviewRating, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { RATING_LABELS } from '../../shared/review/ratingPolicy';
import { RATING_EMOJI, RATING_ORDER, RATING_STYLES } from '../../shared/ui/rating';
import { t } from '../../shared/i18n/messages';
import { daysBetween, todayDateString } from '../../shared/date';
import { displayProblemTags, displayProblemTitle } from '../../shared/leetcode/display';
import { problemUrlForLocale } from '../../shared/leetcode/url';
import { calculateNextReview } from '../../shared/review/scheduler';
import { DEFAULT_REVIEW_POLICY } from '../../shared/constants';

interface ProblemCardProps {
  problem: DueProblem;
  locale: Locale;
  onChanged: () => void;
  isCompleted?: boolean;
  viewMode?: 'daily' | 'all';
}

const ratings: ReviewRating[] = RATING_ORDER;

function problemToIdentity(problem: DueProblem) {
  return {
    platform: problem.platform,
    titleSlug: problem.titleSlug,
    title: problem.title,
    titleZh: problem.titleZh,
    difficulty: problem.difficulty,
    tags: problem.tags,
    url: problem.url
  };
}

export function ProblemCard({ problem, locale, onChanged, isCompleted = false, viewMode = 'daily' }: ProblemCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const language = locale === 'zh-CN' ? 'zh' : 'en';
  const displayTitle = displayProblemTitle(problem, locale);
  const displayTags = displayProblemTags(problem.tags, locale);
  const compactRatingLabels: Record<ReviewRating, { en: string; zh: string }> = {
    too_easy: { en: 'Easy', zh: '轻松' },
    normal: { en: 'Good', zh: '还行' },
    hard: { en: 'Hard', zh: '吃力' },
    no_clue: { en: 'Stuck', zh: '没思路' }
  };

  const openProblem = async () => {
    await chrome.runtime.sendMessage({
      type: 'OPEN_PROBLEM',
      payload: { url: problemUrlForLocale(problem.titleSlug, locale) }
    } satisfies RuntimeRequest);
  };

  const rate = async (rating: ReviewRating) => {
    const response = (await chrome.runtime.sendMessage({
      type: 'UPSERT_ACCEPTED_REVIEW',
      payload: {
        identity: problemToIdentity(problem),
        rating,
        source: 'daily_plan'
      }
    } satisfies RuntimeRequest)) as RuntimeResponse;

    if (!response.ok) {
      alert(response.error ?? 'Failed to update review.');
      return;
    }
    onChanged();
  };

  const resetToToday = async () => {
    const response = (await chrome.runtime.sendMessage({
      type: 'RESET_TO_TODAY',
      payload: { problemId: problem.id }
    } satisfies RuntimeRequest)) as RuntimeResponse;

    if (!response.ok) {
      alert(response.error ?? 'Failed to reset problem.');
      return;
    }
    onChanged();
  };

  const removeProblem = async () => {
    const response = (await chrome.runtime.sendMessage({
      type: 'ARCHIVE_PROBLEM',
      payload: { problemId: problem.id }
    } satisfies RuntimeRequest)) as RuntimeResponse;

    if (!response.ok) {
      alert(response.error ?? 'Failed to remove problem.');
      return;
    }
    onChanged();
  };

  const difficultyMap = {
    Easy: { label: t(locale, 'difficultyEasy'), color: 'text-easy-ink bg-easy-soft border-transparent' },
    Medium: { label: t(locale, 'difficultyMedium'), color: 'text-hard-ink bg-hard-soft border-transparent' },
    Hard: { label: t(locale, 'difficultyHard'), color: 'text-stuck-ink bg-stuck-soft border-transparent' },
    简单: { label: t(locale, 'difficultyEasy'), color: 'text-easy-ink bg-easy-soft border-transparent' },
    中等: { label: t(locale, 'difficultyMedium'), color: 'text-hard-ink bg-hard-soft border-transparent' },
    困难: { label: t(locale, 'difficultyHard'), color: 'text-stuck-ink bg-stuck-soft border-transparent' }
  };

  const masteryTierMap = {
    new: { label: t(locale, 'masteryNew'), color: 'border-transparent bg-surface-2 text-text-2' },
    familiar: { label: t(locale, 'masteryFamiliar'), color: 'border-transparent bg-good-soft text-good-ink' },
    proficient: { label: t(locale, 'masteryProficient'), color: 'border-transparent bg-hard-soft text-hard-ink' },
    mastered: { label: t(locale, 'masteryMastered'), color: 'border-transparent bg-easy-soft text-easy-ink' }
  };

  const diff = difficultyMap[problem.difficulty as keyof typeof difficultyMap] || { label: problem.difficulty, color: 'text-text-2 bg-surface-2 border-transparent' };
  const mastery = masteryTierMap[problem.masteryTier];
  const strengthPercent = Math.round(problem.retrievability * 100);
  const strengthColor =
    strengthPercent >= 85 ? 'text-easy' : strengthPercent >= 65 ? 'text-good' : strengthPercent >= 45 ? 'text-hard' : 'text-stuck';

  const daysUntilReview = problem.nextReviewAt ? daysBetween(todayDateString(), problem.nextReviewAt) : null;
  const nextReviewText = (() => {
    if (daysUntilReview === null) return '';
    if (daysUntilReview < 0) {
      const overdueDays = Math.abs(daysUntilReview);
      return locale === 'zh-CN'
        ? `${overdueDays}${t(locale, 'daysDelay')}`
        : `${overdueDays} ${t(locale, 'daysDelay')}`;
    }
    if (daysUntilReview === 0) return t(locale, 'today');
    if (daysUntilReview === 1) return t(locale, 'tomorrow');
    return `${daysUntilReview} ${t(locale, 'daysLater')}`;
  })();

  return (
    <article className={`group relative overflow-hidden rounded-m border transition-all duration-200 ease-standard ${
      isCompleted
        ? 'border-border-soft bg-surface-2 shadow-none'
        : 'border-border-soft bg-surface shadow-sm hover:-translate-y-0.5 hover:border-[var(--brand-ring)] hover:shadow-md'
    } p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {!isCompleted && (
              <span className={`rounded-[7px] px-2 py-[3px] text-[10px] font-extrabold tracking-[.02em] ${diff.color}`}>
                {diff.label}
              </span>
            )}
            {!isCompleted && (
              <span className={`rounded-[7px] px-2 py-[3px] text-[10px] font-extrabold tracking-[.02em] ${mastery.color}`}>
                {mastery.label}
              </span>
            )}
            {problem.daysOverdue > 0 && !isCompleted && (
              <span className="flex items-center gap-1 rounded-[7px] bg-stuck-soft px-2 py-[3px] text-[10px] font-extrabold tracking-[.02em] text-stuck-ink">
                {problem.daysOverdue}{t(locale, 'daysDelay')}
              </span>
            )}
            {isCompleted && (
              <span className="rounded-[7px] bg-surface-2 px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[.02em] text-text-2">
                DONE
              </span>
            )}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {displayTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-[7px] bg-surface-2 px-2 py-[3px] text-[10px] font-extrabold text-text-2">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <h3
            className={`cursor-pointer text-[14.5px] font-extrabold leading-tight tracking-[-.01em] transition-colors hover:text-brand-strong truncate ${
              isCompleted ? 'text-text-3 line-through decoration-text-3 decoration-2' : 'text-text'
            }`}
            onClick={openProblem}
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          {!isCompleted && (
            <div className="mt-3 flex flex-col gap-1.5">
               <div className="flex items-center justify-between text-[10.5px] font-extrabold uppercase tracking-[.06em] text-text-3">
                  <span>{t(locale, 'memoryStrength')}</span>
                  <span className={strengthColor}>{strengthPercent}%</span>
               </div>
               <div className="h-[7px] w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-strength transition-all duration-700 ease-standard"
                    style={{ width: `${strengthPercent}%` }}
                  />
               </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-[11px] text-text-2">
            <div className="flex items-center gap-1">
              <span className="font-medium opacity-70">{t(locale, 'labelReviews')}:</span>
              <span className="font-extrabold text-text tabular-nums">{problem.reviewCount}</span>
            </div>
            {!isCompleted && (
              <div className="flex items-center gap-1">
                <span className="font-medium opacity-70">{t(locale, 'labelInterval')}:</span>
                <span className="font-extrabold text-text tabular-nums">{problem.stability.toFixed(1)}d</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface-2 text-text-2 transition-all duration-200 ease-standard hover:border-brand hover:text-brand-strong active:scale-95"
            onClick={openProblem}
            title={t(locale, 'open')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>

          {isCompleted && (
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface-2 text-text-2 transition-all duration-200 ease-standard hover:border-brand hover:text-brand-strong active:scale-95"
              onClick={resetToToday}
              title={t(locale, 'resetToToday')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}

          {viewMode === 'all' && (
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-danger/40 bg-stuck-soft text-danger transition-all duration-200 ease-standard hover:bg-danger hover:text-white active:scale-95"
              onClick={() => setShowRemoveConfirm(true)}
              title={t(locale, 'removeProblem')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isCompleted || viewMode === 'all' ? (
        <div className="mt-3 flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2">
          <span className="text-[10px] font-medium text-text-2">
            {isCompleted ? nextReviewText : t(locale, 'nextReview') + ': ' + nextReviewText}
          </span>
          {viewMode === 'all' && (
             <span className={`rounded-xs px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-tight ${diff.color}`}>
              {diff.label}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-3.5 grid grid-cols-4 gap-2">
          {ratings.map((rating) => {
            const style = RATING_STYLES[rating];
            const previewDays = (() => {
              try {
                return calculateNextReview(problem, rating, DEFAULT_REVIEW_POLICY, new Date()).intervalDays;
              } catch {
                return null;
              }
            })();
            return (
              <button
                key={rating}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-sm border-[1.5px] border-transparent px-1 py-2.5 text-[11.5px] font-extrabold ${style.soft} ${style.ink} ${style.hoverBorder} ${style.hoverShadow} transition-all duration-200 ease-spring hover:-translate-y-0.5 active:scale-95`}
                onClick={() => void rate(rating)}
                title={RATING_LABELS[rating][language]}
              >
                <span className="text-sm leading-none">{RATING_EMOJI[rating]}</span>
                <span className="leading-none">{compactRatingLabels[rating][language]}</span>
                {previewDays !== null && (
                  <span className="text-[9px] font-bold leading-none opacity-70">+{previewDays}d</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showRemoveConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full rounded-m border border-border-soft bg-elevated p-4 shadow-lg">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-stuck-soft text-danger">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-text">{t(locale, 'removeProblem')}</h4>
            <p className="mt-1 text-xs leading-5 text-text-2">{t(locale, 'removeConfirm')}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-sm border border-border bg-surface py-2 text-xs font-medium text-text-2 transition-colors hover:bg-surface-2"
                onClick={() => setShowRemoveConfirm(false)}
              >
                {t(locale, 'cancel')}
              </button>
              <button
                type="button"
                className="rounded-sm bg-danger py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                onClick={() => void removeProblem()}
              >
                {t(locale, 'removeProblem')}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
