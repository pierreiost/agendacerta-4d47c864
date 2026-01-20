// Encryption utility for sensitive data using AES-256-GCM
// This module provides encrypt/decrypt functions for OAuth tokens

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  }
  return key;
}

// Derive a CryptoKey from the string key
async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyString),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Use a fixed salt for deterministic key derivation
  // In production, you might want to store a unique salt per venue
  const salt = encoder.encode("lovable-oauth-tokens-v1");

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a plaintext string
export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt a ciphertext string
export async function decrypt(encryptedData: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// Check if a value appears to be encrypted (base64 with proper length)
export function isEncrypted(value: string): boolean {
  try {
    // Encrypted values should be base64 and at least IV_LENGTH + some ciphertext
    const decoded = atob(value);
    return decoded.length >= IV_LENGTH + 16; // At least IV + 16 bytes of ciphertext
  } catch {
    return false;
  }
}
