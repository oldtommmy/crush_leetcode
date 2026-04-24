import { useMemo, useState } from 'react';
import { sanitizeMarkdown } from '../../shared/markdown/sanitize';
import { problemIdFor } from '../../shared/review/scheduler';
import type { Locale, Problem, ProblemNote, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { t } from '../../shared/i18n/messages';
import { displayProblemTags, displayProblemTitle } from '../../shared/leetcode/display';
import { MarkdownPreview } from './MarkdownPreview';

interface NoteEditorProps {
  problems: Problem[];
  notes: Record<string, ProblemNote>;
  locale: Locale;
  onSaved: () => void;
}

export function NoteEditor({ problems, notes, locale, onSaved }: NoteEditorProps) {
  const [activeProblemId, setActiveProblemId] = useState<string | undefined>(problems[0]?.id);
  const [markdown, setMarkdown] = useState(() => (activeProblemId ? notes[activeProblemId]?.markdown ?? '' : ''));
  const [preview, setPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const filteredProblems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return problems;
    }

    return problems.filter((problem) => {
      const searchableText = [
        problem.title,
        problem.titleZh,
        problem.titleSlug,
        ...(problem.tags ?? []),
        ...displayProblemTags(problem.tags, 'en'),
        ...displayProblemTags(problem.tags, 'zh-CN')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [problems, searchQuery]);

  const currentProblemId = activeProblemId && filteredProblems.some(p => p.id === activeProblemId)
    ? activeProblemId
    : filteredProblems[0]?.id;
  const selectedProblem = problems.find((problem) => problem.id === currentProblemId);

  const difficultyTone: Record<string, string> = {
    Easy: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20',
    Medium: 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20',
    Hard: 'text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20'
  };

  const changeProblem = (id: string) => {
    setActiveProblemId(id);
    setMarkdown(notes[id]?.markdown ?? '');
    setPickerOpen(false);
  };

  const save = async () => {
    if (!currentProblemId) return;
    const request: RuntimeRequest = {
      type: 'SAVE_NOTE',
      payload: {
        problemId: currentProblemId,
        markdown: sanitizeMarkdown(markdown)
      }
    };
    const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse;
    if (!response.ok) {
      alert(response.error ?? 'Failed to save note.');
    }
    onSaved();
  };

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{t(locale, 'notes')}</h2>
        <div className="flex overflow-hidden rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800">
          <button
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${!preview ? 'rounded-md bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            onClick={() => setPreview(false)}
          >
            {t(locale, 'edit')}
          </button>
          <button
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${preview ? 'rounded-md bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            onClick={() => setPreview(true)}
          >
            {t(locale, 'view')}
          </button>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-xl border border-neutral-200 bg-white px-9 py-2 text-xs transition-all focus:border-amber-500 focus:outline-none dark:border-neutral-800 dark:bg-[#262626] dark:text-neutral-100"
            placeholder={t(locale, 'searchNotes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left transition-all hover:border-neutral-300 focus:border-amber-500 focus:outline-none dark:border-neutral-800 dark:bg-[#262626] dark:hover:border-neutral-700"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {t(locale, 'selectProblem')}
              </div>
              {selectedProblem ? (
                <>
                  <div className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {displayProblemTitle(selectedProblem, locale)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span className={`rounded-md border px-1.5 py-0.5 font-bold ${difficultyTone[selectedProblem.difficulty] ?? 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                      {selectedProblem.difficulty}
                    </span>
                    <span className="truncate">{selectedProblem.titleSlug}</span>
                  </div>
                </>
              ) : (
                <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t(locale, 'noMatches')}</div>
              )}
            </div>
            <div className={`ml-3 shrink-0 text-neutral-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {pickerOpen && (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/60 dark:border-neutral-800 dark:bg-[#1f1f1f] dark:shadow-black/30">
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredProblems.length > 0 ? (
                  <div className="space-y-1">
                    {filteredProblems.map((problem) => {
                      const displayTitle = displayProblemTitle(problem, locale);
                      const displayTags = displayProblemTags(problem.tags, locale);
                      const isSelected = problem.id === currentProblemId;

                      return (
                        <button
                          key={problem.id}
                          type="button"
                          className={`flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/80'
                          }`}
                          onClick={() => changeProblem(problem.id)}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <span className="line-clamp-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {displayTitle}
                            </span>
                            <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                              difficultyTone[problem.difficulty] ?? 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}>
                              {problem.difficulty}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                            {problem.titleSlug}
                          </div>
                          {displayTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {displayTags.slice(0, 3).map((tag) => (
                                <span
                                  key={`${problem.id}-${tag}`}
                                  className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl px-3 py-6 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {t(locale, 'noMatches')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        {preview ? (
          <div className="max-h-[300px] overflow-y-auto p-4">
            <MarkdownPreview markdown={markdown} />
          </div>
        ) : (
          <textarea
            className="h-40 w-full resize-none border-none bg-transparent p-4 font-mono text-xs leading-relaxed transition-all focus:outline-none dark:text-neutral-200"
            placeholder={t(locale, 'notePlaceholder')}
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
          />
        )}
      </div>

      <button
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600 hover:shadow-lg active:scale-[0.98] dark:text-neutral-900"
        onClick={save}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {t(locale, 'save')}
      </button>
    </section>
  );
}
