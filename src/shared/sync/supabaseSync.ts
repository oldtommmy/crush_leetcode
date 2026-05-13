import { CRUSH_SUPABASE_ANON_KEY, CRUSH_SUPABASE_URL } from '../constants';
import type { ExtensionStorageState, SupabaseSyncSettings } from '../types';

const SNAPSHOT_TABLE = 'crush_leetcode_sync_snapshots';
const MIN_SYNC_KEY_LENGTH = 12;
const WEAK_SYNC_KEYS = new Set([
  '123456789012',
  '12345678901234567890',
  'passwordpassword',
  'crushleetcode',
  'leetcodeleetcode',
  'abcdefghijklmnopqrst',
  '11111111111111111111',
  '00000000000000000000'
]);

interface SupabaseSnapshotRow {
  sync_key_hash: string;
  payload: ExtensionStorageState;
  updated_at: string;
}

export function supabaseRecoveryCodeSetupSql(): string {
  return [
    `drop table if exists public.${SNAPSHOT_TABLE};`,
    '',
    `create table public.${SNAPSHOT_TABLE} (`,
    '  sync_key_hash text primary key,',
    '  payload jsonb not null,',
    '  updated_at timestamptz not null default now()',
    ');',
    '',
    `alter table public.${SNAPSHOT_TABLE} enable row level security;`,
    '',
    `create policy "${SNAPSHOT_TABLE}_anon_select"`,
    `on public.${SNAPSHOT_TABLE} for select`,
    'to anon',
    'using (true);',
    '',
    `create policy "${SNAPSHOT_TABLE}_anon_insert"`,
    `on public.${SNAPSHOT_TABLE} for insert`,
    'to anon',
    'with check (true);',
    '',
    `create policy "${SNAPSHOT_TABLE}_anon_update"`,
    `on public.${SNAPSHOT_TABLE} for update`,
    'to anon',
    'using (true)',
    'with check (true);'
  ].join('\n');
}

function officialConfig(): { supabaseUrl: string; anonKey: string } {
  const supabaseUrl = CRUSH_SUPABASE_URL.trim().replace(/\/+$/, '');
  const anonKey = CRUSH_SUPABASE_ANON_KEY.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Cloud sync is not configured in this build.');
  }
  return { supabaseUrl, anonKey };
}

function assertConfig(config: SupabaseSyncSettings): { supabaseUrl: string; anonKey: string; syncKey: string } {
  const { supabaseUrl, anonKey } = officialConfig();
  const syncKey = config.syncKey?.trim();
  if (!syncKey || syncKey.length < MIN_SYNC_KEY_LENGTH) {
    throw new Error(`Enter a recovery code with at least ${MIN_SYNC_KEY_LENGTH} characters.`);
  }
  const normalized = syncKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (WEAK_SYNC_KEYS.has(normalized) || /^(\w)\1+$/.test(normalized)) {
    throw new Error('This recovery code is too easy to guess. Use your email plus a private phrase, or generate a random one.');
  }

  return { supabaseUrl, anonKey, syncKey };
}

export function generateStrongRecoveryCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 32)
    .replace(/(.{4})/g, '$1-')
    .replace(/-$/, '');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function endpoint(supabaseUrl: string, query = ''): string {
  return `${supabaseUrl}/rest/v1/${SNAPSHOT_TABLE}${query}`;
}

function headers(anonKey: string, prefer?: string): HeadersInit {
  return {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    'content-type': 'application/json',
    ...(prefer ? { prefer } : {})
  };
}

function sanitizeSnapshot(state: ExtensionStorageState): ExtensionStorageState {
  return {
    ...state,
    settings: {
      ...state.settings,
      cloudSync: {
        enabled: false,
        lastSyncedAt: state.settings.cloudSync.lastSyncedAt
      }
    }
  };
}

async function parseError(response: Response): Promise<Error> {
  const body = await response.text().catch(() => '');
  return new Error(body || `Supabase request failed: ${response.status}`);
}

export async function uploadSupabaseSnapshot(
  state: ExtensionStorageState,
  config: SupabaseSyncSettings
): Promise<{ updatedAt: string; syncKeyHash: string }> {
  const safeConfig = assertConfig(config);
  const syncKeyHash = await sha256Hex(safeConfig.syncKey);
  const updatedAt = new Date().toISOString();
  const row: SupabaseSnapshotRow = {
    sync_key_hash: syncKeyHash,
    payload: sanitizeSnapshot(state),
    updated_at: updatedAt
  };

  const response = await fetch(endpoint(safeConfig.supabaseUrl, '?on_conflict=sync_key_hash'), {
    method: 'POST',
    headers: headers(safeConfig.anonKey, 'resolution=merge-duplicates,return=representation'),
    body: JSON.stringify([row])
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return { updatedAt, syncKeyHash };
}

export async function downloadSupabaseSnapshot(
  config: SupabaseSyncSettings
): Promise<{ state: ExtensionStorageState; updatedAt?: string; syncKeyHash: string }> {
  const safeConfig = assertConfig(config);
  const syncKeyHash = await sha256Hex(safeConfig.syncKey);
  const query = `?sync_key_hash=eq.${encodeURIComponent(syncKeyHash)}&select=payload,updated_at&limit=1`;
  const response = await fetch(endpoint(safeConfig.supabaseUrl, query), {
    method: 'GET',
    headers: headers(safeConfig.anonKey)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const rows = await response.json() as Array<{ payload?: ExtensionStorageState; updated_at?: string }>;
  const row = rows[0];
  if (!row?.payload) {
    throw new Error('No cloud snapshot found for this recovery code.');
  }

  return {
    state: row.payload,
    updatedAt: row.updated_at,
    syncKeyHash
  };
}
