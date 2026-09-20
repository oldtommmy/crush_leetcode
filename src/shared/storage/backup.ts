import type { ExtensionStorageState, UserSettings } from '../types';

/**
 * Settings fields that are safe to include in an exported backup.
 *
 * Deliberately excludes credentials that would let anyone holding the backup
 * take over the user's data:
 *  - `cloudSync.syncKey`  — the sole credential for the cloud snapshot (read + overwrite)
 *  - `emailWebhook.betaAccessCode` — official mailer access code
 *  - `emailWebhook.toEmail` — the user's email address (PII)
 *
 * A4: "backup" is a filename users share freely (chat groups, cloud drives), so
 * it must never carry these secrets.
 */
export function sanitizeSettingsForExport(settings: UserSettings): UserSettings {
  const { cloudSync, emailWebhook, ...rest } = settings;

  return {
    ...rest,
    cloudSync: {
      // Keep the non-sensitive shape but drop the credential and volatile status.
      enabled: false,
      syncKey: undefined,
      lastSyncedAt: undefined,
      lastError: undefined
    },
    emailWebhook: {
      // Keep the toggle but drop the access code, recipient email and status.
      enabled: emailWebhook.enabled,
      toEmail: undefined,
      betaAccessCode: undefined,
      lastError: undefined,
      lastSentAt: undefined
    }
  };
}

/**
 * Build the JSON-serializable payload written to a backup file.
 *
 * Only problems, notes, review logs and non-sensitive settings are exported.
 * Credentials are stripped via {@link sanitizeSettingsForExport}.
 */
export function buildBackupExport(state: ExtensionStorageState): Record<string, unknown> {
  const { reminderDelivery, ...metadataRest } = state.metadata;
  void reminderDelivery;

  return {
    version: state.version,
    problemsById: state.problemsById,
    reviewLogsById: state.reviewLogsById,
    notesByProblemId: state.notesByProblemId,
    settings: sanitizeSettingsForExport(state.settings),
    metadata: metadataRest,
    // Machine-readable marker + human note so restore code stays out of backups.
    _backupNote: 'This backup does NOT contain your cloud sync key or beta access code. Keep those separately.'
  };
}
