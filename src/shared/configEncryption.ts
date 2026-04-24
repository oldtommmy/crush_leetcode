// Lightweight encryption for API keys using Chrome's runtime ID as salt
// This keeps keys encrypted at rest while being transparent to the extension

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getDerivedKey(): Promise<CryptoKey> {
  // Use Chrome extension ID as part of the key derivation
  const extensionId = chrome.runtime.id;
  const data = encoder.encode('crush-leetcode-key-' + extensionId);
  
  const hash = await crypto.subtle.digest('SHA-256', data);
  return await crypto.subtle.importKey('raw', hash, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    encoder.encode(plaintext)
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(encryptedBase64: string): Promise<string> {
  const key = await getDerivedKey();
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 16);
  const encrypted = combined.slice(16);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

export function isEncryptedApiKey(value: string): boolean {
  try {
    const decoded = atob(value);
    return decoded.length > 20; // IV (16 bytes) + some encrypted data
  } catch {
    return false;
  }
}
