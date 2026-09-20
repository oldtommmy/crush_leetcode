import { useEffect, useMemo, useState } from 'react';
import { getState } from '../shared/storage/chromeStorage';
import type { ExtensionStorageState, HotQuestion, HotQuestionDifficulty, HotQuestionsRuntimeData, RuntimeRequest, RuntimeResponse } from '../shared/types';
import { displayProblemTags } from '../shared/leetcode/display';
import { ProblemLibraryPanel } from '../options/components/ProblemLibraryPanel';
import { Select } from '../shared/ui/Select';

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
    return 'bg-easy-soft text-easy-ink';
  }
  if (value === 3) {
    return 'bg-stuck-soft text-stuck-ink';
  }
  return 'bg-hard-soft text-hard-ink';
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
    <main className="min-h-screen bg-bg text-text">
      <header className="border-b border-border-soft bg-surface px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-m shadow-sm">
              <img src="/icons/icon.png" alt="Crush LeetCode" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm font-medium text-text-2">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-2 rounded-full bg-surface-2 p-1">
              {([
                ['library', locale === 'zh-CN' ? '完整题库' : 'Library'],
                ['hot', locale === 'zh-CN' ? '大厂高频' : 'Hot List']
              ] as Array<[LibraryView, string]>).map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  className={`min-w-[92px] rounded-full px-3 py-2 text-sm font-semibold transition ${
                    activeView === view
                      ? 'bg-surface text-text shadow-sm'
                      : 'text-text-2 hover:text-text'
                  }`}
                  onClick={() => setActiveView(view)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-2 transition hover:bg-surface-2"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              {locale === 'zh-CN' ? '设置' : 'Settings'}
            </button>
            <button
              type="button"
              className="rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white shadow-brand transition hover:-translate-y-0.5"
              onClick={load}
            >
              {locale === 'zh-CN' ? '刷新数据' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-m border border-border-soft bg-stuck-soft p-4 text-sm font-semibold text-stuck-ink">
            {error}
          </div>
        ) : null}

        {activeView === 'library' ? (
          <>
            <section className="grid gap-4 md:grid-cols-5">
              {[
                [locale === 'zh-CN' ? '题库总数' : 'Total', summary.total, 'bg-surface-2 text-text'],
                ['Easy', summary.easy, 'bg-easy-soft text-easy-ink'],
                ['Medium', summary.medium, 'bg-hard-soft text-hard-ink'],
                ['Hard', summary.hard, 'bg-stuck-soft text-stuck-ink'],
                [locale === 'zh-CN' ? '笔记数' : 'Notes', summary.notes, 'bg-good-soft text-good-ink']
              ].map(([label, value, className]) => (
                <div key={String(label)} className={`rounded-m p-5 shadow-sm ${className}`}>
                  <div className="text-xs font-semibold uppercase tracking-widest opacity-70">{label}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
                </div>
              ))}
            </section>

            <section className="mt-4 rounded-m border border-border-soft bg-surface p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-text-3">
                    {locale === 'zh-CN' ? '最近活动' : 'Latest activity'}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{summary.latest}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.topTags.length > 0 ? summary.topTags.map(([tag, count]) => (
                    <span key={tag} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-2">
                      {tag} · {count}
                    </span>
                  )) : (
                    <span className="text-sm font-medium text-text-3">{locale === 'zh-CN' ? '暂无标签' : 'No tags yet'}</span>
                  )}
                </div>
              </div>
            </section>

            {state ? (
              <ProblemLibraryPanel state={state} locale={locale} embedded={false} onChanged={load} />
            ) : (
              <div className="mt-8 rounded-m border border-border-soft bg-surface p-10 text-center text-sm font-medium text-text-3">
                {locale === 'zh-CN' ? '正在加载题库...' : 'Loading library...'}
              </div>
            )}
          </>
        ) : (
          <section className="overflow-hidden rounded-m border border-border-soft bg-surface shadow-sm">
          <div className="border-b border-border-soft px-5 py-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-text-3">
                  {locale === 'zh-CN' ? '大厂高频总览' : 'Company hot overview'}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-text">
                  {selectedCompany
                    ? (locale === 'zh-CN' ? `${selectedCompany.name} 高频覆盖` : `${selectedCompany.name} coverage`)
                    : (locale === 'zh-CN' ? 'CodeTop 大厂高频' : 'CodeTop company hot list')}
                </h2>
                <p className="mt-1 text-xs font-medium text-text-2">
                  {locale === 'zh-CN'
                    ? '只和本地题库做匹配，不上传你的刷题历史。'
                    : 'Matched locally against your library; history never leaves the extension.'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => loadHotData(true)}
                disabled={hotLoading}
              >
                {hotLoading
                  ? (locale === 'zh-CN' ? '刷新中' : 'Refreshing')
                  : (locale === 'zh-CN' ? '刷新表格' : 'Refresh table')}
              </button>
            </div>
            {hotError || hotData?.lastError ? (
              <div className="mt-3 rounded-sm bg-hard-soft px-3 py-2 text-xs font-medium text-hard-ink">
                {hotError || hotData?.lastError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 border-b border-border-soft p-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Service', hotStatus],
              ['Synced At', formatDateTime(hotData?.syncedAt)],
              [locale === 'zh-CN' ? 'Companies' : 'Companies', hotData?.companies.length ?? 0],
              [locale === 'zh-CN' ? 'Rows' : 'Rows', filteredHotQuestions.length],
              [locale === 'zh-CN' ? 'Coverage' : 'Coverage', `${hotSolvedCount}/${hotQuestions.length} (${hotCoverage}%)`]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-sm border border-border-soft bg-surface-2 px-3 py-2">
                <div className="font-semibold uppercase tracking-wider text-text-3">{label}</div>
                <div className="mt-1 truncate text-sm font-semibold text-text">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-b border-border-soft p-4 lg:grid-cols-[minmax(220px,1fr)_160px_auto]">
            <Select<number>
              ariaLabel={locale === 'zh-CN' ? '目标公司' : 'Target company'}
              value={hotData?.selectedCompanyId ?? -1}
              placeholder={locale === 'zh-CN' ? '暂无公司' : 'No companies'}
              disabled={!hotData?.companies.length}
              onChange={(companyId) => companyId > 0 && updateHotCompany(companyId)}
              options={(hotData?.companies ?? []).map((company) => ({
                value: company.id,
                label: company.name,
                hint: company.isNew ? 'new' : undefined
              }))}
            />
            <Select<string>
              ariaLabel={locale === 'zh-CN' ? '难度筛选' : 'Difficulty filter'}
              value={hotDifficulty === 'all' ? 'all' : String(hotDifficulty)}
              onChange={(next) => {
                setHotDifficulty(next === 'all' ? 'all' : (Number(next) as HotQuestionDifficulty));
                setHotPage(1);
              }}
              options={[
                { value: 'all', label: locale === 'zh-CN' ? '全部难度' : 'All difficulty' },
                { value: '1', label: 'Easy / 简单' },
                { value: '2', label: 'Medium / 中等' },
                { value: '3', label: 'Hard / 困难' }
              ]}
            />
            <div className="flex items-center justify-end rounded-sm bg-surface-2 px-3 py-2 text-xs font-semibold text-text-2">
              {locale === 'zh-CN'
                ? `每页 ${HOT_PAGE_SIZE} 行`
                : `${HOT_PAGE_SIZE} rows per page`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1020px] w-full text-left text-xs">
              <thead className="bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-text-2">
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
              <tbody className="divide-y divide-border-soft">
                {visibleHotQuestions.length ? visibleHotQuestions.map((question) => {
                  const solved = state ? isHotQuestionSolved(state, question) : false;
                  return (
                    <tr key={`${question.companyId}-${question.leetcodeFrontendId}`} className="transition hover:bg-surface-2">
                      <td className="px-4 py-3 font-mono font-semibold text-text-2">{question.rank ?? '-'}</td>
                      <td className="px-4 py-3 font-semibold text-text">{question.leetcodeFrontendId}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://leetcode.cn/problems/${question.slugTitle}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-text transition hover:text-brand-strong"
                        >
                          {question.title}
                        </a>
                        <div className="mt-1 font-mono text-[11px] font-medium text-text-3">{question.slugTitle}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-2">{question.companyName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${hotDifficultyClassName(question.difficulty)}`}>
                          {hotDifficultyLabel(question.difficulty, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-text">{question.frequency}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          solved
                            ? 'bg-easy-soft text-easy-ink'
                            : 'bg-surface-2 text-text-2'
                        }`}>
                          {solved
                            ? (locale === 'zh-CN' ? '已刷' : 'Solved')
                            : (locale === 'zh-CN' ? '未刷' : 'Not solved')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-medium text-text-3">{formatDateTime(question.sourceUpdatedAt)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm font-medium text-text-3">
                      {locale === 'zh-CN' ? '暂无 CodeTop 高频题数据。请先在 Popup 或后台刷新 CodeTop。' : 'No CodeTop hot question data yet. Refresh CodeTop from popup or admin.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border-soft px-4 py-3 text-xs font-medium text-text-2 md:flex-row md:items-center md:justify-between">
            <span>
              {locale === 'zh-CN'
                ? `${filteredHotQuestions.length} records`
                : `${filteredHotQuestions.length} records`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xs border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setHotPage((page) => Math.max(1, page - 1))}
                disabled={safeHotPage <= 1}
              >
                {locale === 'zh-CN' ? '上一页' : 'Prev'}
              </button>
              <span className="rounded-xs bg-surface-2 px-3 py-1.5 font-semibold text-text">
                {safeHotPage} / {hotPageCount}
              </span>
              <button
                type="button"
                className="rounded-xs border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
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
