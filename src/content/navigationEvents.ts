/**
 * SPA navigation events without polling. The page-world bridge emits this event
 * after validated pushState/replaceState messages cross the isolated-world
 * boundary. The local patch remains as a best-effort fallback for test and page
 * environments where both worlds share the History object.
 */
export const LOCATION_CHANGE_EVENT = 'crush-leetcode:locationchange';
const PATCHED_FLAG = '__crushLeetcodeHistoryPatched__';
const DEFAULT_RETRY_DELAYS_MS = [250, 750, 1500] as const;

export interface LocationChangeOptions {
  retryDelaysMs?: readonly number[];
}

function patchHistoryOnce(): void {
  const target = history as History & Record<string, unknown>;
  if (target[PATCHED_FLAG]) {
    return;
  }
  target[PATCHED_FLAG] = true;

  const emit = () => window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));

  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method];
    history[method] = function patched(this: History, ...args: Parameters<History[typeof method]>) {
      const previousPathname = window.location.pathname;
      const result = original.apply(this, args);
      if (window.location.pathname !== previousPathname) {
        emit();
      }
      return result;
    } as History[typeof method];
  }
}

/**
 * Subscribe to SPA + browser navigation. A real pathname change fires
 * immediately, followed by a small bounded set of hydration retries. Repeated
 * same-page state pushes do not fire. Returns an unsubscribe function.
 */
export function onLocationChange(onChange: () => void, options: LocationChangeOptions = {}): () => void {
  patchHistoryOnce();

  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let lastPathname = window.location.pathname;
  let retryTimers: Array<ReturnType<typeof setTimeout>> = [];

  const clearRetries = () => {
    retryTimers.forEach((timer) => clearTimeout(timer));
    retryTimers = [];
  };

  const handler = () => {
    const nextPathname = window.location.pathname;
    if (nextPathname === lastPathname) {
      return;
    }
    lastPathname = nextPathname;
    clearRetries();
    onChange();

    retryTimers = retryDelaysMs.map((delay) =>
      setTimeout(() => {
        if (window.location.pathname === nextPathname) {
          onChange();
        }
      }, delay)
    );
  };

  window.addEventListener('popstate', handler);
  window.addEventListener(LOCATION_CHANGE_EVENT, handler);

  return () => {
    clearRetries();
    window.removeEventListener('popstate', handler);
    window.removeEventListener(LOCATION_CHANGE_EVENT, handler);
  };
}
