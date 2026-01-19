/**
 * Application-level encryption for sensitive data
 *
 * Uses AES-256-GCM for authenticated encryption of secrets before database storage.
 * The encryption key should be set via ENCRYPTION_KEY environment variable.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get or derive the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // If key is exactly 32 bytes (64 hex chars), use directly
  if (key.length === 64 && /^[0-9a-f]+$/i.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // Otherwise derive a key from the provided secret
  return crypto.scryptSync(key, 'verso-salt', KEY_LENGTH);
}

/**
 * Encrypt a string value
 * Returns base64-encoded ciphertext with IV and auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a string value
 */
export function decrypt(encryptedValue: string): string {
  const key = getEncryptionKey();

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a value appears to be encrypted (has our format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  try {
    // Check that first two parts are valid base64 with expected lengths
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Encrypt sensitive fields in an object
 * Only encrypts string values for specified field names
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEncrypt: string[]
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0 && !isEncrypted(value)) {
      (result as Record<string, unknown>)[field] = encrypt(value);
    }
  }

  return result;
}

/**
 * Decrypt sensitive fields in an object
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToDecrypt: string[]
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      try {
        (result as Record<string, unknown>)[field] = decrypt(value);
      } catch {
        // If decryption fails, leave the value as-is
        // This handles cases where the value wasn't actually encrypted
      }
    }
  }

  return result;
}

/**
 * Generate a new encryption key (for initial setup)
 * Call this to generate a key for ENCRYPTION_KEY env var
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
