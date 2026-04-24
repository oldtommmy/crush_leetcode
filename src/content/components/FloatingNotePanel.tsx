import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { sanitizeMarkdown } from '../../shared/markdown/sanitize';
import { problemIdFor } from '../../shared/review/scheduler';
import type { ExtensionStorageState, Locale, ProblemIdentity, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { t } from '../../shared/i18n/messages';
import { displayProblemTitle } from '../../shared/leetcode/display';
import 'highlight.js/styles/github-dark.css';

interface FloatingNotePanelProps {
  identity: ProblemIdentity;
  locale: Locale;
  onRate: () => void;
}

export function FloatingNotePanel({ identity, locale, onRate }: FloatingNotePanelProps) {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | undefined>();
  const latestPosition = useRef<{ x: number; y: number } | undefined>();
  const dragState = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  }>();
  const problemId = problemIdFor(identity);
  const displayTitle = displayProblemTitle(identity, locale);

  useEffect(() => {
    const saved = window.localStorage.getItem('quizRecallFloatingPosition');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        const nextPosition = {
          x: Math.max(12, Math.min(window.innerWidth - 180, parsed.x)),
          y: Math.max(12, Math.min(window.innerHeight - 56, parsed.y))
        };
        latestPosition.current = nextPosition;
        setPosition(nextPosition);
        return;
      } catch {
        window.localStorage.removeItem('quizRecallFloatingPosition');
      }
    }
    const defaultPosition = {
      x: Math.max(12, window.innerWidth - 190),
      y: Math.max(12, window.innerHeight - 58)
    };
    latestPosition.current = defaultPosition;
    setPosition(defaultPosition);
  }, []);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'GET_DAILY_PLAN' } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<{ state: ExtensionStorageState }>) => {
        if (response.ok) {
          const existingMarkdown = response.data?.state.notesByProblemId[problemId]?.markdown ?? '';
          setMarkdown(existingMarkdown);
          setPreview(existingMarkdown.trim().length > 0);
        }
      })
      .catch(console.error);
  }, [problemId]);

  const save = async () => {
    const request: RuntimeRequest = {
      type: 'SAVE_NOTE',
      payload: {
        problemId,
        markdown: sanitizeMarkdown(markdown)
      }
    };
    const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse;
    if (!response.ok) {
      alert(response.error ?? 'Failed to save note.');
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!position) {
      return;
    }
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = dragState.current;
    if (!current) {
      return;
    }

    const distance = Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY);
    if (distance > 6) {
      current.moved = true;
    }

    if (!current.moved) {
      return;
    }

    const nextPosition = {
      x: Math.max(8, Math.min(window.innerWidth - 180, event.clientX - current.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - 54, event.clientY - current.offsetY))
    };
    latestPosition.current = nextPosition;
    setPosition(nextPosition);
  };

  const handlePointerUp = () => {
    const current = dragState.current;
    if (current?.moved && latestPosition.current) {
      window.localStorage.setItem('quizRecallFloatingPosition', JSON.stringify(latestPosition.current));
    }
    window.setTimeout(() => {
      dragState.current = undefined;
    }, 0);
  };

  return (
    <>
      <div
        className="fixed z-[2147483646] flex items-center overflow-hidden rounded-xl bg-neutral-900 text-white shadow-2xl ring-1 ring-white/10 dark:bg-neutral-800"
        style={{
          left: position?.x ?? undefined,
          top: position?.y ?? undefined,
          right: position ? undefined : 20,
          bottom: position ? undefined : 20
        }}
      >
        <div
          aria-label={t(locale, 'dragButton')}
          className="flex h-12 w-8 cursor-move touch-none items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="6" cy="2" r="1.5" />
            <circle cx="10" cy="2" r="1.5" />
            <circle cx="2" cy="6" r="1.5" />
            <circle cx="6" cy="6" r="1.5" />
            <circle cx="10" cy="6" r="1.5" />
            <circle cx="2" cy="10" r="1.5" />
            <circle cx="6" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
          </svg>
        </div>
        <button
          className="group relative h-12 px-3 transition-all hover:bg-white/10 active:bg-white/20"
          onClick={onRate}
          aria-label={t(locale, 'rate')}
        >
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-xs font-semibold text-white/90">{t(locale, 'rate')}</span>
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-90 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none">
            {t(locale, 'rate')}
          </div>
        </button>
        <div className="h-4 w-px bg-white/10" />
        <button
          aria-label={t(locale, 'notes')}
          className="flex h-12 w-12 items-center justify-center text-amber-500 transition-all hover:bg-amber-500/10 active:scale-90"
          onClick={() => setOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="flex h-[min(760px,calc(100vh-48px))] w-[min(900px,calc(100vw-48px))] flex-col overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 dark:border-neutral-800 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between border-b border-neutral-100 bg-[#f7f8fa] px-8 py-6 dark:border-neutral-800 dark:bg-[#262626]">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-100">{displayTitle}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{identity.platform}</span>
                  <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{t(locale, 'notes')}</span>
                </div>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
                onClick={() => setOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex overflow-hidden rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
                  <button 
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${!preview ? 'rounded-lg bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                    onClick={() => setPreview(false)}
                  >
                    {t(locale, 'edit')}
                  </button>
                  <button 
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${preview ? 'rounded-lg bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                    onClick={() => setPreview(true)}
                  >
                    {t(locale, 'view')}
                  </button>
                </div>
              </div>

              <div className="h-[calc(100%-60px)] overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all focus-within:border-amber-500/50 dark:border-neutral-800 dark:bg-[#1a1a1a]">
                {preview ? (
                  <div className="h-full overflow-y-auto p-8 prose prose-neutral dark:prose-invert max-w-none text-neutral-900 dark:text-neutral-100">
                    <ReactMarkdown
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code: ({ node, ...props }) => (
                          <code className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-sm dark:bg-neutral-800" {...props} />
                        ),
                      }}
                    >
                      {sanitizeMarkdown(markdown)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="h-full w-full resize-none border-none bg-transparent p-8 font-mono text-sm leading-relaxed transition-all focus:outline-none dark:text-neutral-200"
                    placeholder={t(locale, 'floatingNotePlaceholder')}
                    value={markdown}
                    onChange={(event) => setMarkdown(event.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="border-t border-neutral-100 px-8 py-6 dark:border-neutral-800">
              <button 
                className="flex w-full items-center justify-center gap-3 rounded-[1.25rem] bg-amber-500 py-4 text-sm font-bold text-white transition-all hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/20 active:scale-[0.98] dark:text-neutral-900" 
                onClick={save}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {t(locale, 'save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
