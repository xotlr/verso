import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encrypt, decrypt, isEncrypted, encryptFields, decryptFields, generateEncryptionKey } from '@/lib/encryption';

// Mock encryption key for testing
const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('Encryption Utilities', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // Format: iv:authTag:ciphertext

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
      const plaintext = 'same-secret';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'secret with émojis 🔐 and "quotes" & <html>';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid encrypted format', () => {
      expect(() => decrypt('not-valid-format')).toThrow('Invalid encrypted value format');
    });

    it('should throw on tampered ciphertext (authentication failure)', () => {
      const encrypted = encrypt('secret');
      const [iv, authTag, ciphertext] = encrypted.split(':');
      const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}XX`;

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = encrypt('secret');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('just-plain-text')).toBe(false);
      expect(isEncrypted('not:enough:parts:here')).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const obj = {
        clientId: 'public-client-id',
        clientSecret: 'super-secret-key',
        issuer: 'https://auth.example.com',
      };

      const encrypted = encryptFields(obj, ['clientSecret']);

      expect(encrypted.clientId).toBe('public-client-id'); // Unchanged
      expect(encrypted.issuer).toBe('https://auth.example.com'); // Unchanged
      expect(encrypted.clientSecret).not.toBe('super-secret-key'); // Encrypted
      expect(isEncrypted(encrypted.clientSecret as string)).toBe(true);
    });

    it('should decrypt specified fields in an object', () => {
      const original = {
        clientId: 'public-client-id',
        clientSecret: 'super-secret-key',
      };

      const encrypted = encryptFields(original, ['clientSecret']);
      const decrypted = decryptFields(encrypted, ['clientSecret']);

      expect(decrypted.clientId).toBe(original.clientId);
      expect(decrypted.clientSecret).toBe(original.clientSecret);
    });

    it('should not encrypt already encrypted values', () => {
      const obj = {
        clientSecret: encrypt('already-encrypted'),
      };

      const result = encryptFields(obj, ['clientSecret']);

      // Should be the same (not double-encrypted)
      expect(result.clientSecret).toBe(obj.clientSecret);
    });

    it('should handle missing fields gracefully', () => {
      const obj = {
        clientId: 'public-client-id',
      };

      const result = encryptFields(obj, ['clientSecret']);
      expect(result.clientId).toBe('public-client-id');
      expect(result.clientSecret).toBeUndefined();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('environment handling', () => {
    it('should throw when ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('ENCRYPTION_KEY', '');

      expect(() => encrypt('secret')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });
});
