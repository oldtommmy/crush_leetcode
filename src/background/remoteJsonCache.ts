export interface RemoteJsonCacheRecord<T> {
  value: T;
  etag?: string;
  fetchedAt: string;
  failureCount: number;
  retryAt?: string;
}

export interface RemoteJsonResult<T> {
  value: T;
  stale: boolean;
  failureCount: number;
}

export interface RemoteJsonCacheOptions<T> {
  cacheKey: string;
  url: string;
  ttlMs: number;
  timeoutMs?: number;
  force?: boolean;
  normalize: (input: unknown) => T | undefined;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

const inFlightRequests = new Map<string, Promise<RemoteJsonResult<unknown>>>();
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 30 * 60 * 1000;

function isRecord<T>(input: unknown): input is RemoteJsonCacheRecord<T> {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<RemoteJsonCacheRecord<T>>;
  return typeof candidate.fetchedAt === 'string' && typeof candidate.failureCount === 'number' && 'value' in candidate;
}

function parsedTime(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function backoffMs(failureCount: number): number {
  return Math.min(MAX_BACKOFF_MS, 30_000 * (2 ** Math.max(0, failureCount - 1)));
}

async function readCache<T>(cacheKey: string): Promise<RemoteJsonCacheRecord<T> | undefined> {
  const stored = await chrome.storage.local.get(cacheKey);
  return isRecord<T>(stored[cacheKey]) ? stored[cacheKey] : undefined;
}

async function writeCache<T>(cacheKey: string, record: RemoteJsonCacheRecord<T>): Promise<void> {
  await chrome.storage.local.set({ [cacheKey]: record });
}

async function fetchAndCache<T>(options: RemoteJsonCacheOptions<T>): Promise<RemoteJsonResult<T>> {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  const cached = await readCache<T>(options.cacheKey);
  const currentTime = now();
  const fetchedAt = parsedTime(cached?.fetchedAt);
  const retryAt = parsedTime(cached?.retryAt);

  if (!options.force && cached && fetchedAt !== undefined && currentTime - fetchedAt < options.ttlMs) {
    return { value: cached.value, stale: false, failureCount: cached.failureCount };
  }
  if (!options.force && cached && retryAt !== undefined && currentTime < retryAt) {
    return { value: cached.value, stale: true, failureCount: cached.failureCount };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    const response = await fetchImpl(options.url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    if (response.status === 304 && cached) {
      await writeCache(options.cacheKey, {
        ...cached,
        fetchedAt: new Date(currentTime).toISOString(),
        failureCount: 0,
        retryAt: undefined
      });
      return { value: cached.value, stale: false, failureCount: 0 };
    }
    if (!response.ok) {
      throw new Error(`Remote JSON request failed: ${response.status}`);
    }

    const normalized = options.normalize(await response.json());
    if (normalized === undefined) {
      throw new Error('Remote JSON response was invalid.');
    }
    await writeCache(options.cacheKey, {
      value: normalized,
      etag: response.headers.get('etag') ?? undefined,
      fetchedAt: new Date(currentTime).toISOString(),
      failureCount: 0,
      retryAt: undefined
    });
    return { value: normalized, stale: false, failureCount: 0 };
  } catch (error) {
    if (cached) {
      const failureCount = Math.min(10, cached.failureCount + 1);
      await writeCache(options.cacheKey, {
        ...cached,
        failureCount,
        retryAt: new Date(currentTime + backoffMs(failureCount)).toISOString()
      });
      return { value: cached.value, stale: true, failureCount };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getCachedJsonResult<T>(options: RemoteJsonCacheOptions<T>): Promise<RemoteJsonResult<T>> {
  const existing = inFlightRequests.get(options.cacheKey) as Promise<RemoteJsonResult<T>> | undefined;
  if (existing) return existing;
  const request = fetchAndCache(options).finally(() => {
    if (inFlightRequests.get(options.cacheKey) === request) {
      inFlightRequests.delete(options.cacheKey);
    }
  });
  inFlightRequests.set(options.cacheKey, request as Promise<RemoteJsonResult<unknown>>);
  return request;
}

export async function getCachedJson<T>(options: RemoteJsonCacheOptions<T>): Promise<T> {
  return (await getCachedJsonResult(options)).value;
}

export function clearRemoteJsonInFlightForTests(): void {
  inFlightRequests.clear();
}
