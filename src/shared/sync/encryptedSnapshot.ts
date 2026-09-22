import type { ExtensionStorageState } from '../types';
import { buildSanitizedSnapshot } from './snapshotPolicy';

export const ENCRYPTED_SNAPSHOT_VERSION = 1 as const;
export const PBKDF2_ITERATIONS = 600_000;
const LOOKUP_DOMAIN = 'crush-leetcode:secure-sync:lookup:v1\0';
const AAD_DOMAIN = 'crush-leetcode:secure-sync:envelope';

export type SnapshotCompression = 'gzip' | 'none';

export interface EncryptedSnapshotEnvelope {
  schemaVersion: typeof ENCRYPTED_SNAPSHOT_VERSION;
  stateVersion: number;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
  };
  compression: SnapshotCompression;
  ciphertext: string;
}

export interface SnapshotCryptoOptions {
  compression?: 'auto' | SnapshotCompression;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error('Invalid encrypted snapshot encoding.');
  }
}

function normalizeRecoveryCode(recoveryCode: string): string {
  const normalized = recoveryCode.trim();
  if (!normalized) throw new Error('Recovery code is required.');
  return normalized;
}

export async function deriveLookupId(recoveryCode: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${LOOKUP_DOMAIN}${normalizeRecoveryCode(recoveryCode)}`)
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function additionalData(lookupId: string, version: number): Uint8Array {
  return encoder.encode(`${AAD_DOMAIN}:v${version}:${lookupId}`);
}

async function deriveEncryptionKey(recoveryCode: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (!Number.isSafeInteger(iterations) || iterations < PBKDF2_ITERATIONS) {
    throw new Error('Encrypted snapshot uses an unsafe key derivation cost.');
  }
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normalizeRecoveryCode(recoveryCode)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: arrayBuffer(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function streamTransform(bytes: Uint8Array, stream: TransformStream): Promise<Uint8Array> {
  const result = await new Response(new Blob([arrayBuffer(bytes)]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(result);
}

async function compress(bytes: Uint8Array, requested: 'auto' | SnapshotCompression): Promise<{
  bytes: Uint8Array;
  compression: SnapshotCompression;
}> {
  if (
    requested === 'none' ||
    typeof globalThis.CompressionStream !== 'function' ||
    typeof globalThis.DecompressionStream !== 'function'
  ) {
    return { bytes, compression: 'none' };
  }
  try {
    return {
      bytes: await streamTransform(bytes, new CompressionStream('gzip') as unknown as TransformStream),
      compression: 'gzip'
    };
  } catch {
    if (requested === 'gzip') throw new Error('Gzip compression is unavailable.');
    return { bytes, compression: 'none' };
  }
}

async function decompress(bytes: Uint8Array, compression: SnapshotCompression): Promise<Uint8Array> {
  if (compression === 'none') return bytes;
  if (typeof globalThis.DecompressionStream !== 'function') {
    throw new Error('This browser cannot decompress the encrypted snapshot.');
  }
  try {
    return await streamTransform(bytes, new DecompressionStream('gzip') as unknown as TransformStream);
  } catch {
    throw new Error('Encrypted snapshot compression is invalid.');
  }
}

function validateEnvelope(value: unknown): EncryptedSnapshotEnvelope {
  if (!value || typeof value !== 'object') throw new Error('Invalid encrypted snapshot envelope.');
  const envelope = value as Partial<EncryptedSnapshotEnvelope>;
  if (
    envelope.schemaVersion !== ENCRYPTED_SNAPSHOT_VERSION ||
    !Number.isSafeInteger(envelope.stateVersion) ||
    (envelope.stateVersion ?? 0) <= 0 ||
    envelope.kdf?.name !== 'PBKDF2' ||
    envelope.kdf.hash !== 'SHA-256' ||
    !Number.isSafeInteger(envelope.kdf.iterations) ||
    (envelope.kdf.iterations ?? 0) < PBKDF2_ITERATIONS ||
    typeof envelope.kdf.salt !== 'string' ||
    envelope.cipher?.name !== 'AES-GCM' ||
    typeof envelope.cipher.iv !== 'string' ||
    (envelope.compression !== 'gzip' && envelope.compression !== 'none') ||
    typeof envelope.ciphertext !== 'string'
  ) {
    throw new Error('Unsupported or invalid encrypted snapshot envelope.');
  }
  return envelope as EncryptedSnapshotEnvelope;
}

export async function encryptSnapshot(
  state: ExtensionStorageState,
  recoveryCode: string,
  options: SnapshotCryptoOptions = {}
): Promise<{ lookupId: string; envelope: EncryptedSnapshotEnvelope }> {
  const lookupId = await deriveLookupId(recoveryCode);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(recoveryCode, salt, PBKDF2_ITERATIONS);
  const plaintext = encoder.encode(JSON.stringify(buildSanitizedSnapshot(state)));
  const compressed = await compress(plaintext, options.compression ?? 'auto');
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: arrayBuffer(iv), additionalData: arrayBuffer(additionalData(lookupId, ENCRYPTED_SNAPSHOT_VERSION)) },
    key,
    arrayBuffer(compressed.bytes)
  );
  return {
    lookupId,
    envelope: {
      schemaVersion: ENCRYPTED_SNAPSHOT_VERSION,
      stateVersion: state.version,
      kdf: {
        name: 'PBKDF2',
        hash: 'SHA-256',
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt)
      },
      cipher: { name: 'AES-GCM', iv: bytesToBase64(iv) },
      compression: compressed.compression,
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    }
  };
}

export async function decryptSnapshot(
  input: unknown,
  recoveryCode: string,
  expectedLookupId?: string
): Promise<ExtensionStorageState> {
  const envelope = validateEnvelope(input);
  const lookupId = expectedLookupId ?? await deriveLookupId(recoveryCode);
  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  if (salt.byteLength < 16 || iv.byteLength !== 12) throw new Error('Invalid encrypted snapshot parameters.');
  const key = await deriveEncryptionKey(recoveryCode, salt, envelope.kdf.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: arrayBuffer(iv), additionalData: arrayBuffer(additionalData(lookupId, envelope.schemaVersion)) },
      key,
      arrayBuffer(base64ToBytes(envelope.ciphertext))
    );
  } catch {
    throw new Error('Unable to decrypt snapshot. Check the recovery code or snapshot integrity.');
  }
  const uncompressed = await decompress(new Uint8Array(plaintext), envelope.compression);
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(uncompressed));
  } catch {
    throw new Error('Decrypted snapshot payload is invalid.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Decrypted snapshot payload is invalid.');
  return parsed as ExtensionStorageState;
}
