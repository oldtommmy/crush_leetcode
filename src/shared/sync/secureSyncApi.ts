import type { EncryptedSnapshotEnvelope } from './encryptedSnapshot';

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_SERVICE_ORIGIN = 'https://mail.crushlc.site';

export type SecureSyncErrorCode =
  | 'timeout'
  | 'network'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'invalid_response'
  | 'server_error';

export class SecureSyncError extends Error {
  constructor(
    public readonly code: SecureSyncErrorCode,
    message: string,
    public readonly status?: number,
    public readonly remoteRevision?: number | null
  ) {
    super(message);
    this.name = 'SecureSyncError';
  }
}

export interface SecureSyncClientOptions {
  origin?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface SecurePullResult {
  envelope: EncryptedSnapshotEnvelope;
  revision: number;
  updatedAt?: string;
}

export interface SecurePushResult {
  revision: number;
  updatedAt?: string;
}

function serviceOrigin(override?: string): string {
  const configured = override ?? import.meta.env.VITE_CRUSH_SYNC_SERVICE_URL ?? DEFAULT_SERVICE_ORIGIN;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error();
    }
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    throw new SecureSyncError('network', 'Secure sync service origin is invalid.');
  }
}

function endpoint(path: 'pull' | 'push' | 'legacy-cleanup', options: SecureSyncClientOptions): string {
  return `${serviceOrigin(options.origin)}/api/sync/${path}`;
}

function isLookupId(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SecureSyncError('invalid_response', 'Secure sync returned an invalid response.', response.status);
  }
  if (!isRecord(body)) {
    throw new SecureSyncError('invalid_response', 'Secure sync returned an invalid response.', response.status);
  }
  return body;
}

async function request(
  path: 'pull' | 'push' | 'legacy-cleanup',
  body: Record<string, unknown>,
  options: SecureSyncClientOptions
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await (options.fetch ?? fetch)(endpoint(path, options), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new SecureSyncError('timeout', 'Secure sync request timed out.');
    }
    throw new SecureSyncError('network', 'Secure sync is temporarily unreachable.');
  } finally {
    clearTimeout(timer);
  }
}

async function throwForStatus(response: Response): Promise<never> {
  if (response.status === 404) throw new SecureSyncError('not_found', 'No secure snapshot was found.', 404);
  if (response.status === 409) {
    let remoteRevision: number | null | undefined;
    try {
      const body = await response.clone().json() as unknown;
      if (isRecord(body) && body.currentRevision === null) {
        remoteRevision = null;
      } else if (isRecord(body) && typeof body.currentRevision === 'number' && Number.isSafeInteger(body.currentRevision)) {
        remoteRevision = body.currentRevision;
      }
    } catch {
      // The status alone is sufficient; never expose raw server response bodies.
    }
    throw new SecureSyncError('conflict', 'The cloud snapshot changed on another device.', 409, remoteRevision);
  }
  if (response.status === 401 || response.status === 403) {
    throw new SecureSyncError('unauthorized', 'Secure sync request was rejected.', response.status);
  }
  throw new SecureSyncError('server_error', 'Secure sync service could not complete the request.', response.status);
}

export async function pullSecureSnapshot(
  lookupId: string,
  options: SecureSyncClientOptions = {}
): Promise<SecurePullResult> {
  if (!isLookupId(lookupId)) throw new SecureSyncError('invalid_response', 'Secure sync lookup id is invalid.');
  const response = await request('pull', { lookupId }, options);
  if (!response.ok) return throwForStatus(response);
  const body = await parseJson(response);
  if (
    !isRecord(body.envelope) ||
    typeof body.revision !== 'number' ||
    !Number.isSafeInteger(body.revision) ||
    body.revision <= 0
  ) {
    throw new SecureSyncError('invalid_response', 'Secure sync returned an invalid snapshot.', response.status);
  }
  return {
    envelope: body.envelope as unknown as EncryptedSnapshotEnvelope,
    revision: body.revision,
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : undefined
  };
}

export async function pushSecureSnapshot(
  lookupId: string,
  envelope: EncryptedSnapshotEnvelope,
  expectedRevision: number | undefined,
  options: SecureSyncClientOptions & { force?: boolean } = {}
): Promise<SecurePushResult> {
  if (!isLookupId(lookupId)) throw new SecureSyncError('invalid_response', 'Secure sync lookup id is invalid.');
  const response = await request('push', {
    lookupId,
    envelope,
    expectedRevision: expectedRevision ?? null
  }, options);
  if (!response.ok) return throwForStatus(response);
  const body = await parseJson(response);
  if (typeof body.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision <= 0) {
    throw new SecureSyncError('invalid_response', 'Secure sync returned an invalid revision.', response.status);
  }
  return {
    revision: body.revision,
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : undefined
  };
}
