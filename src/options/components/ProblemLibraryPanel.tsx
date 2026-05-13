import { useEffect, useMemo, useState } from 'react';
import { displayProblemTags, displayProblemTitle } from '../../shared/leetcode/display';
import type { ExtensionStorageState, Locale, Problem, ProblemDifficulty, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { MarkdownPreview } from '../../popup/components/MarkdownPreview';
import { calculateRetrievability, getMasteryTier } from '../../shared/review/selectors';
import { sanitizeMarkdown } from '../../shared/markdown/sanitize';

interface ProblemLibraryPanelProps {
  state: ExtensionStorageState;
  locale: Locale;
  embedded?: boolean;
  onChanged?: () => void;
}

type NoteFilter = 'all' | 'with_notes' | 'without_notes';

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function masteryLabel(stability: number, locale: Locale): string {
  const tier = getMasteryTier(stability);
  const labels = {
    new: locale === 'zh-CN' ? '陌生' : 'New',
    familiar: locale === 'zh-CN' ? '熟悉' : 'Familiar',
    proficient: locale === 'zh-CN' ? '熟练' : 'Proficient',
    mastered: locale === 'zh-CN' ? '精通' : 'Mastered'
  };
  return labels[tier];
}

function masteryClassName(stability: number): string {
  const tier = getMasteryTier(stability);
  return {
    new: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300',
    familiar: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300',
    proficient: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
    mastered: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
  }[tier];
}

function memoryStrengthPercent(problem: Problem): number {
  return Math.round(calculateRetrievability(problem.stability, problem.lastReviewAt ?? problem.firstAcceptedAt) * 100);
}

function difficultyMeta(difficulty: ProblemDifficulty | 'all', locale: Locale): { label: string; className: string; activeClassName: string } {
  const map = {
    all: {
      label: locale === 'zh-CN' ? '全部' : 'All',
      className: 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
      activeClassName: 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900'
    },
    Easy: {
      label: locale === 'zh-CN' ? '简单' : 'Easy',
      className: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
      activeClassName: 'border-emerald-500 bg-emerald-500 text-white shadow-sm dark:border-emerald-400 dark:bg-emerald-500 dark:text-white'
    },
    Medium: {
      label: locale === 'zh-CN' ? '中等' : 'Medium',
      className: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
      activeClassName: 'border-amber-500 bg-amber-500 text-white shadow-sm dark:border-amber-400 dark:bg-amber-500 dark:text-neutral-950'
    },
    Hard: {
      label: locale === 'zh-CN' ? '困难' : 'Hard',
      className: 'border-red-100 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400',
      activeClassName: 'border-red-500 bg-red-500 text-white shadow-sm dark:border-red-400 dark:bg-red-500 dark:text-white'
    },
    Unknown: {
      label: locale === 'zh-CN' ? '未知' : 'Unknown',
      className: 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
      activeClassName: 'border-neutral-500 bg-neutral-500 text-white shadow-sm dark:border-neutral-400 dark:bg-neutral-500 dark:text-white'
    }
  };
  return map[difficulty];
}

export function ProblemLibraryPanel({ state, locale, embedded = true, onChanged }: ProblemLibraryPanelProps) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<ProblemDifficulty | 'all'>('all');
  const [noteFilter, setNoteFilter] = useState<NoteFilter>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [activeProblemId, setActiveProblemId] = useState<string | undefined>();
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState<string | undefined>();

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(state.problemsById)
      .filter((problem) => !problem.archived)
      .forEach((problem) => {
        displayProblemTags(problem.tags, locale).forEach((tag) => {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        });
      });

    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [locale, state.problemsById]);

  const problems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return Object.values(state.problemsById)
      .filter((problem) => !problem.archived)
      .filter((problem) => difficulty === 'all' || problem.difficulty === difficulty)
      .filter((problem) => tagFilter === 'all' || displayProblemTags(problem.tags, locale).includes(tagFilter))
      .filter((problem) => {
        const hasNote = Boolean(state.notesByProblemId[problem.id]?.markdown?.trim());
        if (noteFilter === 'with_notes') return hasNote;
        if (noteFilter === 'without_notes') return !hasNote;
        return true;
      })
      .filter((problem) => {
        if (!normalizedQuery) return true;
        const searchable = [
          problem.title,
          problem.titleZh,
          problem.titleSlug,
          problem.difficulty,
          ...displayProblemTags(problem.tags, 'en'),
          ...displayProblemTags(problem.tags, 'zh-CN')
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [difficulty, locale, noteFilter, query, state.notesByProblemId, state.problemsById, tagFilter]);

  const activeProblem = problems.find((problem) => problem.id === activeProblemId) ?? problems[0];
  const activeNote = activeProblem ? state.notesByProblemId[activeProblem.id]?.markdown ?? '' : '';
  const activeStrengthPercent = activeProblem ? memoryStrengthPercent(activeProblem) : 0;
  const activeStrengthDanger = activeStrengthPercent < 90;
  const date = new Date().toISOString().slice(0, 10);
  const noteCount = Object.values(state.notesByProblemId).filter((note) => note.markdown.trim()).length;
  const difficultyOptions: Array<{ value: ProblemDifficulty | 'all'; label: string }> = [
    { value: 'all', label: difficultyMeta('all', locale).label },
    { value: 'Easy', label: difficultyMeta('Easy', locale).label },
    { value: 'Medium', label: difficultyMeta('Medium', locale).label },
    { value: 'Hard', label: difficultyMeta('Hard', locale).label },
    { value: 'Unknown', label: difficultyMeta('Unknown', locale).label }
  ];
  const noteOptions: Array<{ value: NoteFilter; label: string }> = [
    { value: 'all', label: locale === 'zh-CN' ? '全部' : 'All' },
    { value: 'with_notes', label: locale === 'zh-CN' ? '有笔记' : 'With notes' },
    { value: 'without_notes', label: locale === 'zh-CN' ? '无笔记' : 'No notes' }
  ];

  const exportLibraryCsv = () => {
    const header = [
      'title',
      'titleSlug',
      'difficulty',
      'url',
      'tags',
      'reviewCount',
      'nextReviewAt',
      'lastAcceptedAt',
      'hasNote'
    ];
    const rows = Object.values(state.problemsById)
      .filter((problem) => !problem.archived)
      .sort((a, b) => displayProblemTitle(a, locale).localeCompare(displayProblemTitle(b, locale)))
      .map((problem) => [
        displayProblemTitle(problem, locale),
        problem.titleSlug,
        problem.difficulty,
        problem.url,
        displayProblemTags(problem.tags, locale).join(', '),
        problem.reviewCount,
        problem.nextReviewAt,
        problem.lastAcceptedAt,
        Boolean(state.notesByProblemId[problem.id]?.markdown?.trim())
      ]);

    downloadTextFile(
      `crush-leetcode-problem-library-${date}.csv`,
      [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'),
      'text/csv;charset=utf-8'
    );
  };

  const exportLibraryJson = () => {
    const payload = Object.values(state.problemsById)
      .filter((problem) => !problem.archived)
      .map((problem) => ({
        ...problem,
        noteMarkdown: state.notesByProblemId[problem.id]?.markdown ?? ''
      }));
    downloadTextFile(
      `crush-leetcode-problem-library-${date}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  };

  useEffect(() => {
    setNoteDraft(activeNote);
    setEditingNote(false);
    setNoteMessage(undefined);
  }, [activeNote, activeProblem?.id]);

  const startEditingNote = (problem: Problem) => {
    setActiveProblemId(problem.id);
    setNoteDraft(state.notesByProblemId[problem.id]?.markdown ?? '');
    setEditingNote(true);
    setNoteMessage(undefined);
  };

  const saveActiveNote = async () => {
    if (!activeProblem) return;

    setSavingNote(true);
    setNoteMessage(undefined);
    const request: RuntimeRequest = {
      type: 'SAVE_NOTE',
      payload: {
        problemId: activeProblem.id,
        markdown: sanitizeMarkdown(noteDraft)
      }
    };
    const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse;
    setSavingNote(false);
    if (!response.ok) {
      setNoteMessage(response.error ?? 'Failed to save note.');
      return;
    }
    setEditingNote(false);
    setNoteMessage(locale === 'zh-CN' ? '笔记已保存' : 'Note saved');
    onChanged?.();
  };

  return (
    <section className={`${embedded ? 'mt-8' : 'mt-6'} rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#262626]`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            {locale === 'zh-CN' ? '完整题库' : 'Problem library'}
          </h2>
          <p className="mt-1 text-xs font-medium text-neutral-500">
            {locale === 'zh-CN'
              ? `${Object.keys(state.problemsById).length} 道题，${noteCount} 篇笔记`
              : `${Object.keys(state.problemsById).length} problems, ${noteCount} notes`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-black text-white transition hover:bg-black dark:bg-white dark:text-neutral-900"
            onClick={exportLibraryCsv}
          >
            {locale === 'zh-CN' ? '导出 CSV' : 'Export CSV'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-black text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            onClick={exportLibraryJson}
          >
            {locale === 'zh-CN' ? '导出 JSON' : 'Export JSON'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto]">
        <input
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === 'zh-CN' ? '搜索题目、标签、slug' : 'Search title, tags, slug'}
        />
        <div className="flex flex-col gap-2 xl:flex-row">
          <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-black transition ${
                  difficulty === option.value
                    ? difficultyMeta(option.value, locale).activeClassName
                    : `${difficultyMeta(option.value, locale).className} hover:brightness-95 dark:hover:brightness-110`
                }`}
                onClick={() => setDifficulty(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
            {noteOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition ${
                  noteFilter === option.value
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
                onClick={() => setNoteFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
        <div className="flex min-w-max gap-1">
          <button
            type="button"
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition ${
              tagFilter === 'all'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
            onClick={() => setTagFilter('all')}
          >
            {locale === 'zh-CN' ? '全部标签' : 'All tags'}
          </button>
          {tagOptions.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition ${
                tagFilter === tag
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              onClick={() => setTagFilter(tag)}
            >
              {tag}
              <span className="ml-1 opacity-50">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '题目' : 'Problem'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '难度' : 'Difficulty'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '掌握' : 'Mastery'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '下次复习' : 'Next'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '笔记' : 'Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {problems.map((problem) => {
                  const selected = problem.id === activeProblem?.id;
                  const tags = displayProblemTags(problem.tags, locale);
                  const strengthPercent = memoryStrengthPercent(problem);
                  const isDanger = strengthPercent < 90;
                  const diff = difficultyMeta(problem.difficulty, locale);
                  return (
                    <tr
                      key={problem.id}
                      className={`cursor-pointer transition ${selected ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'}`}
                      onClick={() => setActiveProblemId(problem.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100">{displayProblemTitle(problem, locale)}</div>
                        <div className="mt-1 text-xs text-neutral-500">{problem.titleSlug}</div>
                        {tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tags.slice(0, 4).map((tag) => (
                              <span key={`${problem.id}-${tag}`} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-tight ${diff.className}`}>
                          {diff.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-[120px]">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight ${masteryClassName(problem.stability)}`}>
                              {masteryLabel(problem.stability, locale)}
                            </span>
                            <span className={`text-[10px] font-black ${isDanger ? 'text-red-500' : 'text-emerald-500'}`}>
                              {strengthPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div
                              className={`h-full transition-all duration-500 ${isDanger ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${strengthPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{problem.nextReviewAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        {state.notesByProblemId[problem.id]?.markdown?.trim() ? (
                          <button
                            type="button"
                            className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-black dark:bg-white dark:text-neutral-900"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveProblemId(problem.id);
                              setEditingNote(false);
                            }}
                          >
                            {locale === 'zh-CN' ? '查看笔记' : 'View note'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditingNote(problem);
                            }}
                          >
                            {locale === 'zh-CN' ? '编辑笔记' : 'Edit note'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {problems.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-bold text-neutral-400" colSpan={5}>
                      {locale === 'zh-CN' ? '没有匹配题目' : 'No matching problems'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950">
          {activeProblem ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${difficultyMeta(activeProblem.difficulty, locale).className}`}>
                  {difficultyMeta(activeProblem.difficulty, locale).label}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${masteryClassName(activeProblem.stability)}`}>
                  {masteryLabel(activeProblem.stability, locale)}
                </span>
              </div>
              <h3 className="mt-2 text-base font-black leading-snug text-neutral-900 dark:text-neutral-100">
                {displayProblemTitle(activeProblem, locale)}
              </h3>
              <a href={activeProblem.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-bold text-amber-600">
                {activeProblem.url}
              </a>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white p-3 dark:bg-[#262626]">
                  <div className="font-black text-neutral-900 dark:text-neutral-100">{activeProblem.reviewCount}</div>
                  <div className="mt-1 text-neutral-500">{locale === 'zh-CN' ? '复习次数' : 'Reviews'}</div>
                </div>
                <div className="rounded-xl bg-white p-3 dark:bg-[#262626]">
                  <div className="font-black text-neutral-900 dark:text-neutral-100">{activeProblem.currentIntervalDays}</div>
                  <div className="mt-1 text-neutral-500">{locale === 'zh-CN' ? '间隔天数' : 'Interval days'}</div>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-white p-3 dark:bg-[#262626]">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  <span>{locale === 'zh-CN' ? '记忆强度' : 'Memory strength'}</span>
                  <span className={activeStrengthDanger ? 'text-red-500' : 'text-emerald-500'}>
                    {activeStrengthPercent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full transition-all duration-500 ${activeStrengthDanger ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${activeStrengthPercent}%` }}
                  />
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-xs font-black text-neutral-900 dark:text-neutral-100">
                    {editingNote
                      ? (locale === 'zh-CN' ? 'Markdown 笔记编辑' : 'Markdown note editor')
                      : (locale === 'zh-CN' ? 'Markdown 笔记预览' : 'Markdown note preview')}
                  </div>
                  <div className="flex gap-1.5">
                    {editingNote ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-[#262626] dark:text-neutral-300"
                          onClick={() => {
                            setNoteDraft(activeNote);
                            setEditingNote(false);
                          }}
                        >
                          {locale === 'zh-CN' ? '取消' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-amber-600 disabled:opacity-60 dark:text-neutral-950"
                          disabled={savingNote}
                          onClick={saveActiveNote}
                        >
                          {savingNote ? (locale === 'zh-CN' ? '保存中' : 'Saving') : (locale === 'zh-CN' ? '保存' : 'Save')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-[#262626] dark:text-neutral-300"
                        onClick={() => startEditingNote(activeProblem)}
                      >
                        {locale === 'zh-CN' ? '编辑笔记' : 'Edit note'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#1a1a1a]">
                  {editingNote ? (
                    <textarea
                      className="min-h-[260px] w-full resize-y border-none bg-transparent font-mono text-xs leading-relaxed text-neutral-800 outline-none dark:text-neutral-200"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={locale === 'zh-CN' ? '写下题解思路、复杂度、易错点...' : 'Write solution notes, complexity, pitfalls...'}
                      autoFocus
                    />
                  ) : activeNote.trim() ? (
                    <MarkdownPreview markdown={activeNote} />
                  ) : (
                    <p className="text-sm font-medium text-neutral-400">
                      {locale === 'zh-CN' ? '这道题还没有笔记。' : 'No note for this problem yet.'}
                    </p>
                  )}
                </div>
                {noteMessage ? (
                  <div className={`mt-2 text-xs font-bold ${noteMessage.includes('Failed') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {noteMessage}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
