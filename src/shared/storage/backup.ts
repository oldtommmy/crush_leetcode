import type { ExtensionStorageState, UserSettings } from '../types';
import { buildSanitizedSnapshot, sanitizeSettingsForSnapshot } from '../sync/snapshotPolicy';

/** Shared export/sync policy. Device secrets and volatile status never leave local storage. */
export function sanitizeSettingsForExport(settings: UserSettings): UserSettings {
  return sanitizeSettingsForSnapshot(settings);
}

export function buildBackupExport(state: ExtensionStorageState): Record<string, unknown> {
  return {
    ...buildSanitizedSnapshot(state),
    _backupNote: 'This backup does NOT contain your cloud recovery code, email address, or beta access code. Keep those separately.'
  };
}
