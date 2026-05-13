import { useEffect, useMemo, useState } from 'react';
import { getState } from '../shared/storage/chromeStorage';
import type { ExtensionStorageState } from '../shared/types';
import { displayProblemTags } from '../shared/leetcode/display';
import { ProblemLibraryPanel } from '../options/components/ProblemLibraryPanel';

function latestActivityDate(state: ExtensionStorageState): string {
  const dates = Object.values(state.problemsById)
    .flatMap((problem) => [problem.updatedAt, problem.lastAcceptedAt, problem.lastReviewedAt])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a));
  return dates[0]?.slice(0, 10) ?? '-';
}

export function LibraryApp() {
  const [state, setState] = useState<ExtensionStorageState | undefined>();
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    getState()
      .then((nextState) => {
        setState(nextState);
        setError(undefined);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };

  useEffect(() => load(), []);

  const summary = useMemo(() => {
    if (!state) {
      return {
        total: 0,
        notes: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        latest: '-',
        topTags: []
      };
    }

    const problems = Object.values(state.problemsById).filter((problem) => !problem.archived);
    const tagCounts = new Map<string, number>();
    problems.forEach((problem) => {
      displayProblemTags(problem.tags, state.settings.locale).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    return {
      total: problems.length,
      notes: Object.values(state.notesByProblemId).filter((note) => note.markdown.trim()).length,
      easy: problems.filter((problem) => problem.difficulty === 'Easy').length,
      medium: problems.filter((problem) => problem.difficulty === 'Medium').length,
      hard: problems.filter((problem) => problem.difficulty === 'Hard').length,
      latest: latestActivityDate(state),
      topTags: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    };
  }, [state]);

  const locale = state?.settings.locale ?? 'en';
  const title = locale === 'zh-CN' ? '完整题库工作台' : 'Problem Library';
  const subtitle = locale === 'zh-CN'
    ? '集中查看已刷题目、复习状态和 Markdown 笔记。'
    : 'Browse solved problems, review status, and Markdown notes in one place.';

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-neutral-900 dark:bg-[#1a1a1a] dark:text-neutral-100">
      <header className="border-b border-neutral-200 bg-white/90 px-6 py-5 backdrop-blur-md dark:border-neutral-800 dark:bg-[#262626]/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-neutral-900/10">
              <img src="/icons/icon.png" alt="Crush LeetCode" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{title}</h1>
              <p className="mt-1 text-sm font-medium text-neutral-500">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-black text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              {locale === 'zh-CN' ? '设置' : 'Settings'}
            </button>
            <button
              type="button"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-black text-white transition hover:bg-black dark:bg-white dark:text-neutral-900"
              onClick={load}
            >
              {locale === 'zh-CN' ? '刷新数据' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-5">
          {[
            [locale === 'zh-CN' ? '题库总数' : 'Total', summary.total, 'border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'],
            ['Easy', summary.easy, 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'],
            ['Medium', summary.medium, 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'],
            ['Hard', summary.hard, 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'],
            [locale === 'zh-CN' ? '笔记数' : 'Notes', summary.notes, 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300']
          ].map(([label, value, className]) => (
            <div key={String(label)} className={`rounded-2xl p-5 shadow-sm ${className}`}>
              <div className="text-xs font-black uppercase tracking-widest opacity-70">{label}</div>
              <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-neutral-400">
                {locale === 'zh-CN' ? '最近活动' : 'Latest activity'}
              </div>
              <div className="mt-1 text-lg font-black">{summary.latest}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.topTags.length > 0 ? summary.topTags.map(([tag, count]) => (
                <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                  {tag} · {count}
                </span>
              )) : (
                <span className="text-sm font-bold text-neutral-400">{locale === 'zh-CN' ? '暂无标签' : 'No tags yet'}</span>
              )}
            </div>
          </div>
        </section>

        {state ? (
          <ProblemLibraryPanel state={state} locale={locale} embedded={false} onChanged={load} />
        ) : (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm font-bold text-neutral-400 dark:border-neutral-800 dark:bg-[#262626]">
            {locale === 'zh-CN' ? '正在加载题库...' : 'Loading library...'}
          </div>
        )}
      </div>
    </main>
  );
}
