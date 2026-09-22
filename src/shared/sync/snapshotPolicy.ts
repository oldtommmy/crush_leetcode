import type { ExtensionStorageState, UserSettings } from '../types';

/**
 * The single policy used by shareable backups and remote encrypted snapshots.
 * User records (including notes and logs) are retained; device credentials,
 * recipient PII and volatile delivery/sync diagnostics are not.
 */
export function sanitizeSettingsForSnapshot(settings: UserSettings): UserSettings {
  const { cloudSync, emailWebhook, ...rest } = settings;
  return {
    ...rest,
    cloudSync: {
      enabled: false,
      recoveryCode: undefined,
      syncKey: undefined,
      revision: undefined,
      status: 'idle',
      conflict: undefined,
      migrationStatus: 'not_started',
      legacyCleanupPending: false,
      lastSyncedAt: undefined,
      lastError: undefined
    },
    emailWebhook: {
      enabled: emailWebhook.enabled,
      toEmail: undefined,
      betaAccessCode: undefined,
      lastSentAt: undefined,
      lastError: undefined
    }
  };
}

export function buildSanitizedSnapshot(state: ExtensionStorageState): ExtensionStorageState {
  const { reminderDelivery: _delivery, revision: _revision, ...metadata } = state.metadata;
  return {
    ...state,
    settings: sanitizeSettingsForSnapshot(state.settings),
    metadata
  };
}
