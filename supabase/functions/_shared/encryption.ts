// Encryption utility for sensitive data using AES-256-GCM
// This module provides encrypt/decrypt functions for OAuth tokens
// SECURITY FIX: Uses random salt per encryption (CWE-760 remediation)

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits for PBKDF2 salt
const TAG_LENGTH = 128; // bits

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  }
  return key;
}

// Derive a CryptoKey from the string key with a provided salt
async function deriveKey(keyString: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyString),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

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
// Format: base64(salt[16] + iv[12] + ciphertext)
export async function encrypt(plaintext: string): Promise<string> {
  // Generate random salt for each encryption (CWE-760 fix)
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(getEncryptionKey(), salt.buffer);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt + IV + ciphertext and encode as base64
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt a ciphertext string
// Expects format: base64(salt[16] + iv[12] + ciphertext)
export async function decrypt(encryptedData: string): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  
  // Extract salt, IV and ciphertext
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Derive key using extracted salt
  const key = await deriveKey(getEncryptionKey(), salt.buffer);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// Check if a value appears to be encrypted (base64 with proper length)
// Updated to check for new format: salt(16) + iv(12) + ciphertext(16+)
export function isEncrypted(value: string): boolean {
  try {
    // Encrypted values should be base64 and at least SALT + IV + 16 bytes of ciphertext
    const decoded = atob(value);
    return decoded.length >= SALT_LENGTH + IV_LENGTH + 16;
  } catch {
    return false;
  }
}

// Legacy decryption for tokens encrypted with old hardcoded salt
// Only used for migration purposes - will be removed after all tokens are re-encrypted
export async function decryptLegacy(encryptedData: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Old hardcoded salt (for backwards compatibility only)
  const legacySalt = encoder.encode("lovable-oauth-tokens-v1");
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getEncryptionKey()),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: legacySalt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
  
  // Old format: base64(iv[12] + ciphertext)
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// Check if value is in legacy format (shorter - no salt prefix)
export function isLegacyEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    // Legacy format: iv(12) + ciphertext(16+), but less than new format with salt
    return decoded.length >= IV_LENGTH + 16 && decoded.length < SALT_LENGTH + IV_LENGTH + 16;
  } catch {
    return false;
  }
}
