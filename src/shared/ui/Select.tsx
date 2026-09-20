import { useEffect, useId, useRef, useState } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  /** Optional trailing hint rendered to the right of the label (e.g. "new"). */
  hint?: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  /** Shown when no option matches `value`. */
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Extra classes for the trigger button (width, etc.). */
  className?: string;
  /** Max height of the popover list before it scrolls. */
  maxHeightClass?: string;
}

/**
 * Product-styled dropdown that replaces native <select> so the four surfaces
 * share one look-and-feel and a smooth spring open animation (UI plan §3).
 * Consumes the design tokens (surface / border / brand-ring / radii / motion).
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  ariaLabel,
  disabled = false,
  className = '',
  maxHeightClass = 'max-h-60'
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3.5 py-2.5 text-left text-sm font-semibold text-text shadow-sm transition-all duration-200 ease-standard hover:border-brand hover:bg-surface-2 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span>
        <svg
          className={`shrink-0 text-text-3 transition-transform duration-200 ease-spring ${open ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className={`clc-dropdown-in absolute left-0 right-0 z-30 mt-2 overflow-y-auto rounded-m border border-border bg-elevated p-1 shadow-lg ${maxHeightClass}`}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ease-standard ${
                  active ? 'bg-brand-soft text-brand-strong' : 'text-text-2 hover:bg-surface-2 hover:text-text'
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.hint ? (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-success">{option.hint}</span>
                ) : active ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
