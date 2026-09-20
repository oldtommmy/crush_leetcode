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
    new: 'bg-surface-2 text-text-2',
    familiar: 'bg-good-soft text-good-ink',
    proficient: 'bg-hard-soft text-hard-ink',
    mastered: 'bg-easy-soft text-easy-ink'
  }[tier];
}

function memoryStrengthPercent(problem: Problem): number {
  return Math.round(calculateRetrievability(problem.stability, problem.lastReviewAt ?? problem.firstAcceptedAt) * 100);
}

function difficultyMeta(difficulty: ProblemDifficulty | 'all', locale: Locale): { label: string; className: string; activeClassName: string } {
  const map = {
    all: {
      label: locale === 'zh-CN' ? '全部' : 'All',
      className: 'bg-surface-2 text-text-2',
      activeClassName: 'bg-brand text-white shadow-sm'
    },
    Easy: {
      label: locale === 'zh-CN' ? '简单' : 'Easy',
      className: 'bg-easy-soft text-easy-ink',
      activeClassName: 'bg-easy text-white shadow-sm'
    },
    Medium: {
      label: locale === 'zh-CN' ? '中等' : 'Medium',
      className: 'bg-hard-soft text-hard-ink',
      activeClassName: 'bg-hard text-white shadow-sm'
    },
    Hard: {
      label: locale === 'zh-CN' ? '困难' : 'Hard',
      className: 'bg-stuck-soft text-stuck-ink',
      activeClassName: 'bg-stuck text-white shadow-sm'
    },
    Unknown: {
      label: locale === 'zh-CN' ? '未知' : 'Unknown',
      className: 'bg-surface-2 text-text-2',
      activeClassName: 'bg-text-2 text-surface shadow-sm'
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
    <section className={`${embedded ? 'mt-8' : 'mt-6'} rounded-m border border-border-soft bg-surface p-6 shadow-sm`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text">
            {locale === 'zh-CN' ? '完整题库' : 'Problem library'}
          </h2>
          <p className="mt-1 text-xs font-medium text-text-2">
            {locale === 'zh-CN'
              ? `${Object.keys(state.problemsById).length} 道题，${noteCount} 篇笔记`
              : `${Object.keys(state.problemsById).length} problems, ${noteCount} notes`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5"
            onClick={exportLibraryCsv}
          >
            {locale === 'zh-CN' ? '导出 CSV' : 'Export CSV'}
          </button>
          <button
            type="button"
            className="rounded-sm border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-text-2 transition hover:bg-surface"
            onClick={exportLibraryJson}
          >
            {locale === 'zh-CN' ? '导出 JSON' : 'Export JSON'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto]">
        <input
          className="rounded-sm border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-brand focus:ring-4 focus:ring-brand"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === 'zh-CN' ? '搜索题目、标签、slug' : 'Search title, tags, slug'}
        />
        <div className="flex flex-col gap-2 xl:flex-row">
          <div className="flex rounded-sm bg-surface-2 p-1">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`whitespace-nowrap rounded-xs px-3 py-2 text-xs font-semibold transition ${
                  difficulty === option.value
                    ? difficultyMeta(option.value, locale).activeClassName
                    : `${difficultyMeta(option.value, locale).className} hover:brightness-95`
                }`}
                onClick={() => setDifficulty(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-sm bg-surface-2 p-1">
            {noteOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`whitespace-nowrap rounded-xs px-3 py-2 text-xs font-semibold transition ${
                  noteFilter === option.value
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-2 hover:text-text'
                }`}
                onClick={() => setNoteFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-sm bg-surface-2 p-1">
        <div className="flex min-w-max gap-1">
          <button
            type="button"
            className={`whitespace-nowrap rounded-xs px-3 py-2 text-xs font-semibold transition ${
              tagFilter === 'all'
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-2 hover:text-text'
            }`}
            onClick={() => setTagFilter('all')}
          >
            {locale === 'zh-CN' ? '全部标签' : 'All tags'}
          </button>
          {tagOptions.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={`whitespace-nowrap rounded-xs px-3 py-2 text-xs font-semibold transition ${
                tagFilter === tag
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-2 hover:text-text'
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
        <div className="overflow-hidden rounded-m border border-border-soft">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase tracking-wider text-text-2">
                <tr>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '题目' : 'Problem'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '难度' : 'Difficulty'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '掌握' : 'Mastery'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '下次复习' : 'Next'}</th>
                  <th className="px-4 py-3">{locale === 'zh-CN' ? '笔记' : 'Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {problems.map((problem) => {
                  const selected = problem.id === activeProblem?.id;
                  const tags = displayProblemTags(problem.tags, locale);
                  const strengthPercent = memoryStrengthPercent(problem);
                  const diff = difficultyMeta(problem.difficulty, locale);
                  return (
                    <tr
                      key={problem.id}
                      className={`cursor-pointer transition ${selected ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
                      onClick={() => setActiveProblemId(problem.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{displayProblemTitle(problem, locale)}</div>
                        <div className="mt-1 text-xs text-text-2">{problem.titleSlug}</div>
                        {tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tags.slice(0, 4).map((tag) => (
                              <span key={`${problem.id}-${tag}`} className="rounded-xs bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-2">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-xs px-2 py-1 text-[10px] font-semibold uppercase tracking-tight ${diff.className}`}>
                          {diff.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-[120px]">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-tight ${masteryClassName(problem.stability)}`}>
                              {masteryLabel(problem.stability, locale)}
                            </span>
                            <span className="text-[10px] font-semibold text-text-2">
                              {strengthPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-strength transition-all duration-500"
                              style={{ width: `${strengthPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-2">{problem.nextReviewAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        {state.notesByProblemId[problem.id]?.markdown?.trim() ? (
                          <button
                            type="button"
                            className="rounded-xs bg-brand px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:-translate-y-0.5"
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
                            className="rounded-xs border border-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-text-2 transition hover:bg-surface-2"
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
                    <td className="px-4 py-10 text-center text-sm font-medium text-text-3" colSpan={5}>
                      {locale === 'zh-CN' ? '没有匹配题目' : 'No matching problems'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-m border border-border-soft bg-surface-2 p-5">
          {activeProblem ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${difficultyMeta(activeProblem.difficulty, locale).className}`}>
                  {difficultyMeta(activeProblem.difficulty, locale).label}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${masteryClassName(activeProblem.stability)}`}>
                  {masteryLabel(activeProblem.stability, locale)}
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold leading-snug text-text">
                {displayProblemTitle(activeProblem, locale)}
              </h3>
              <a href={activeProblem.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-semibold text-brand-strong">
                {activeProblem.url}
              </a>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-sm bg-surface p-3">
                  <div className="font-semibold text-text">{activeProblem.reviewCount}</div>
                  <div className="mt-1 text-text-2">{locale === 'zh-CN' ? '复习次数' : 'Reviews'}</div>
                </div>
                <div className="rounded-sm bg-surface p-3">
                  <div className="font-semibold text-text">{activeProblem.currentIntervalDays}</div>
                  <div className="mt-1 text-text-2">{locale === 'zh-CN' ? '间隔天数' : 'Interval days'}</div>
                </div>
              </div>
              <div className="mt-4 rounded-sm bg-surface p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-3">
                  <span>{locale === 'zh-CN' ? '记忆强度' : 'Memory strength'}</span>
                  <span className="text-text-2">
                    {activeStrengthPercent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-strength transition-all duration-500"
                    style={{ width: `${activeStrengthPercent}%` }}
                  />
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-text">
                    {editingNote
                      ? (locale === 'zh-CN' ? 'Markdown 笔记编辑' : 'Markdown note editor')
                      : (locale === 'zh-CN' ? 'Markdown 笔记预览' : 'Markdown note preview')}
                  </div>
                  <div className="flex gap-1.5">
                    {editingNote ? (
                      <>
                        <button
                          type="button"
                          className="rounded-xs border border-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-text-2 transition hover:bg-surface-2"
                          onClick={() => {
                            setNoteDraft(activeNote);
                            setEditingNote(false);
                          }}
                        >
                          {locale === 'zh-CN' ? '取消' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          className="rounded-xs bg-brand px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                          disabled={savingNote}
                          onClick={saveActiveNote}
                        >
                          {savingNote ? (locale === 'zh-CN' ? '保存中' : 'Saving') : (locale === 'zh-CN' ? '保存' : 'Save')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rounded-xs border border-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-text-2 transition hover:bg-surface-2"
                        onClick={() => startEditingNote(activeProblem)}
                      >
                        {locale === 'zh-CN' ? '编辑笔记' : 'Edit note'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto rounded-sm border border-border bg-surface p-4">
                  {editingNote ? (
                    <textarea
                      className="min-h-[260px] w-full resize-y border-none bg-transparent font-mono text-xs leading-relaxed text-text outline-none"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={locale === 'zh-CN' ? '写下题解思路、复杂度、易错点...' : 'Write solution notes, complexity, pitfalls...'}
                      autoFocus
                    />
                  ) : activeNote.trim() ? (
                    <MarkdownPreview markdown={activeNote} />
                  ) : (
                    <p className="text-sm font-medium text-text-3">
                      {locale === 'zh-CN' ? '这道题还没有笔记。' : 'No note for this problem yet.'}
                    </p>
                  )}
                </div>
                {noteMessage ? (
                  <div className={`mt-2 text-xs font-semibold ${noteMessage.includes('Failed') ? 'text-danger' : 'text-easy-ink'}`}>
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
