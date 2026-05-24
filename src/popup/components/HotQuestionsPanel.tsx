import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  HotQuestion,
  HotQuestionCompany,
  HotQuestionRecommendation,
  HotQuestionReason,
  HotQuestionsRuntimeData,
  Locale,
  RuntimeRequest,
  RuntimeResponse
} from '../../shared/types';

interface HotQuestionsPanelProps {
  locale: Locale;
}

type HotQuestionSortMode = 'smart' | 'frequency' | 'recent';

const companyMarks: Record<string, { label: string; className: string }> = {
  字节跳动: { label: '字', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' },
  微软: { label: 'MS', className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' },
  美团: { label: '美', className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300' },
  阿里巴巴: { label: '阿', className: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300' },
  快手: { label: '快', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
  腾讯: { label: '腾', className: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300' },
  猿辅导: { label: '猿', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' },
  百度: { label: '百', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  滴滴: { label: '滴', className: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300' },
  京东: { label: 'JD', className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' },
  华为: { label: '华', className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' },
  拼多多: { label: '拼', className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' },
  网易: { label: '网', className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  小米: { label: '米', className: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300' },
  商汤: { label: '商', className: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300' },
  旷视: { label: '旷', className: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300' },
  亚马逊: { label: 'AZ', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  虾皮: { label: '虾', className: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300' },
  图森: { label: '图', className: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300' },
  携程: { label: '携', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' },
  bilibili: { label: 'B', className: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300' },
  小红书: { label: '红', className: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' }
};

const reasonLabels: Record<Locale, Record<HotQuestionReason, string>> = {
  en: {
    company_hot: 'Company hot',
    not_solved: 'Not solved',
    review_due: 'Due',
    previously_hard: 'Needs review',
    recently_updated: 'Recent'
  },
  'zh-CN': {
    company_hot: '大厂高频',
    not_solved: '未刷高频',
    review_due: '到期复习',
    previously_hard: '曾经困难',
    recently_updated: '近期更新'
  }
};

const difficultyLabels: Record<Locale, Record<number, string>> = {
  en: {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard'
  },
  'zh-CN': {
    1: '简单',
    2: '中等',
    3: '困难'
  }
};

function copy(locale: Locale, zh: string, en: string): string {
  return locale === 'zh-CN' ? zh : en;
}

function displayCompanyName(name: string): string {
  return name === '字节跳动' ? '字节' : name;
}

function CompanyMark({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const mark = companyMarks[name] ?? {
    label: name.slice(0, 1).toUpperCase(),
    className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
  };
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg font-black ${sizeClass} ${mark.className}`}>
      {mark.label}
    </span>
  );
}

function leetcodeUrl(question: Pick<HotQuestion, 'slugTitle'>): string {
  return `https://leetcode.cn/problems/${question.slugTitle}/`;
}

function DifficultyBadge({ difficulty, locale }: { difficulty: number; locale: Locale }) {
  const className = difficulty === 1
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
    : difficulty === 3
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
      : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${className}`}>
      {difficultyLabels[locale][difficulty] ?? copy(locale, '未知', 'Unknown')}
    </span>
  );
}

function scoreLabel(score: number, locale: Locale): string {
  const value = Math.round(score * 100);
  return copy(locale, `优先级 ${value}`, `Priority ${value}`);
}

function openQuestion(question: Pick<HotQuestion, 'slugTitle'>) {
  chrome.runtime.sendMessage({
    type: 'OPEN_URL',
    payload: { url: leetcodeUrl(question) }
  } satisfies RuntimeRequest);
}

function QuestionCard({
  question,
  locale,
  recommendation
}: {
  question: HotQuestion | HotQuestionRecommendation;
  locale: Locale;
  recommendation?: boolean;
}) {
  const reasons = 'reasons' in question ? question.reasons : [];
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <CompanyMark name={question.companyName} size="sm" />
            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-black text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              #{question.leetcodeFrontendId}
            </span>
            <DifficultyBadge difficulty={question.difficulty} locale={locale} />
            {recommendation && 'score' in question ? (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {scoreLabel(question.score, locale)}
              </span>
            ) : null}
          </div>
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-neutral-900 dark:text-neutral-100">
            {question.title}
          </h3>
          <p className="mt-1 text-[11px] font-semibold text-neutral-500">
            {displayCompanyName(question.companyName)} · {copy(locale, '频率', 'Freq')} {question.frequency}
          </p>
        </div>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-black active:scale-95 dark:bg-white dark:text-neutral-900"
          onClick={() => openQuestion(question)}
          title={copy(locale, '打开题目', 'Open problem')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>
      {reasons.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {reasonLabels[locale][reason]}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CompanySelect({
  companies,
  selectedCompanyId,
  locale,
  onChange
}: {
  companies: HotQuestionCompany[];
  selectedCompanyId?: number;
  locale: Locale;
  onChange: (companyId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase text-neutral-500">
          {copy(locale, '目标大厂', 'Target company')}
        </span>
        <span className="text-[10px] font-bold text-neutral-400">
          {companies.length} {copy(locale, '家公司', 'companies')}
        </span>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedCompany ? <CompanyMark name={selectedCompany.name} /> : null}
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-neutral-900 dark:text-neutral-100">
              {selectedCompany ? displayCompanyName(selectedCompany.name) : copy(locale, '选择大厂', 'Select company')}
            </span>
            <span className="block text-[10px] font-bold text-neutral-400">
              {copy(locale, '点击切换目标公司', 'Tap to change target company')}
            </span>
          </span>
        </span>
        <svg className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
          {companies.map((company) => {
            const active = company.id === selectedCompanyId;
            return (
            <button
              key={company.id}
              type="button"
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                active
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              onClick={() => {
                setOpen(false);
                onChange(company.id);
              }}
              title={company.name}
            >
              <CompanyMark name={company.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-xs font-black">{displayCompanyName(company.name)}</span>
              {company.isNew ? <span className="text-[9px] text-emerald-500">new</span> : null}
              {active ? (
                <span className="text-[10px] font-black text-emerald-500">{copy(locale, '当前', 'Active')}</span>
              ) : null}
            </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function sortByRecent(questions: HotQuestion[]): HotQuestion[] {
  return [...questions].sort((a, b) => {
    const aTime = a.sourceUpdatedAt ? new Date(a.sourceUpdatedAt).getTime() : 0;
    const bTime = b.sourceUpdatedAt ? new Date(b.sourceUpdatedAt).getTime() : 0;
    return bTime - aTime || b.frequency - a.frequency || (a.rank ?? 9999) - (b.rank ?? 9999);
  });
}

function sortByFrequency(questions: HotQuestion[]): HotQuestion[] {
  return [...questions].sort((a, b) => b.frequency - a.frequency || (a.rank ?? 9999) - (b.rank ?? 9999));
}

export function HotQuestionsPanel({ locale }: HotQuestionsPanelProps) {
  const [data, setData] = useState<HotQuestionsRuntimeData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [sortMode, setSortMode] = useState<HotQuestionSortMode>('smart');

  const load = useCallback((force = false) => {
    setLoading(true);
    chrome.runtime
      .sendMessage({
        type: force ? 'REFRESH_HOT_QUESTIONS' : 'GET_HOT_QUESTIONS',
        payload: force ? undefined : { force: false }
      } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<HotQuestionsRuntimeData>) => {
        if (!response.ok || !response.data) {
          throw new Error(response.error ?? copy(locale, '加载高频题失败', 'Failed to load hot questions.'));
        }
        setData(response.data);
        setError(undefined);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [locale]);

  useEffect(() => load(false), [load]);

  const updateCompany = useCallback((companyId: number) => {
    setLoading(true);
    chrome.runtime
      .sendMessage({
        type: 'UPDATE_HOT_QUESTION_COMPANY',
        payload: { companyId }
      } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<HotQuestionsRuntimeData>) => {
        if (!response.ok || !response.data) {
          throw new Error(response.error ?? copy(locale, '切换公司失败', 'Failed to change company.'));
        }
        setData(response.data);
        setError(undefined);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [locale]);

  const displayedQuestions = useMemo(() => {
    if (!data) return [];
    if (sortMode === 'smart') return data.recommendations.slice(0, 12);
    if (sortMode === 'recent') return sortByRecent(data.questions).slice(0, 12);
    return sortByFrequency(data.questions).slice(0, 12);
  }, [data, sortMode]);

  const sortDescription = sortMode === 'smart'
    ? copy(
      locale,
      '公司频率 45% + 你的本地记录 25% + 到期复习 20% + 近期更新 10%。未刷、到期、曾经困难会被提前。',
      'Company frequency 45%, your local history 25%, due reviews 20%, and recency 10%.'
    )
    : sortMode === 'frequency'
      ? copy(locale, '直接按 CodeTop 频率从高到低排序。', 'Sorted directly by CodeTop frequency.')
      : copy(locale, '直接按 CodeTop 来源更新时间从近到远排序。', 'Sorted directly by latest CodeTop source update.');

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-bold text-neutral-500 dark:border-neutral-800 dark:bg-[#262626]">
        {copy(locale, '正在加载高频题...', 'Loading hot questions...')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">
              {copy(locale, 'CodeTop 大厂高频题', 'CodeTop Company Hot List')}
            </h2>
            <p className="text-[11px] font-semibold text-neutral-500">
              {copy(locale, '按目标大厂近期开题频率推荐，仅同步题目元信息', 'Company-specific interview frequency; metadata only')}
            </p>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 active:scale-95 dark:bg-neutral-800 dark:text-neutral-200"
            onClick={() => load(true)}
            title={copy(locale, '刷新', 'Refresh')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M16 8h5V3" />
            </svg>
          </button>
        </div>
        {data?.companies.length ? (
          <CompanySelect
            companies={data.companies}
            selectedCompanyId={data.selectedCompanyId}
            locale={locale}
            onChange={updateCompany}
          />
        ) : null}
        {data?.stale || error || data?.lastError ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {error || data?.lastError || copy(locale, '同步数据可能不是最新，但已展示缓存。', 'Data may be stale; showing cached results.')}
          </div>
        ) : null}
      </section>

      {!loading && data && data.companies.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-6 text-center text-sm font-bold text-neutral-500 dark:border-neutral-800">
          {copy(locale, '暂无高频题数据，请稍后刷新。', 'No hot question data yet. Try refreshing later.')}
        </div>
      ) : null}

      {data && data.questions.length ? (
        <section className="space-y-2">
          <div className="px-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-neutral-500">
              {copy(locale, '题目排序', 'Question Sort')}
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
              {([
                ['smart', copy(locale, '智能推荐', 'Smart')],
                ['frequency', copy(locale, '高频优先', 'Frequency')],
                ['recent', copy(locale, '最近出现', 'Recent')]
              ] as Array<[HotQuestionSortMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-lg px-2 py-2 text-[11px] font-black transition ${
                    sortMode === mode
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  onClick={() => setSortMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-neutral-500">
              {sortDescription}
            </p>
          </div>
          {displayedQuestions.map((question) => (
            <QuestionCard
              key={`${question.companyId}-${question.leetcodeFrontendId}`}
              question={question}
              locale={locale}
              recommendation={sortMode === 'smart'}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
