import { useEffect, useMemo, useState } from 'react';
import type { DueProblem, Locale, Problem, ReviewStats } from '../../shared/types';
import { t } from '../../shared/i18n/messages';
import { ProblemCard } from './ProblemCard';
import { calculateRetrievability, getMasteryTier } from '../../shared/review/selectors';
import { todayDateString } from '../../shared/date';
import { MAX_DAILY_REVIEW_LIMIT, MIN_DAILY_REVIEW_LIMIT } from '../../shared/constants';

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

const encouragements: Record<Locale, Array<{ title: string; body: string }>> = {
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

  const remainingCount = dueProblems.length;
  const deferredCount = Math.max(0, totalDailyRemainingCount - remainingCount);
  const completedCount = completedTodayProblems.length;
  const totalToday = Math.min(dailyReviewLimit, completedCount + totalDailyRemainingCount);
  const goalCompletedCount = Math.min(completedCount, totalToday);
  const progress = totalToday > 0 ? (goalCompletedCount / totalToday) * 100 : 0;
  const encouragement = useMemo(() => {
    const pool = encouragements[locale];
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }, [locale, totalToday]);

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
      <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-neutral-200 py-12 px-6 text-center dark:border-neutral-800">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">{t(locale, 'tagline')}</h3>
        <p className="mt-2 text-sm font-medium text-neutral-500 leading-relaxed">
          {t(locale, 'proTipDesc')}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            onClick={openLeetCode}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-neutral-900"
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-50 py-3.5 text-sm font-bold text-amber-600 transition-all hover:bg-amber-100 active:scale-95 dark:bg-amber-500/10 dark:text-amber-400"
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
    <div className="space-y-6">
      {/* 统计看板 */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-xl shadow-neutral-200/50 ring-1 ring-neutral-200 dark:bg-[#262626] dark:shadow-none dark:ring-neutral-800">
        <div className="relative z-10">
           <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
                {goalCompletedCount} <span className="text-base font-bold text-neutral-400">/ {totalToday}</span>
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{t(locale, 'statsCompleted')}</p>
            </div>
            <div className="text-right">
              <h2 className={`text-3xl font-black tracking-tight ${remainingCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {remainingCount}
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{t(locale, 'statsRemaining')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-800/50">
              <div className="text-lg font-black text-neutral-900 dark:text-neutral-100">{stats.totalProblems}</div>
              <div className="text-[10px] font-bold uppercase text-neutral-500">{t(locale, 'problemLibrary')}</div>
            </div>
            <div className="rounded-xl bg-rose-50 p-3.5 dark:bg-rose-500/5">
              <div className="text-lg font-black text-rose-500">{stats.overdueCount}</div>
              <div className="text-[10px] font-bold uppercase text-rose-500 opacity-70">{t(locale, 'statsOverdue')}</div>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3.5 dark:bg-indigo-500/5">
              <div className="text-lg font-black text-indigo-500">{stats.reviewedLast7DaysCount}</div>
              <div className="text-[10px] font-bold uppercase text-indigo-500 opacity-70">{t(locale, 'statsLast7Days')}</div>
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-amber-500 shadow-lg shadow-amber-500/30 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
        <div>
          <p className="text-xs font-black text-neutral-900 dark:text-neutral-100">{t(locale, 'dailyGoal')}</p>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-500">
            {deferredCount > 0 ? deferredLabel : t(locale, 'dailyPlan')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-black text-neutral-700 transition-all hover:bg-neutral-200 disabled:opacity-40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            disabled={dailyReviewLimit <= MIN_DAILY_REVIEW_LIMIT}
            onClick={() => onDailyReviewLimitChange(dailyReviewLimit - 1)}
          >
            -
          </button>
          <span className="min-w-8 text-center text-lg font-black text-amber-500">{dailyReviewLimit}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-black text-white transition-all hover:bg-black disabled:opacity-40 dark:bg-white dark:text-neutral-900"
            disabled={dailyReviewLimit >= MAX_DAILY_REVIEW_LIMIT}
            onClick={() => onDailyReviewLimitChange(dailyReviewLimit + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex p-1 bg-neutral-100 rounded-2xl dark:bg-neutral-800/50">
        <button
          onClick={() => setView('daily')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            view === 'daily' 
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-white' 
              : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
          }`}
        >
          {t(locale, 'dailyPlan')}
        </button>
        <button
          onClick={() => setView('all')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            view === 'all' 
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-white' 
              : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
          }`}
        >
          {t(locale, 'problemLibrary')}
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
                    <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{t(locale, 'statsCompleted')}</span>
                    <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
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
              <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-neutral-200 py-12 px-6 text-center dark:border-neutral-800">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'noTasks')}</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
             {allProblems.length === 0 && (
               <p className="text-center text-xs text-neutral-500 py-8">{t(locale, 'noProblemsRecorded')}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-6 shadow-2xl dark:border-emerald-500/20 dark:bg-[#262626]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t(locale, 'dailyCompleteTitle')}</p>
            <h3 className="mt-2 text-xl font-black text-neutral-900 dark:text-neutral-100">{encouragement.title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{encouragement.body}</p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition-all hover:bg-black active:scale-[0.99] dark:bg-white dark:text-neutral-900"
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
