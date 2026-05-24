import { useEffect, useMemo, useState } from 'react';
import { getState } from '../shared/storage/chromeStorage';
import type { ExtensionStorageState, HotQuestion, HotQuestionDifficulty, HotQuestionsRuntimeData, RuntimeRequest, RuntimeResponse } from '../shared/types';
import { displayProblemTags } from '../shared/leetcode/display';
import { ProblemLibraryPanel } from '../options/components/ProblemLibraryPanel';

type HotDifficultyFilter = 'all' | HotQuestionDifficulty;
type LibraryView = 'library' | 'hot';

const HOT_PAGE_SIZE = 12;

function latestActivityDate(state: ExtensionStorageState): string {
  const dates = Object.values(state.problemsById)
    .flatMap((problem) => [problem.updatedAt, problem.lastAcceptedAt, problem.lastReviewedAt])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a));
  return dates[0]?.slice(0, 10) ?? '-';
}

function extractFrontendIdFromProblemTitle(problem: { title: string; titleZh?: string }): string | undefined {
  const match = `${problem.titleZh ?? ''} ${problem.title}`.match(/\b(\d+[A-Z]?)\.\s*/);
  return match?.[1];
}

function solvedHotQuestionCount(state: ExtensionStorageState, questions: HotQuestion[]): number {
  return questions.filter((question) => isHotQuestionSolved(state, question)).length;
}

function isHotQuestionSolved(state: ExtensionStorageState, question: HotQuestion): boolean {
  const solvedIds = new Set<string>();
  const solvedSlugs = new Set<string>();
  Object.values(state.problemsById)
    .filter((problem) => !problem.archived)
    .forEach((problem) => {
      const frontendId = extractFrontendIdFromProblemTitle(problem);
      if (frontendId) solvedIds.add(frontendId);
      solvedSlugs.add(problem.titleSlug);
    });

  return solvedIds.has(question.leetcodeFrontendId) || solvedSlugs.has(question.slugTitle);
}

function formatDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function hotDifficultyLabel(value: HotQuestionDifficulty, locale: string): string {
  if (value === 1) return locale === 'zh-CN' ? 'Easy / 简单' : 'Easy';
  if (value === 2) return locale === 'zh-CN' ? 'Medium / 中等' : 'Medium';
  return locale === 'zh-CN' ? 'Hard / 困难' : 'Hard';
}

function hotDifficultyClassName(value: HotQuestionDifficulty): string {
  if (value === 1) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  }
  if (value === 3) {
    return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300';
  }
  return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
}

export function LibraryApp() {
  const [state, setState] = useState<ExtensionStorageState | undefined>();
  const [hotData, setHotData] = useState<HotQuestionsRuntimeData | undefined>();
  const [hotError, setHotError] = useState<string | undefined>();
  const [hotLoading, setHotLoading] = useState(false);
  const [hotDifficulty, setHotDifficulty] = useState<HotDifficultyFilter>('all');
  const [hotPage, setHotPage] = useState(1);
  const [activeView, setActiveView] = useState<LibraryView>('library');
  const [error, setError] = useState<string | undefined>();

  const loadHotData = (force = false) => {
    setHotLoading(true);
    chrome.runtime
      .sendMessage({ type: force ? 'REFRESH_HOT_QUESTIONS' : 'GET_HOT_QUESTIONS', payload: { force } } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<HotQuestionsRuntimeData>) => {
        if (!response.ok || !response.data) {
          throw new Error(response.error ?? 'Failed to load company hot questions.');
        }
        setHotData(response.data);
        setHotError(undefined);
        setHotPage(1);
      })
      .catch((err) => setHotError(err instanceof Error ? err.message : String(err)))
      .finally(() => setHotLoading(false));
  };

  const load = () => {
    getState()
      .then((nextState) => {
        setState(nextState);
        setError(undefined);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));

    loadHotData(false);
  };

  const updateHotCompany = (companyId: number) => {
    setHotLoading(true);
    chrome.runtime
      .sendMessage({ type: 'UPDATE_HOT_QUESTION_COMPANY', payload: { companyId } } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<HotQuestionsRuntimeData>) => {
        if (!response.ok || !response.data) {
          throw new Error(response.error ?? 'Failed to change company.');
        }
        setHotData(response.data);
        setHotError(undefined);
        setHotPage(1);
      })
      .catch((err) => setHotError(err instanceof Error ? err.message : String(err)))
      .finally(() => setHotLoading(false));
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
  const title = activeView === 'library'
    ? (locale === 'zh-CN' ? '完整题库' : 'Problem Library')
    : (locale === 'zh-CN' ? '大厂高频' : 'Company Hot List');
  const subtitle = activeView === 'library'
    ? (locale === 'zh-CN'
      ? '集中查看已刷题目、复习状态和 Markdown 笔记。'
      : 'Browse solved problems, review status, and Markdown notes in one place.')
    : (locale === 'zh-CN'
      ? '按 CodeTop 高频题和本地题库做覆盖匹配，不上传刷题历史。'
      : 'Match CodeTop hot lists with your local library without uploading history.');
  const selectedCompany = hotData?.companies.find((company) => company.id === hotData.selectedCompanyId);
  const hotQuestions = hotData?.questions ?? [];
  const hotSolvedCount = state && hotQuestions.length ? solvedHotQuestionCount(state, hotQuestions) : 0;
  const hotCoverage = hotQuestions.length ? Math.round((hotSolvedCount / hotQuestions.length) * 100) : 0;
  const filteredHotQuestions = hotQuestions.filter((question) => hotDifficulty === 'all' || question.difficulty === hotDifficulty);
  const hotPageCount = Math.max(1, Math.ceil(filteredHotQuestions.length / HOT_PAGE_SIZE));
  const safeHotPage = Math.min(hotPage, hotPageCount);
  const visibleHotQuestions = filteredHotQuestions.slice((safeHotPage - 1) * HOT_PAGE_SIZE, safeHotPage * HOT_PAGE_SIZE);
  const hotStatus = hotError ? 'Error' : hotData?.stale || hotData?.lastError ? 'Stale' : hotData ? 'OK' : '-';

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
              {([
                ['library', locale === 'zh-CN' ? '完整题库' : 'Library'],
                ['hot', locale === 'zh-CN' ? '大厂高频' : 'Hot List']
              ] as Array<[LibraryView, string]>).map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  className={`min-w-[92px] rounded-lg px-3 py-2 text-sm font-black transition ${
                    activeView === view
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  onClick={() => setActiveView(view)}
                >
                  {label}
                </button>
              ))}
            </div>
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

        {activeView === 'library' ? (
          <>
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
          </>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
          <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-400">
                  {locale === 'zh-CN' ? '大厂高频总览' : 'Company hot overview'}
                </div>
                <h2 className="mt-1 text-lg font-black text-neutral-900 dark:text-neutral-100">
                  {selectedCompany
                    ? (locale === 'zh-CN' ? `${selectedCompany.name} 高频覆盖` : `${selectedCompany.name} coverage`)
                    : (locale === 'zh-CN' ? 'CodeTop 大厂高频' : 'CodeTop company hot list')}
                </h2>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  {locale === 'zh-CN'
                    ? '只和本地题库做匹配，不上传你的刷题历史。'
                    : 'Matched locally against your library; history never leaves the extension.'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                onClick={() => loadHotData(true)}
                disabled={hotLoading}
              >
                {hotLoading
                  ? (locale === 'zh-CN' ? '刷新中' : 'Refreshing')
                  : (locale === 'zh-CN' ? '刷新表格' : 'Refresh table')}
              </button>
            </div>
            {hotError || hotData?.lastError ? (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {hotError || hotData?.lastError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 border-b border-neutral-100 p-4 text-xs dark:border-neutral-800 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Service', hotStatus],
              ['Synced At', formatDateTime(hotData?.syncedAt)],
              [locale === 'zh-CN' ? 'Companies' : 'Companies', hotData?.companies.length ?? 0],
              [locale === 'zh-CN' ? 'Rows' : 'Rows', filteredHotQuestions.length],
              [locale === 'zh-CN' ? 'Coverage' : 'Coverage', `${hotSolvedCount}/${hotQuestions.length} (${hotCoverage}%)`]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="font-black uppercase tracking-wider text-neutral-400">{label}</div>
                <div className="mt-1 truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-b border-neutral-100 p-4 dark:border-neutral-800 lg:grid-cols-[minmax(220px,1fr)_160px_auto]">
            <select
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-700 outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              value={hotData?.selectedCompanyId ?? ''}
              onChange={(event) => event.target.value && updateHotCompany(Number(event.target.value))}
            >
              {hotData?.companies.length ? hotData.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}{company.isNew ? ' · new' : ''}
                </option>
              )) : (
                <option value="">{locale === 'zh-CN' ? 'No companies' : 'No companies'}</option>
              )}
            </select>
            <select
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-700 outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              value={hotDifficulty}
              onChange={(event) => {
                setHotDifficulty(event.target.value === 'all' ? 'all' : Number(event.target.value) as HotQuestionDifficulty);
                setHotPage(1);
              }}
            >
              <option value="all">{locale === 'zh-CN' ? 'All difficulty' : 'All difficulty'}</option>
              <option value={1}>Easy / 简单</option>
              <option value={2}>Medium / 中等</option>
              <option value={3}>Hard / 困难</option>
            </select>
            <div className="flex items-center justify-end rounded-xl bg-neutral-50 px-3 py-2 text-xs font-black text-neutral-500 dark:bg-neutral-950">
              {locale === 'zh-CN'
                ? `每页 ${HOT_PAGE_SIZE} 行`
                : `${HOT_PAGE_SIZE} rows per page`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1020px] w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '题号' : 'ID'}</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '本地匹配' : 'Local match'}</th>
                  <th className="px-4 py-3">Source Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {visibleHotQuestions.length ? visibleHotQuestions.map((question) => {
                  const solved = state ? isHotQuestionSolved(state, question) : false;
                  return (
                    <tr key={`${question.companyId}-${question.leetcodeFrontendId}`} className="transition hover:bg-neutral-50 dark:hover:bg-neutral-950/60">
                      <td className="px-4 py-3 font-mono font-bold text-neutral-500">{question.rank ?? '-'}</td>
                      <td className="px-4 py-3 font-black text-neutral-900 dark:text-neutral-100">{question.leetcodeFrontendId}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://leetcode.cn/problems/${question.slugTitle}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-black text-neutral-900 transition hover:text-amber-600 dark:text-neutral-100 dark:hover:text-amber-300"
                        >
                          {question.title}
                        </a>
                        <div className="mt-1 font-mono text-[11px] font-semibold text-neutral-400">{question.slugTitle}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300">{question.companyName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${hotDifficultyClassName(question.difficulty)}`}>
                          {hotDifficultyLabel(question.difficulty, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-neutral-700 dark:text-neutral-200">{question.frequency}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${
                          solved
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {solved
                            ? (locale === 'zh-CN' ? '已刷' : 'Solved')
                            : (locale === 'zh-CN' ? '未刷' : 'Not solved')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-neutral-500">{formatDateTime(question.sourceUpdatedAt)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm font-bold text-neutral-400">
                      {locale === 'zh-CN' ? '暂无 CodeTop 高频题数据。请先在 Popup 或后台刷新 CodeTop。' : 'No CodeTop hot question data yet. Refresh CodeTop from popup or admin.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 text-xs font-bold text-neutral-500 dark:border-neutral-800 md:flex-row md:items-center md:justify-between">
            <span>
              {locale === 'zh-CN'
                ? `${filteredHotQuestions.length} records`
                : `${filteredHotQuestions.length} records`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 font-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-950"
                onClick={() => setHotPage((page) => Math.max(1, page - 1))}
                disabled={safeHotPage <= 1}
              >
                {locale === 'zh-CN' ? '上一页' : 'Prev'}
              </button>
              <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-black text-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                {safeHotPage} / {hotPageCount}
              </span>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 font-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-950"
                onClick={() => setHotPage((page) => Math.min(hotPageCount, page + 1))}
                disabled={safeHotPage >= hotPageCount}
              >
                {locale === 'zh-CN' ? '下一页' : 'Next'}
              </button>
            </div>
          </div>
          </section>
        )}
      </div>
    </main>
  );
}
