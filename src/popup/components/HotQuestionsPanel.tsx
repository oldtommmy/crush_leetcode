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

const companyMarks: Record<string, { label: string }> = {
  字节跳动: { label: '字' },
  微软: { label: 'MS' },
  美团: { label: '美' },
  阿里巴巴: { label: '阿' },
  快手: { label: '快' },
  腾讯: { label: '腾' },
  猿辅导: { label: '猿' },
  百度: { label: '百' },
  滴滴: { label: '滴' },
  京东: { label: 'JD' },
  华为: { label: '华' },
  拼多多: { label: '拼' },
  网易: { label: '网' },
  小米: { label: '米' },
  商汤: { label: '商' },
  旷视: { label: '旷' },
  亚马逊: { label: 'AZ' },
  虾皮: { label: '虾' },
  图森: { label: '图' },
  携程: { label: '携' },
  bilibili: { label: 'B' },
  小红书: { label: '红' }
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
    label: name.slice(0, 1).toUpperCase()
  };
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-sm bg-surface-2 font-semibold text-text-2 ${sizeClass}`}>
      {mark.label}
    </span>
  );
}

function leetcodeUrl(question: Pick<HotQuestion, 'slugTitle'>): string {
  return `https://leetcode.cn/problems/${question.slugTitle}/`;
}

function DifficultyBadge({ difficulty, locale }: { difficulty: number; locale: Locale }) {
  const className = difficulty === 1
    ? 'bg-easy-soft text-easy-ink'
    : difficulty === 3
      ? 'bg-stuck-soft text-stuck-ink'
      : 'bg-hard-soft text-hard-ink';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
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
    <article className="rounded-m border border-border-soft bg-surface p-3 shadow-sm transition-all duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <CompanyMark name={question.companyName} size="sm" />
            <span className="rounded-xs bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-2">
              #{question.leetcodeFrontendId}
            </span>
            <DifficultyBadge difficulty={question.difficulty} locale={locale} />
            {recommendation && 'score' in question ? (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-strong">
                {scoreLabel(question.score, locale)}
              </span>
            ) : null}
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text">
            {question.title}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-text-2">
            {displayCompanyName(question.companyName)} · {copy(locale, '频率', 'Freq')} {question.frequency}
          </p>
        </div>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:-translate-y-0.5 active:scale-95"
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
              className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-medium text-text-2"
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
        <span className="text-[10px] font-semibold uppercase text-text-2">
          {copy(locale, '目标大厂', 'Target company')}
        </span>
        <span className="text-[10px] font-medium text-text-3">
          {companies.length} {copy(locale, '家公司', 'companies')}
        </span>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-sm border border-border bg-surface px-3 py-2.5 text-left transition hover:bg-surface-2"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedCompany ? <CompanyMark name={selectedCompany.name} /> : null}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text">
              {selectedCompany ? displayCompanyName(selectedCompany.name) : copy(locale, '选择大厂', 'Select company')}
            </span>
            <span className="block text-[10px] font-medium text-text-3">
              {copy(locale, '点击切换目标公司', 'Tap to change target company')}
            </span>
          </span>
        </span>
        <svg className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-sm border border-border bg-surface p-1 shadow-lg">
          {companies.map((company) => {
            const active = company.id === selectedCompanyId;
            return (
            <button
              key={company.id}
              type="button"
              className={`flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left transition ${
                active
                  ? 'bg-surface-2 text-text'
                  : 'text-text-2 hover:text-text'
              }`}
              onClick={() => {
                setOpen(false);
                onChange(company.id);
              }}
              title={company.name}
            >
              <CompanyMark name={company.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{displayCompanyName(company.name)}</span>
              {company.isNew ? <span className="text-[9px] text-success">new</span> : null}
              {active ? (
                <span className="text-[10px] font-semibold text-success">{copy(locale, '当前', 'Active')}</span>
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
      <div className="space-y-3">
        <div className="h-24 rounded-m bg-surface-2 animate-pulse" />
        <div className="h-20 rounded-m bg-surface-2 animate-pulse" />
        <div className="h-20 rounded-m bg-surface-2 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-m border border-border-soft bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">
              {copy(locale, 'CodeTop 大厂高频题', 'CodeTop Company Hot List')}
            </h2>
            <p className="text-[11px] font-medium text-text-2">
              {copy(locale, '按目标大厂近期开题频率推荐，仅同步题目元信息', 'Company-specific interview frequency; metadata only')}
            </p>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-2 transition hover:bg-surface active:scale-95"
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
          <div className="mt-3 rounded-sm bg-hard-soft p-3 text-xs font-medium text-hard-ink">
            {error || data?.lastError || copy(locale, '同步数据可能不是最新，但已展示缓存。', 'Data may be stale; showing cached results.')}
          </div>
        ) : null}
      </section>

      {!loading && data && data.companies.length === 0 ? (
        <div className="rounded-m border-2 border-dashed border-border p-6 text-center text-sm font-medium text-text-2">
          {copy(locale, '暂无高频题数据，请稍后刷新。', 'No hot question data yet. Try refreshing later.')}
        </div>
      ) : null}

      {data && data.questions.length ? (
        <section className="space-y-2">
          <div className="px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
              {copy(locale, '题目排序', 'Question Sort')}
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-sm bg-surface-2 p-1">
              {([
                ['smart', copy(locale, '智能推荐', 'Smart')],
                ['frequency', copy(locale, '高频优先', 'Frequency')],
                ['recent', copy(locale, '最近出现', 'Recent')]
              ] as Array<[HotQuestionSortMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-xs px-2 py-2 text-[11px] font-semibold transition ${
                    sortMode === mode
                      ? 'bg-surface text-text shadow-sm'
                      : 'text-text-2 hover:text-text'
                  }`}
                  onClick={() => setSortMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-text-2">
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
