import { describe, expect, it } from 'vitest';
import { buildBackupExport, sanitizeSettingsForExport } from '../src/shared/storage/backup';
import { createState } from './helpers/stateFactory';

describe('backup export sanitization (A4)', () => {
  const state = createState({
    settings: {
      ...createState().settings,
      cloudSync: {
        enabled: true,
        syncKey: 'super-secret-recovery-code',
        lastSyncedAt: '2026-09-18T00:00:00.000Z',
        lastError: undefined
      },
      emailWebhook: {
        enabled: true,
        toEmail: 'tom@example.com',
        betaAccessCode: 'BETA-1234',
        lastError: undefined,
        lastSentAt: '2026-09-17T00:00:00.000Z'
      }
    }
  });

  it('strips the cloud sync key from exported settings', () => {
    const sanitized = sanitizeSettingsForExport(state.settings);
    expect(sanitized.cloudSync.syncKey).toBeUndefined();
    expect(sanitized.cloudSync.enabled).toBe(false);
  });

  it('strips the beta access code and recipient email', () => {
    const sanitized = sanitizeSettingsForExport(state.settings);
    expect(sanitized.emailWebhook.betaAccessCode).toBeUndefined();
    expect(sanitized.emailWebhook.toEmail).toBeUndefined();
    // The enabled toggle is preserved as a non-sensitive preference.
    expect(sanitized.emailWebhook.enabled).toBe(true);
  });

  it('does not leak secrets anywhere in the serialized backup payload', () => {
    const serialized = JSON.stringify(buildBackupExport(state));
    expect(serialized).not.toContain('super-secret-recovery-code');
    expect(serialized).not.toContain('BETA-1234');
    expect(serialized).not.toContain('tom@example.com');
  });

  it('still includes problems, notes and review logs', () => {
    const payload = buildBackupExport(state) as Record<string, unknown>;
    expect(payload).toHaveProperty('problemsById');
    expect(payload).toHaveProperty('notesByProblemId');
    expect(payload).toHaveProperty('reviewLogsById');
    expect(payload).toHaveProperty('version');
    expect(payload._backupNote).toContain('does NOT contain');
  });
});
