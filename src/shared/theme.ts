import type { ThemeMode } from './types';

/**
 * Theme wiring (UI plan §5). `themeMode` used to be stored but never consumed;
 * this makes it actually drive the `.dark` class.
 *
 * - `light` / `dark`: toggle the class directly.
 * - `system`: follow `prefers-color-scheme` and keep following it live.
 *
 * Works for both the standalone pages (root = document.documentElement) and the
 * content script's Shadow DOM root (root = #crush-leetcode-root), because the
 * outer `html.dark` selector cannot cross the shadow boundary (§4.4).
 */

const DARK_QUERY = '(prefers-color-scheme: dark)';

// Track the active system listener per root so re-applying cleans up the old one.
const systemListeners = new WeakMap<HTMLElement, (event: MediaQueryListEvent) => void>();

function setDark(root: HTMLElement, isDark: boolean): void {
  root.classList.toggle('dark', isDark);
}

function clearSystemListener(root: HTMLElement): void {
  const existing = systemListeners.get(root);
  if (existing) {
    try {
      window.matchMedia(DARK_QUERY).removeEventListener('change', existing);
    } catch {
      // Older engines: listener was attached via addListener; ignore.
    }
    systemListeners.delete(root);
  }
}

export function applyTheme(root: HTMLElement, mode: ThemeMode): void {
  clearSystemListener(root);

  if (mode === 'system') {
    const mql = window.matchMedia(DARK_QUERY);
    setDark(root, mql.matches);
    const listener = (event: MediaQueryListEvent) => setDark(root, event.matches);
    mql.addEventListener('change', listener);
    systemListeners.set(root, listener);
    return;
  }

  setDark(root, mode === 'dark');
}
