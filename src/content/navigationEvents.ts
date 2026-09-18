/**
 * SPA navigation events without polling (C1).
 *
 * LeetCode is a single-page app: it swaps problems via `history.pushState` /
 * `replaceState`, which do NOT fire `popstate`. The content script used to work
 * around this by polling `detectCurrentProblem()` every 1.5s, scanning the whole
 * document each time. Instead we patch the history methods once to emit a
 * synthetic `locationchange` event and also listen for real `popstate`, so
 * identity refreshes are event-driven.
 */

const LOCATION_CHANGE_EVENT = 'crush-leetcode:locationchange';
const PATCHED_FLAG = '__crushLeetcodeHistoryPatched__';

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
      const result = original.apply(this, args);
      emit();
      return result;
    } as History[typeof method];
  }
}

/**
 * Subscribe to SPA + browser navigation. `onChange` fires only when the URL's
 * pathname actually changes, so repeated same-page state pushes don't churn.
 * Returns an unsubscribe function.
 */
export function onLocationChange(onChange: () => void): () => void {
  patchHistoryOnce();

  let lastPathname = window.location.pathname;
  const handler = () => {
    const nextPathname = window.location.pathname;
    if (nextPathname === lastPathname) {
      return;
    }
    lastPathname = nextPathname;
    onChange();
  };

  window.addEventListener('popstate', handler);
  window.addEventListener(LOCATION_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener(LOCATION_CHANGE_EVENT, handler);
  };
}
