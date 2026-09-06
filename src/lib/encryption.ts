/**
 * Data Encryption Module using AES-256-GCM
 * SECURITY: Encrypts sensitive data at rest with authentication
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // In development, use a default key (NOT FOR PRODUCTION)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Encryption] Using default development key. Set ENCRYPTION_KEY in production!');
      return Buffer.from('0'.repeat(64), 'hex');
    }
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // Key should be 32 bytes (256 bits) as hex string (64 characters)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns: iv + authTag + encrypted (all hex)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv + authTag + encrypted (all hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt a string value using AES-256-GCM
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  
  // Extract components
  const iv = Buffer.from(ciphertext.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(ciphertext.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = ciphertext.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt with HMAC for additional integrity checking
 */
export function encryptWithHmac(plaintext: string): string {
  const encrypted = encrypt(plaintext);
  
  // Create HMAC
  const key = getEncryptionKey();
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(encrypted);
  const signature = hmac.digest('hex');
  
  // Return: encrypted + signature
  return encrypted + signature;
}

/**
 * Decrypt and verify HMAC integrity
 * Returns null if HMAC verification fails
 */
export function decryptAndVerify(ciphertext: string): string | null {
  // Extract signature (last 64 chars = 32 bytes as hex)
  const signatureLength = 64;
  const signature = ciphertext.slice(-signatureLength);
  const encrypted = ciphertext.slice(0, -signatureLength);
  
  // Verify HMAC
  const key = getEncryptionKey();
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(encrypted);
  const expectedSignature = hmac.digest('hex');
  
  // Constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    return null; // Integrity check failed
  }
  
  // Decrypt
  return decrypt(encrypted);
}

/**
 * Hash sensitive data (one-way, for logging)
 */
export function hashSensitive(data: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Check if a string appears to be encrypted (starts with hex pattern)
 */
export function isEncrypted(value: string): boolean {
  // Encrypted values are hex strings of specific minimum length
  const minLength = (IV_LENGTH + AUTH_TAG_LENGTH) * 2; // At least IV + auth tag
  return value.length >= minLength && /^[0-9a-f]+$/i.test(value);
}

/**
 * Safely encrypt a value (handles already-encrypted data)
 */
export function safeEncrypt(value: string): string {
  if (isEncrypted(value)) {
    return value; // Already encrypted
  }
  return encrypt(value);
}

/**
 * Safely decrypt a value (handles unencrypted data)
 */
export function safeDecrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value; // Not encrypted
  }
  try {
    return decrypt(value);
  } catch {
    // If decryption fails, return original (might be corrupted or wrong key)
    console.warn('[Encryption] Failed to decrypt value, returning original');
    return value;
  }
}

/**
 * Generate a new encryption key (for setup/rotation)
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32); // 256 bits
  return key.toString('hex');
}
