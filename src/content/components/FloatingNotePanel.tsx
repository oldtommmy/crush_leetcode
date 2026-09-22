import { useEffect, useRef, useState } from 'react';
import { sanitizeMarkdown } from '../../shared/markdown/sanitize';
import { problemIdFor } from '../../shared/review/scheduler';
import type { Locale, PetSize, ProblemIdentity, ProblemNote, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { DEFAULT_PET_SIZE, PET_SIZE_PIXELS, STORAGE_KEY } from '../../shared/constants';
import { t } from '../../shared/i18n/messages';
import { displayProblemTitle } from '../../shared/leetcode/display';

interface FloatingNotePanelProps {
  identity: ProblemIdentity;
  locale: Locale;
  onRate: () => void;
}

const PET_MARGIN = 8;
const DRAG_THRESHOLD_PX = 6;

function clampPosition(size: number, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(PET_MARGIN, Math.min(window.innerWidth - size - PET_MARGIN, x)),
    y: Math.max(PET_MARGIN, Math.min(window.innerHeight - size - PET_MARGIN, y))
  };
}

function readPetSize(raw: unknown): PetSize {
  const value = (raw as { settings?: { petSize?: unknown } } | undefined)?.settings?.petSize;
  return value === 'small' || value === 'medium' || value === 'large' ? value : DEFAULT_PET_SIZE;
}

export function FloatingNotePanel({ identity, locale, onRate }: FloatingNotePanelProps) {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState(false);
  const [petSize, setPetSize] = useState<PetSize>(DEFAULT_PET_SIZE);
  const [position, setPosition] = useState<{ x: number; y: number } | undefined>();
  const latestPosition = useRef<{ x: number; y: number } | undefined>();
  const dragState = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  }>();
  /**
   * Set while a drag gesture actually moved the pet, so the click/contextmenu
   * that follows pointerup is swallowed instead of firing a rating/notes action.
   * It is consumed (reset) by the next click/contextmenu handler.
   */
  const didDrag = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const problemId = problemIdFor(identity);
  const displayTitle = displayProblemTitle(identity, locale);
  /** Resolved per render so the module stays importable outside an extension context. */
  const logoUrl = chrome.runtime.getURL('icons/icon.png');
  const petPixels = PET_SIZE_PIXELS[petSize];
  const logoStyle = { width: petPixels, height: petPixels };

  useEffect(() => {
    const restorePosition = (size: number) => {
      const saved = window.localStorage.getItem('quizRecallFloatingPosition');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { x: number; y: number };
          const nextPosition = clampPosition(size, parsed.x, parsed.y);
          latestPosition.current = nextPosition;
          setPosition(nextPosition);
          return;
        } catch {
          window.localStorage.removeItem('quizRecallFloatingPosition');
        }
      }
      const defaultPosition = clampPosition(
        size,
        window.innerWidth - size - 20,
        window.innerHeight - size - 20
      );
      latestPosition.current = defaultPosition;
      setPosition(defaultPosition);
    };

    const applyPetSize = (nextPetSize: PetSize) => {
      const nextPixels = PET_SIZE_PIXELS[nextPetSize];
      setPetSize(nextPetSize);
      if (latestPosition.current) {
        const nextPosition = clampPosition(nextPixels, latestPosition.current.x, latestPosition.current.y);
        latestPosition.current = nextPosition;
        setPosition(nextPosition);
      }
    };

    chrome.storage.local
      .get(STORAGE_KEY)
      .then((result) => {
        const nextPetSize = readPetSize(result[STORAGE_KEY]);
        applyPetSize(nextPetSize);
        restorePosition(PET_SIZE_PIXELS[nextPetSize]);
      })
      .catch(() => restorePosition(PET_SIZE_PIXELS[DEFAULT_PET_SIZE]));

    const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        applyPetSize(readPetSize(changes[STORAGE_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  useEffect(() => {
    chrome.runtime
      .sendMessage({
        type: 'GET_PROBLEM_NOTE',
        payload: { problemId }
      } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<ProblemNote | undefined>) => {
        if (response.ok) {
          const existingMarkdown = response.data?.markdown ?? '';
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

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!position) {
      return;
    }
    didDrag.current = false;
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = dragState.current;
    if (!current) {
      return;
    }

    const distance =
      Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY);
    if (!current.moved && distance <= DRAG_THRESHOLD_PX) {
      return;
    }
    current.moved = true;
    setIsDragging(true);

    const nextPosition = clampPosition(
      petPixels,
      event.clientX - current.offsetX,
      event.clientY - current.offsetY
    );
    latestPosition.current = nextPosition;
    setPosition(nextPosition);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = dragState.current;
    dragState.current = undefined;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current?.moved) {
      didDrag.current = true;
      if (latestPosition.current) {
        window.localStorage.setItem('quizRecallFloatingPosition', JSON.stringify(latestPosition.current));
      }
    }
  };

  /** True for the click/contextmenu immediately following a real drag gesture. */
  const justDragged = () => {
    if (didDrag.current) {
      didDrag.current = false;
      return true;
    }
    return false;
  };

  return (
    <>
      <div
        className="group fixed z-[2147483646] touch-none select-none"
        style={{
          left: position?.x ?? undefined,
          top: position?.y ?? undefined,
          right: position ? undefined : 20,
          bottom: position ? undefined : 20
        }}
      >
        <button
          type="button"
          aria-label={t(locale, 'petHint')}
          className={`clc-floating-logo-button block cursor-grab ${isDragging ? 'clc-floating-logo-button--dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={(event) => {
            event.preventDefault();
            if (justDragged()) {
              return;
            }
            onRate();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!justDragged()) {
              setOpen(true);
            }
          }}
        >
          <span className="clc-floating-logo" style={logoStyle} aria-hidden="true">
            <img src={logoUrl} alt="" />
          </span>
        </button>
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 scale-90 whitespace-nowrap rounded-xs bg-elevated px-2 py-1 text-[10px] font-medium text-text opacity-0 shadow-sm ring-1 ring-border transition-all group-hover:scale-100 group-hover:opacity-100">
          {t(locale, 'petHint')}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-6 clc-fade-in">
          <div className="flex h-[min(760px,calc(100vh-48px))] w-[min(900px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-border-soft bg-elevated shadow-lg clc-modal-in">
            <div className="flex items-center justify-between border-b border-border-soft bg-surface-2 px-8 py-6">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-text">{displayTitle}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-text-2">{identity.platform}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-strong">{t(locale, 'notes')}</span>
                </div>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
                onClick={() => setOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex overflow-hidden rounded-sm bg-surface-2 p-1">
                  <button
                    className={`px-6 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${!preview ? 'rounded-xs bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
                    onClick={() => setPreview(false)}
                  >
                    {t(locale, 'edit')}
                  </button>
                  <button
                    className={`px-6 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${preview ? 'rounded-xs bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
                    onClick={() => setPreview(true)}
                  >
                    {t(locale, 'view')}
                  </button>
                </div>
              </div>

              <div className="h-[calc(100%-60px)] overflow-hidden rounded-m border border-border bg-surface transition-all focus-within:border-brand">
                {preview ? (
                  <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-8 font-mono text-sm leading-relaxed text-text">
                    {sanitizeMarkdown(markdown)}
                  </pre>
                ) : (
                  <textarea
                    className="h-full w-full resize-none border-none bg-transparent p-8 font-mono text-sm leading-relaxed text-text transition-all focus:outline-none"
                    placeholder={t(locale, 'floatingNotePlaceholder')}
                    value={markdown}
                    onChange={(event) => setMarkdown(event.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="border-t border-border-soft px-8 py-6">
              <button
                className="flex w-full items-center justify-center gap-3 rounded-sm bg-brand py-4 text-sm font-semibold text-white shadow-brand transition-transform duration-200 ease-spring hover:-translate-y-0.5 active:scale-[0.98]"
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
