import { useEffect, useMemo, useState } from 'react';
import type { DailyCompletionMessage, DueProblem, Locale, Problem, ReviewStats, RuntimeResponse } from '../../shared/types';
import { t } from '../../shared/i18n/messages';
import { ProblemCard } from './ProblemCard';
import { calculateRetrievability, getMasteryTier } from '../../shared/review/selectors';
import { todayDateString } from '../../shared/date';
import { MAX_DAILY_REVIEW_LIMIT, MIN_DAILY_REVIEW_LIMIT } from '../../shared/constants';
import { localizeDailyCompletionText } from '../../shared/dailyCompletionMessages';
import { problemUrlForLocale } from '../../shared/leetcode/url';

interface DailyPlanProps {
  dueProblems: DueProblem[];
  totalDailyRemainingCount: number;
  completedTodayProblems: Problem[];
  allProblems: Problem[];
  stats: ReviewStats;
  locale: Locale;
  dailyReviewLimit: number;
  onDailyReviewLimitChange: (limit: number) => void;
  onChanged: () => void;
}

const defaultEncouragements: Record<Locale, Array<{ title: string; body: string }>> = {
  en: [
    {
      title: 'No Bugs Today',
      body: 'At least this review session passed all tests. Ship it.'
    },
    {
      title: 'Cache Hit',
      body: 'Those problems just landed in L1 cache. Try not to evict them too soon.'
    },
    {
      title: 'Stack Unwound',
      body: 'Daily recursion returned cleanly. No stack overflow detected.'
    },
    {
      title: 'Complexity Improved',
      body: 'Brain runtime went from O(no idea) to O(probably got it next time).'
    },
    {
      title: 'LGTM',
      body: 'Daily plan reviewed and approved for merge into long-term memory.'
    },
    {
      title: 'No TLE',
      body: 'You did not time out today. The judge is mildly impressed.'
    },
    {
      title: 'Green CI',
      body: 'All review checks passed. Your memory pipeline is ready to deploy.'
    },
    {
      title: 'Garbage Collected',
      body: 'Old confusion was collected successfully. Heap looks healthier now.'
    },
    {
      title: 'Branch Merged',
      body: 'Today\'s review branch merged cleanly into main memory. No conflicts.'
    }
  ],
  'zh-CN': [
    {
      title: '今日无 Bug',
      body: '至少在复习模块里，今天的你通过了所有测试。'
    },
    {
      title: '已写入缓存',
      body: '这几题刚进 L1 Cache，趁热别 `rm -rf` 记忆。'
    },
    {
      title: '栈帧回收',
      body: '今日递归结束，成功 return，没有爆栈。'
    },
    {
      title: '复杂度优化',
      body: '脑内复杂度从 O(不会) 降到了 O(下次应该会)。'
    },
    {
      title: 'LGTM',
      body: '今日计划已 review 通过，允许合并到长期记忆分支。'
    },
    {
      title: '没有超时',
      body: '你今天没 TLE，甚至还顺手优化了自己。'
    },
    {
      title: 'CI 全绿',
      body: '今日复习检查全部通过，可以放心部署到长期记忆。'
    },
    {
      title: '垃圾回收完成',
      body: '旧的困惑已被 GC，脑内堆内存看起来清爽多了。'
    },
    {
      title: '分支合并成功',
      body: '今日复习分支已无冲突合入 main memory。'
    }
  ]
};

export function DailyPlan({
  dueProblems,
  totalDailyRemainingCount,
  completedTodayProblems,
  allProblems,
  stats,
  locale,
  dailyReviewLimit,
  onDailyReviewLimitChange,
  onChanged
}: DailyPlanProps) {
  const [view, setView] = useState<'daily' | 'all'>('daily');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [remoteEncouragements, setRemoteEncouragements] = useState<DailyCompletionMessage[]>();

  const remainingCount = dueProblems.length;
  const deferredCount = Math.max(0, totalDailyRemainingCount - remainingCount);
  const completedCount = completedTodayProblems.length;
  const totalToday = Math.min(dailyReviewLimit, completedCount + totalDailyRemainingCount);
  const goalCompletedCount = Math.min(completedCount, totalToday);
  const progress = totalToday > 0 ? (goalCompletedCount / totalToday) * 100 : 0;
  const encouragement = useMemo(() => {
    const remotePool = remoteEncouragements
      ?.map((message) => ({
        title: localizeDailyCompletionText(message.title, locale),
        body: localizeDailyCompletionText(message.body, locale)
      }))
      .filter((message) => message.title && message.body);
    const pool = remotePool?.length ? remotePool : defaultEncouragements[locale];
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }, [locale, remoteEncouragements, totalToday]);

  useEffect(() => {
    let cancelled = false;
    chrome.runtime
      .sendMessage({ type: 'GET_DAILY_COMPLETION_MESSAGES' })
      .then((response: RuntimeResponse<{ messages?: DailyCompletionMessage[] } | undefined>) => {
        if (cancelled || !response?.ok || !response.data?.messages?.length) return;
        setRemoteEncouragements(response.data.messages);
      })
      .catch(() => {
        if (!cancelled) setRemoteEncouragements(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (totalToday === 0 || remainingCount !== 0 || goalCompletedCount === 0) {
      return;
    }

    const key = `crushLC.dailyComplete.${todayDateString()}`;
    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, '1');
    setShowCompleteModal(true);
  }, [goalCompletedCount, remainingCount, totalToday]);

  const openLeetCode = () => {
    const url = locale === 'zh-CN' ? 'https://leetcode.cn/problemset/' : 'https://leetcode.com/problemset/';
    chrome.runtime.sendMessage({ type: 'OPEN_URL', payload: { url } });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openLibrary = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
  };

  const startFirstReview = () => {
    const first = dueProblems[0];
    if (first) {
      chrome.runtime.sendMessage({
        type: 'OPEN_PROBLEM',
        payload: { url: problemUrlForLocale(first.titleSlug, locale) }
      });
    } else {
      openLeetCode();
    }
  };

  const deferredLabel = locale === 'zh-CN'
    ? `还有 ${deferredCount} ${t(locale, 'queuedReviews')}`
    : `${deferredCount} ${t(locale, 'queuedReviews')}`;

  const problemToDue = (problem: Problem): DueProblem => {
    return {
      ...problem,
      daysOverdue: 0,
      retrievability: calculateRetrievability(problem.stability, problem.lastReviewAt ?? problem.firstAcceptedAt),
      masteryTier: getMasteryTier(problem.stability)
    };
  };

  if (stats.totalProblems === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text">{t(locale, 'tagline')}</h3>
        <p className="mt-2 text-sm font-medium text-text-2 leading-relaxed">
          {t(locale, 'proTipDesc')}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            onClick={openLeetCode}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-brand py-3.5 text-sm font-semibold text-white shadow-brand transition-transform duration-200 ease-spring hover:-translate-y-0.5 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {t(locale, 'openLeetCode')}
          </button>
          <button
            onClick={openOptions}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-surface-2 py-3.5 text-sm font-semibold text-text-2 transition-all duration-200 ease-standard hover:bg-surface active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t(locale, 'importBackup')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Hero：首屏只讲一件事 —— 今天做几题 */}
      <div className="relative overflow-hidden rounded-lg border border-border-soft bg-surface p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[150px] w-[150px] rounded-full" style={{ background: 'radial-gradient(circle,var(--brand-ring),transparent 70%)' }} />
        <div className="relative z-10">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="text-[40px] font-extrabold leading-none tracking-[-.03em] tabular-nums">
                {goalCompletedCount}
                <span className="text-[17px] font-bold text-text-3"> / {totalToday}</span>
              </h2>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-text-2">{t(locale, 'statsCompleted')}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-extrabold tabular-nums ${remainingCount > 0 ? 'text-brand-strong' : 'text-success'}`}>
                {remainingCount}
              </div>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-text-2">{t(locale, 'statsRemaining')}</p>
            </div>
          </div>

          <div className="h-[9px] w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-[1000ms] ease-standard"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,var(--brand),var(--brand-strong))', boxShadow: '0 0 12px var(--brand-ring)' }}
            />
          </div>

          {remainingCount > 0 && (
            <button
              onClick={startFirstReview}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-m py-3.5 text-sm font-extrabold text-white shadow-brand transition-transform duration-200 ease-spring hover:-translate-y-0.5 active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand-strong))' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {locale === 'zh-CN' ? '开始复习第 1 题' : 'Start with problem 1'}
            </button>
          )}
        </div>
      </div>

      {/* 指标行：中性卡 + 单一强调 */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          className="group rounded-m border border-border-soft bg-surface p-3.5 text-left shadow-sm transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          onClick={openLibrary}
          title={locale === 'zh-CN' ? '打开完整题库工作台' : 'Open problem library'}
        >
          <div className="text-xl font-extrabold tabular-nums text-text">{stats.totalProblems}</div>
          <div className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-text-2 group-hover:text-text">
            <span>{t(locale, 'problemLibrary')}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </div>
        </button>
        <div className="rounded-m border border-border-soft bg-surface p-3.5 shadow-sm transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-md">
          <div className="text-xl font-extrabold tabular-nums text-danger">{stats.overdueCount}</div>
          <div className="mt-1 text-[10.5px] font-bold text-text-2">{t(locale, 'statsOverdue')}</div>
        </div>
        <div className="rounded-m border border-border-soft bg-surface p-3.5 shadow-sm transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-md">
          <div className="text-xl font-extrabold tabular-nums text-text">{stats.reviewedLast7DaysCount}</div>
          <div className="mt-1 text-[10.5px] font-bold text-text-2">{t(locale, 'statsLast7Days')}</div>
        </div>
      </div>

      {/* 每日目标微调 */}
      <div className="flex items-center justify-between rounded-m border border-border-soft bg-surface px-4 py-2.5 shadow-sm">
        <div>
          <p className="text-xs font-extrabold text-text">{t(locale, 'dailyGoal')}</p>
          <p className="mt-0.5 text-[10px] font-medium text-text-2">
            {deferredCount > 0 ? deferredLabel : t(locale, 'dailyPlan')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-text-2 transition-all hover:bg-surface active:scale-90 disabled:opacity-40"
            disabled={dailyReviewLimit <= MIN_DAILY_REVIEW_LIMIT}
            onClick={() => onDailyReviewLimitChange(dailyReviewLimit - 1)}
          >
            -
          </button>
          <span className="min-w-8 text-center text-lg font-extrabold tabular-nums text-brand-strong">{dailyReviewLimit}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-90 disabled:opacity-40"
            disabled={dailyReviewLimit >= MAX_DAILY_REVIEW_LIMIT}
            onClick={() => onDailyReviewLimitChange(dailyReviewLimit + 1)}
          >
            +
          </button>
        </div>
      </div>

      {/* 待复习 / 全部 —— 一级 tab + 滑动指示器 */}
      <div className="relative flex rounded-m bg-surface-2 p-1">
        <span
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[calc(var(--r-m)-4px)] bg-surface shadow-sm transition-transform duration-[240ms] ease-spring"
          style={{ transform: view === 'all' ? 'translateX(100%)' : 'translateX(0)' }}
        />
        <button
          onClick={() => setView('daily')}
          className={`relative z-[1] flex-1 py-2 text-xs font-extrabold transition-colors ${view === 'daily' ? 'text-text' : 'text-text-2 hover:text-text'}`}
        >
          {locale === 'zh-CN' ? '待复习' : 'Due'}
        </button>
        <button
          onClick={() => setView('all')}
          className={`relative z-[1] flex-1 py-2 text-xs font-extrabold transition-colors ${view === 'all' ? 'text-text' : 'text-text-2 hover:text-text'}`}
        >
          {locale === 'zh-CN' ? '全部题目' : 'All'}
        </button>
      </div>

      {/* 列表渲染 */}
      <div className="space-y-3">
        {view === 'daily' ? (
          <>
            {/* 待复习列表 */}
            {dueProblems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} locale={locale} onChanged={onChanged} />
            ))}

            {/* 已完成提示 & 列表 */}
            {completedTodayProblems.length > 0 && (
              <>
                {dueProblems.length > 0 && (
                  <div className="flex items-center gap-2 py-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-3">{t(locale, 'statsCompleted')}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                {completedTodayProblems.map((problem) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problemToDue(problem)}
                    locale={locale}
                    onChanged={onChanged}
                    isCompleted={true}
                  />
                ))}
              </>
            )}

            {totalToday === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-easy-soft text-easy-ink">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-text">{t(locale, 'noTasks')}</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
             {allProblems.length === 0 && (
               <p className="text-center text-xs text-text-2 py-8">{t(locale, 'noProblemsRecorded')}</p>
             )}
             {allProblems.map((problem) => (
               <ProblemCard
                 key={problem.id}
                 problem={problemToDue(problem)}
                 locale={locale}
                 onChanged={onChanged}
                 viewMode="all"
               />
             ))}
          </div>
        )}
      </div>

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 clc-fade-in">
          <div className="w-full max-w-sm rounded-lg border border-border-soft bg-elevated p-6 shadow-lg clc-modal-in">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-easy-soft text-easy-ink">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-easy-ink">{t(locale, 'dailyCompleteTitle')}</p>
            <h3 className="mt-2 text-xl font-semibold text-text">{encouragement.title}</h3>
            <p className="mt-3 text-sm leading-6 text-text-2">{encouragement.body}</p>
            <button
              type="button"
              className="mt-6 w-full rounded-sm bg-brand py-3 text-sm font-semibold text-white shadow-brand transition-transform duration-200 ease-spring hover:-translate-y-0.5 active:scale-[0.99]"
              onClick={() => setShowCompleteModal(false)}
            >
              {t(locale, 'dailyCompleteClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
