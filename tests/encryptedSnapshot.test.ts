import { beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  decryptSnapshot,
  deriveLookupId,
  encryptSnapshot,
  PBKDF2_ITERATIONS
} from '../src/shared/sync/encryptedSnapshot';
import { createProblem, createState } from './helpers/stateFactory';

const code = 'correct-horse-battery-staple';

beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('btoa', (value: string) => Buffer.from(value, 'binary').toString('base64'));
  vi.stubGlobal('atob', (value: string) => Buffer.from(value, 'base64').toString('binary'));
});

function sensitiveState() {
  const problem = createProblem({ id: 'leetcode:two-sum', titleSlug: 'two-sum', title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/' });
  return createState({
    problemsById: { [problem.id]: problem },
    notesByProblemId: {
      [problem.id]: { problemId: problem.id, markdown: 'private note', createdAt: problem.createdAt, updatedAt: problem.updatedAt }
    },
    settings: {
      ...createState().settings,
      cloudSync: { enabled: true, recoveryCode: code, status: 'synced', migrationStatus: 'migrated', legacyCleanupPending: false },
      emailWebhook: { enabled: true, toEmail: 'person@example.com', betaAccessCode: 'SECRET-BETA', lastError: 'delivery failed' }
    }
  });
}

describe('encrypted snapshots', () => {
  it('round trips user records with strong PBKDF2 and strips device secrets', async () => {
    const encrypted = await encryptSnapshot(sensitiveState(), code, { compression: 'none' });
    expect(encrypted.envelope.kdf.iterations).toBeGreaterThanOrEqual(PBKDF2_ITERATIONS);
    expect(atob(encrypted.envelope.cipher.iv)).toHaveLength(12);
    const serialized = JSON.stringify(encrypted.envelope);
    expect(serialized).not.toContain(code);
    expect(serialized).not.toContain('person@example.com');
    expect(serialized).not.toContain('SECRET-BETA');

    const restored = await decryptSnapshot(encrypted.envelope, code, encrypted.lookupId);
    expect(restored.notesByProblemId['leetcode:two-sum']?.markdown).toBe('private note');
    expect(restored.settings.cloudSync.recoveryCode).toBeUndefined();
    expect(restored.settings.emailWebhook.toEmail).toBeUndefined();
  });

  it('rejects a wrong code and tampering', async () => {
    const encrypted = await encryptSnapshot(sensitiveState(), code, { compression: 'none' });
    await expect(decryptSnapshot(encrypted.envelope, 'wrong-secret-code')).rejects.toThrow('Unable to decrypt');
    const tampered = { ...encrypted.envelope, ciphertext: `${encrypted.envelope.ciphertext.slice(0, -2)}AA` };
    await expect(decryptSnapshot(tampered, code, encrypted.lookupId)).rejects.toThrow('Unable to decrypt');
  });

  it('uses random salt and IV but a deterministic domain-separated lookup id', async () => {
    const [first, second] = await Promise.all([
      encryptSnapshot(sensitiveState(), code, { compression: 'none' }),
      encryptSnapshot(sensitiveState(), code, { compression: 'none' })
    ]);
    expect(first.lookupId).toBe(second.lookupId);
    expect(first.envelope.cipher.iv).not.toBe(second.envelope.cipher.iv);
    expect(first.envelope.kdf.salt).not.toBe(second.envelope.kdf.salt);
    expect(await deriveLookupId(code)).not.toBe(await deriveLookupId(`other-domain-${code}`));
  });

  it('falls back to uncompressed payloads when CompressionStream is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const encrypted = await encryptSnapshot(sensitiveState(), code);
    expect(encrypted.envelope.compression).toBe('none');
    await expect(decryptSnapshot(encrypted.envelope, code)).resolves.toMatchObject({ version: expect.any(Number) });
    vi.unstubAllGlobals();
  });
});
