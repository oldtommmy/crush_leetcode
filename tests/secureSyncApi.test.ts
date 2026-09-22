import { describe, expect, it, vi } from 'vitest';
import { pullSecureSnapshot, pushSecureSnapshot, SecureSyncError } from '../src/shared/sync/secureSyncApi';
import type { EncryptedSnapshotEnvelope } from '../src/shared/sync/encryptedSnapshot';

const lookupId = 'a'.repeat(64);
const envelope: EncryptedSnapshotEnvelope = {
  schemaVersion: 1,
  stateVersion: 2,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, salt: 'c2FsdA==' },
  cipher: { name: 'AES-GCM', iv: 'aXYxMjM0NTY3ODkw' },
  compression: 'none',
  ciphertext: 'Y2lwaGVydGV4dA=='
};

describe('secure sync API', () => {
  it('times out with a stable error', async () => {
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(pullSecureSnapshot(lookupId, {
      origin: 'https://sync.example.test', timeoutMs: 5, fetch: fetchMock as typeof fetch
    })).rejects.toMatchObject({ code: 'timeout', message: 'Secure sync request timed out.' });
  });

  it('surfaces CAS conflicts without leaking server response text', async () => {
    let requestInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestInit = init;
      return new Response(JSON.stringify({ currentRevision: 2, detail: 'secret' }), {
        status: 409,
        headers: { 'content-type': 'application/json' }
      });
    });
    let error: unknown;
    try {
      await pushSecureSnapshot(lookupId, envelope, 1, {
        origin: 'https://sync.example.test', fetch: fetchMock as typeof fetch
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SecureSyncError);
    expect(error).toMatchObject({ code: 'conflict', remoteRevision: 2 });
    expect((error as Error).message).not.toContain('secret');
    expect(requestInit).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(requestInit?.body))).toEqual({ lookupId, envelope, expectedRevision: 1 });
  });

  it('preserves a missing remote snapshot in conflict metadata', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ currentRevision: null }), {
      status: 409,
      headers: { 'content-type': 'application/json' }
    }));
    await expect(pushSecureSnapshot(lookupId, envelope, 1, {
      origin: 'https://sync.example.test', fetch: fetchMock as typeof fetch
    })).rejects.toMatchObject({ code: 'conflict', remoteRevision: null });
  });

  it('validates successful pull responses', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ envelope }), { status: 200 }));
    await expect(pullSecureSnapshot(lookupId, {
      origin: 'https://sync.example.test', fetch: fetchMock as typeof fetch
    })).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
