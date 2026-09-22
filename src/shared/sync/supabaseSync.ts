import { CRUSH_SUPABASE_ANON_KEY, CRUSH_SUPABASE_URL } from '../constants';
import type { ExtensionStorageState, SecureSyncSettings } from '../types';

/** Legacy plaintext storage. This module is intentionally migration-only. */
const SNAPSHOT_TABLE = 'crush_leetcode_sync_snapshots';
const MIN_SYNC_KEY_LENGTH = 12;

function legacyConfig(config: SecureSyncSettings): { supabaseUrl: string; anonKey: string; syncKey: string } {
  const supabaseUrl = CRUSH_SUPABASE_URL.trim().replace(/\/+$/, '');
  const anonKey = CRUSH_SUPABASE_ANON_KEY.trim();
  const syncKey = config.syncKey?.trim();
  if (!supabaseUrl || !anonKey) throw new Error('Legacy cloud migration is not configured in this build.');
  if (!syncKey || syncKey.length < MIN_SYNC_KEY_LENGTH) throw new Error('Enter the legacy recovery code.');
  return { supabaseUrl, anonKey, syncKey };
}

export function generateStrongRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes]
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .replace(/(.{8})/g, '$1-')
    .replace(/-$/, '');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function headers(anonKey: string): HeadersInit {
  return { apikey: anonKey, authorization: `Bearer ${anonKey}`, accept: 'application/json' };
}

function endpoint(supabaseUrl: string, syncKeyHash: string): string {
  return `${supabaseUrl}/rest/v1/${SNAPSHOT_TABLE}?sync_key_hash=eq.${encodeURIComponent(syncKeyHash)}`;
}

async function legacyError(response: Response): Promise<Error> {
  return new Error(`Legacy migration request failed (${response.status}).`);
}

export async function readLegacySupabaseSnapshot(
  config: SecureSyncSettings
): Promise<{ state: ExtensionStorageState; updatedAt?: string; syncKeyHash: string }> {
  const safe = legacyConfig(config);
  const syncKeyHash = await sha256Hex(safe.syncKey);
  const response = await fetch(`${endpoint(safe.supabaseUrl, syncKeyHash)}&select=payload,updated_at&limit=1`, {
    method: 'GET',
    headers: headers(safe.anonKey),
    cache: 'no-store'
  });
  if (!response.ok) throw await legacyError(response);
  const body: unknown = await response.json().catch(() => undefined);
  if (!Array.isArray(body) || !body[0] || typeof body[0] !== 'object') {
    throw new Error('No legacy cloud snapshot found for this recovery code.');
  }
  const row = body[0] as { payload?: unknown; updated_at?: unknown };
  if (!row.payload || typeof row.payload !== 'object') {
    throw new Error('Legacy cloud snapshot is invalid.');
  }
  return {
    state: row.payload as ExtensionStorageState,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    syncKeyHash
  };
}

/** @deprecated Migration-only alias. */
export const downloadSupabaseSnapshot = readLegacySupabaseSnapshot;
