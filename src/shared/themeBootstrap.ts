import { STORAGE_KEY } from './constants';
import { applyTheme } from './theme';
import type { ThemeMode } from './types';

/**
 * Read the persisted theme mode and keep the given root in sync (UI plan §5).
 *
 * Reads `themeMode` from the single storage key, applies it immediately, and
 * re-applies whenever settings change in any context (chrome.storage.onChanged),
 * so switching the theme in the options page reflects live in the popup, library
 * and injected UI.
 */
export function bootstrapTheme(root: HTMLElement): void {
  const read = (raw: unknown): ThemeMode => {
    const mode = (raw as { settings?: { themeMode?: ThemeMode } } | undefined)?.settings?.themeMode;
    return mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system';
  };

  chrome.storage.local
    .get(STORAGE_KEY)
    .then((result) => applyTheme(root, read(result[STORAGE_KEY])))
    .catch(() => applyTheme(root, 'system'));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) {
      return;
    }
    applyTheme(root, read(changes[STORAGE_KEY].newValue));
  });
}
