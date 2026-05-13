import { useState } from 'react';
import type { DueProblem, Locale, ReviewRating, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { RATING_LABELS } from '../../shared/review/ratingPolicy';
import { t } from '../../shared/i18n/messages';
import { daysBetween, todayDateString } from '../../shared/date';
import { displayProblemTags, displayProblemTitle } from '../../shared/leetcode/display';
import { problemUrlForLocale } from '../../shared/leetcode/url';

interface ProblemCardProps {
  problem: DueProblem;
  locale: Locale;
  onChanged: () => void;
  isCompleted?: boolean;
  viewMode?: 'daily' | 'all';
}

const ratings: ReviewRating[] = ['too_easy', 'normal', 'hard', 'no_clue'];

const ratingStyles: Record<ReviewRating, string> = {
  too_easy: 'bg-emerald-500 hover:bg-emerald-600',
  normal: 'bg-blue-500 hover:bg-blue-600',
  hard: 'bg-amber-500 hover:bg-amber-600',
  no_clue: 'bg-red-500 hover:bg-red-600'
};

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
    Easy: { label: t(locale, 'difficultyEasy'), color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
    Medium: { label: t(locale, 'difficultyMedium'), color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' },
    Hard: { label: t(locale, 'difficultyHard'), color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' },
    简单: { label: t(locale, 'difficultyEasy'), color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
    中等: { label: t(locale, 'difficultyMedium'), color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' },
    困难: { label: t(locale, 'difficultyHard'), color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' }
  };

  const masteryTierMap = {
    new: { label: t(locale, 'masteryNew'), color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300' },
    familiar: { label: t(locale, 'masteryFamiliar'), color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300' },
    proficient: { label: t(locale, 'masteryProficient'), color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300' },
    mastered: { label: t(locale, 'masteryMastered'), color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300' }
  };

  const diff = difficultyMap[problem.difficulty as keyof typeof difficultyMap] || { label: problem.difficulty, color: 'text-neutral-500 bg-neutral-50 dark:bg-neutral-800' };
  const mastery = masteryTierMap[problem.masteryTier];
  const strengthPercent = Math.round(problem.retrievability * 100);
  const isDanger = strengthPercent < 90;

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
    <article className={`group relative overflow-hidden rounded-2xl border transition-all ${
      isCompleted
        ? 'border-neutral-300 bg-neutral-100 shadow-sm ring-1 ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900/70 dark:ring-neutral-800'
        : 'border-neutral-200 bg-white hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 dark:border-neutral-800 dark:bg-[#262626]'
    } p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {!isCompleted && (
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight ${diff.color}`}>
                {diff.label}
              </span>
            )}
            {!isCompleted && (
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight shadow-sm ${mastery.color}`}>
                {mastery.label}
              </span>
            )}
            {problem.daysOverdue > 0 && !isCompleted && (
              <span className="flex items-center gap-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-white dark:bg-violet-500">
                {problem.daysOverdue}{t(locale, 'daysDelay')}
              </span>
            )}
            {isCompleted && (
              <span className="rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                DONE
              </span>
            )}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {displayTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <h3
            className={`cursor-pointer text-sm font-bold leading-tight transition-colors hover:text-amber-500 dark:hover:text-amber-500 truncate ${
              isCompleted ? 'text-neutral-500 line-through decoration-neutral-400 decoration-2 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
            }`}
            onClick={openProblem}
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          {!isCompleted && (
            <div className="mt-3 flex flex-col gap-2">
               <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  <span>{t(locale, 'memoryStrength')}</span>
                  <span className={isDanger ? 'text-red-500' : 'text-emerald-500'}>{strengthPercent}%</span>
               </div>
               <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div 
                    className={`h-full transition-all duration-500 ${isDanger ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${strengthPercent}%` }}
                  />
               </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-[10px] text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1">
              <span className="font-medium opacity-70">{t(locale, 'labelReviews')}:</span>
              <span className="font-bold text-neutral-700 dark:text-neutral-300">{problem.reviewCount}</span>
            </div>
            {!isCompleted && (
              <div className="flex items-center gap-1">
                <span className="font-medium opacity-70">{t(locale, 'labelInterval')}:</span>
                <span className="font-bold text-neutral-700 dark:text-neutral-300">{problem.stability.toFixed(1)}d</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
              isCompleted
                ? 'border-neutral-200 bg-transparent text-neutral-400 hover:border-amber-500 hover:text-amber-500 dark:border-neutral-700 dark:text-neutral-500'
                : 'border-neutral-100 bg-neutral-50 text-neutral-400 hover:border-amber-500 hover:bg-amber-500 hover:text-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500'
            }`}
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-400 hover:border-amber-500 hover:text-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500 transition-all active:scale-95"
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-500 transition-all hover:border-rose-400 hover:bg-rose-500 hover:text-white active:scale-95 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
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
        <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-100/50 px-3 py-2 dark:bg-neutral-800/50">
          <span className="text-[10px] font-bold text-neutral-400">
            {isCompleted ? nextReviewText : t(locale, 'nextReview') + ': ' + nextReviewText}
          </span>
          {viewMode === 'all' && (
             <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight ${diff.color}`}>
              {diff.label}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {ratings.map((rating) => (
            <button
              key={rating}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-white transition-all active:scale-95 ${ratingStyles[rating]}`}
              onClick={() => void rate(rating)}
              title={RATING_LABELS[rating][language]}
            >
              <span className="text-[9px] font-bold uppercase tracking-tighter">
                {compactRatingLabels[rating][language]}
              </span>
            </button>
          ))}
        </div>
      )}

      {showRemoveConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 p-4 backdrop-blur-sm dark:bg-neutral-950/95">
          <div className="w-full rounded-xl border border-rose-100 bg-white p-4 shadow-xl dark:border-rose-500/20 dark:bg-[#262626]">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
              </svg>
            </div>
            <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-100">{t(locale, 'removeProblem')}</h4>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{t(locale, 'removeConfirm')}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                onClick={() => setShowRemoveConfirm(false)}
              >
                {t(locale, 'cancel')}
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-500 py-2 text-xs font-bold text-white hover:bg-rose-600"
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
