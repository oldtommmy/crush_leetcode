import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRemoteJsonInFlightForTests, getCachedJson, getCachedJsonResult } from '../src/background/remoteJsonCache';

const records: Record<string, unknown> = {};

function response(status: number, body?: unknown, etag?: string): Response {
  return new Response(body === undefined ? undefined : JSON.stringify(body), {
    status,
    headers: etag ? { 'Content-Type': 'application/json', ETag: etag } : { 'Content-Type': 'application/json' }
  });
}

describe('remote JSON cache', () => {
  beforeEach(() => {
    Object.keys(records).forEach((key) => delete records[key]);
    clearRemoteJsonInFlightForTests();
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: records[key] })),
          set: vi.fn(async (value: Record<string, unknown>) => Object.assign(records, value))
        }
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('deduplicates in-flight requests and reuses a fresh value', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    const options = {
      cacheKey: 'remote:test',
      url: 'https://example.test/config.json',
      ttlMs: 60_000,
      now: () => 1_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      normalize: (input: unknown) => typeof (input as { value?: unknown })?.value === 'number'
        ? input as { value: number }
        : undefined
    };

    const first = getCachedJson(options);
    const second = getCachedJson(options);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    resolveFetch?.(response(200, { value: 7 }, '"v1"'));

    await expect(Promise.all([first, second])).resolves.toEqual([{ value: 7 }, { value: 7 }]);
    await expect(getCachedJson({ ...options, now: () => 2_000 })).resolves.toEqual({ value: 7 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sends If-None-Match and refreshes cached freshness on 304', async () => {
    records['remote:test'] = {
      value: { value: 3 },
      etag: '"v1"',
      fetchedAt: new Date(0).toISOString(),
      failureCount: 0
    };
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ 'If-None-Match': '"v1"' });
      return response(304);
    });

    await expect(getCachedJson({
      cacheKey: 'remote:test',
      url: 'https://example.test/config.json',
      ttlMs: 100,
      now: () => 5_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      normalize: () => undefined
    })).resolves.toEqual({ value: 3 });
    expect(records['remote:test']).toMatchObject({ fetchedAt: new Date(5_000).toISOString(), failureCount: 0 });
  });

  it('returns stale data and backs off after a failure', async () => {
    records['remote:test'] = {
      value: { value: 11 },
      fetchedAt: new Date(0).toISOString(),
      failureCount: 0
    };
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const options = {
      cacheKey: 'remote:test',
      url: 'https://example.test/config.json',
      ttlMs: 100,
      now: () => 10_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      normalize: () => undefined
    };

    await expect(getCachedJsonResult(options)).resolves.toEqual({
      value: { value: 11 },
      stale: true,
      failureCount: 1
    });
    await expect(getCachedJson({ ...options, now: () => 11_000 })).resolves.toEqual({ value: 11 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(records['remote:test']).toMatchObject({ failureCount: 1 });
  });

  it('throws when no cached fallback exists', async () => {
    const fetchImpl = vi.fn(async () => response(503, { error: 'unavailable' }));
    await expect(getCachedJson({
      cacheKey: 'remote:test',
      url: 'https://example.test/config.json',
      ttlMs: 100,
      now: () => 10_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      normalize: () => undefined
    })).rejects.toThrow('Remote JSON request failed: 503');
  });
});
