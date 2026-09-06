/**
 * Manual tests for encryption utilities
 * Validates Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7
 * 
 * Run with: tsx src/lib/encryption.test.ts
 * or with Node: node --loader ts-node/esm src/lib/encryption.test.ts
 */

import {
  encrypt,
  decrypt,
  encryptWithHmac,
  decryptAndVerify,
  hashSensitive,
  isEncrypted,
  safeEncrypt,
  safeDecrypt,
  generateEncryptionKey,
} from './encryption';

// Set up test encryption key
if (!process.env.ENCRYPTION_KEY) {
  console.log('Generating test encryption key...');
  process.env.ENCRYPTION_KEY = generateEncryptionKey();
  console.log(`ENCRYPTION_KEY=${process.env.ENCRYPTION_KEY}\n`);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

console.log('=== Basic Encryption/Decryption Tests ===\n');

// Test 1: Simple string
{
  const plaintext = 'Hello, World!';
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);
  assert(decrypted === plaintext, 'Simple string encryption/decryption');
}

// Test 2: Random IV (different ciphertexts)
{
  const plaintext = 'test message';
  const encrypted1 = encrypt(plaintext);
  const encrypted2 = encrypt(plaintext);
  assert(encrypted1 !== encrypted2, 'Different IVs produce different ciphertexts');
  assert(decrypt(encrypted1) === plaintext, 'First encryption decrypts correctly');
  assert(decrypt(encrypted2) === plaintext, 'Second encryption decrypts correctly');
}

// Test 3: Email addresses
{
  const email = 'user@example.com';
  const encrypted = encrypt(email);
  const decrypted = decrypt(encrypted);
  assert(decrypted === email, 'Email encryption/decryption');
  assert(!encrypted.includes('@'), 'Encrypted email does not contain @');
}

// Test 4: Unicode characters
{
  const plaintext = '🔒 Secure データ 数据';
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);
  assert(decrypted === plaintext, 'Unicode encryption/decryption');
}

// Test 5: Empty string
{
  const plaintext = '';
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);
  assert(decrypted === plaintext, 'Empty string encryption/decryption');
}

// Test 6: Long text
{
  const plaintext = 'A'.repeat(10000);
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);
  assert(decrypted === plaintext, 'Long text encryption/decryption');
}

// Test 7: Invalid ciphertext
{
  let threwError = false;
  try {
    decrypt('invalid');
  } catch {
    threwError = true;
  }
  assert(threwError, 'Invalid ciphertext throws error');
}

// Test 8: Tampered ciphertext
{
  const plaintext = 'test';
  const encrypted = encrypt(plaintext);
  const tampered = encrypted.slice(0, -2) + 'ff';
  let threwError = false;
  try {
    decrypt(tampered);
  } catch {
    threwError = true;
  }
  assert(threwError, 'Tampered ciphertext throws error (auth tag verification)');
}

// Test 9: Hex encoding
{
  const plaintext = 'test';
  const encrypted = encrypt(plaintext);
  assert(/^[0-9a-f]+$/.test(encrypted), 'Ciphertext is hex-encoded');
}

// Test 10: Minimum length includes IV and auth tag
{
  const plaintext = 'test';
  const encrypted = encrypt(plaintext);
  assert(encrypted.length >= 64, 'Ciphertext includes IV (32 hex) + auth tag (32 hex)');
}

console.log('\n=== HMAC Encryption Tests ===\n');

// Test 11: HMAC encryption/decryption
{
  const plaintext = 'sensitive data';
  const encrypted = encryptWithHmac(plaintext);
  const decrypted = decryptAndVerify(encrypted);
  assert(decrypted === plaintext, 'HMAC encryption/decryption');
}

// Test 12: Tampered HMAC ciphertext
{
  const plaintext = 'test';
  const encrypted = encryptWithHmac(plaintext);
  const tampered = encrypted.slice(0, -2) + 'ff';
  const result = decryptAndVerify(tampered);
  assert(result === null, 'Tampered HMAC ciphertext returns null');
}

// Test 13: Invalid HMAC format
{
  const result = decryptAndVerify('short');
  assert(result === null, 'Invalid HMAC format returns null');
}

// Test 14: HMAC prefix length
{
  const plaintext = 'test';
  const encrypted = encryptWithHmac(plaintext);
  assert(encrypted.length >= 128, 'HMAC ciphertext includes HMAC (64 hex) + encrypted data (64+ hex)');
}

// Test 15: HMAC modification detection
{
  const plaintext = 'test';
  const encrypted = encryptWithHmac(plaintext);
  const tamperedHmac = 'a' + encrypted.slice(1);
  const result = decryptAndVerify(tamperedHmac);
  assert(result === null, 'Modified HMAC portion detected');
}

console.log('\n=== Hashing Tests ===\n');

// Test 16: Consistent hashing
{
  const data = 'sensitive@example.com';
  const hash1 = hashSensitive(data);
  const hash2 = hashSensitive(data);
  assert(hash1 === hash2, 'Hash is consistent');
}

// Test 17: Different inputs produce different hashes
{
  const hash1 = hashSensitive('user1@example.com');
  const hash2 = hashSensitive('user2@example.com');
  assert(hash1 !== hash2, 'Different inputs produce different hashes');
}

// Test 18: SHA-256 hash format
{
  const hash = hashSensitive('test');
  assert(hash.length === 64, 'Hash is 64 characters (SHA-256)');
  assert(/^[0-9a-f]+$/.test(hash), 'Hash is hex-encoded');
}

// Test 19: One-way hashing
{
  const original = 'secret@example.com';
  const hash = hashSensitive(original);
  assert(!hash.includes('@'), 'Hash does not contain original characters');
  assert(!hash.includes('secret'), 'Hash does not contain original text');
}

console.log('\n=== Encryption Detection Tests ===\n');

// Test 20: Detect encrypted values
{
  const plaintext = 'test';
  const encrypted = encrypt(plaintext);
  assert(isEncrypted(encrypted), 'Encrypted value is detected');
}

// Test 21: Detect HMAC-encrypted values
{
  const plaintext = 'test';
  const encrypted = encryptWithHmac(plaintext);
  assert(isEncrypted(encrypted), 'HMAC-encrypted value is detected');
}

// Test 22: Plaintext is not detected as encrypted
{
  assert(!isEncrypted('plaintext'), 'Plaintext is not detected as encrypted');
  assert(!isEncrypted('user@example.com'), 'Email is not detected as encrypted');
  assert(!isEncrypted(''), 'Empty string is not detected as encrypted');
}

// Test 23: Short hex strings are not detected as encrypted
{
  assert(!isEncrypted('abc123'), 'Short hex string is not detected as encrypted');
}

console.log('\n=== Safe Encryption/Decryption Tests ===\n');

// Test 24: Safe encrypt plaintext
{
  const plaintext = 'test';
  const encrypted = safeEncrypt(plaintext);
  assert(isEncrypted(encrypted), 'Safe encrypt produces encrypted value');
  assert(decrypt(encrypted) === plaintext, 'Safe encrypted value decrypts correctly');
}

// Test 25: Safe encrypt doesn't double-encrypt
{
  const plaintext = 'test';
  const encrypted1 = encrypt(plaintext);
  const encrypted2 = safeEncrypt(encrypted1);
  assert(encrypted1 === encrypted2, 'Safe encrypt does not double-encrypt');
}

// Test 26: Safe decrypt encrypted data
{
  const plaintext = 'test';
  const encrypted = encrypt(plaintext);
  const decrypted = safeDecrypt(encrypted);
  assert(decrypted === plaintext, 'Safe decrypt works on encrypted data');
}

// Test 27: Safe decrypt returns plaintext unchanged
{
  const plaintext = 'not encrypted';
  const result = safeDecrypt(plaintext);
  assert(result === plaintext, 'Safe decrypt returns plaintext unchanged');
}

// Test 28: Migration scenario with mixed data
{
  const plaintext = 'user@example.com';
  const encrypted = encrypt('other@example.com');
  assert(safeDecrypt(plaintext) === plaintext, 'Safe decrypt handles plaintext');
  assert(safeDecrypt(encrypted) === 'other@example.com', 'Safe decrypt handles encrypted');
}

console.log('\n=== Environment Variable Validation Tests ===\n');

// Test 29: Missing ENCRYPTION_KEY
{
  const originalKey = process.env.ENCRYPTION_KEY;
  delete process.env.ENCRYPTION_KEY;
  let threwError = false;
  try {
    encrypt('test');
  } catch (e) {
    threwError = (e as Error).message.includes('ENCRYPTION_KEY environment variable is required');
  }
  process.env.ENCRYPTION_KEY = originalKey;
  assert(threwError, 'Missing ENCRYPTION_KEY throws error');
}

// Test 30: Wrong length ENCRYPTION_KEY
{
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = 'short';
  let threwError = false;
  try {
    encrypt('test');
  } catch (e) {
    threwError = (e as Error).message.includes('64 hex characters');
  }
  process.env.ENCRYPTION_KEY = originalKey;
  assert(threwError, 'Wrong length ENCRYPTION_KEY throws error');
}

// Test 31: Non-hex ENCRYPTION_KEY
{
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = 'z'.repeat(64);
  let threwError = false;
  try {
    encrypt('test');
  } catch (e) {
    threwError = (e as Error).message.includes('hexadecimal characters');
  }
  process.env.ENCRYPTION_KEY = originalKey;
  assert(threwError, 'Non-hex ENCRYPTION_KEY throws error');
}

console.log('\n=== Key Generation Tests ===\n');

// Test 32: Generate valid key
{
  const key = generateEncryptionKey();
  assert(key.length === 64, 'Generated key is 64 characters');
  assert(/^[0-9a-f]+$/.test(key), 'Generated key is hex-encoded');
}

// Test 33: Generate different keys
{
  const key1 = generateEncryptionKey();
  const key2 = generateEncryptionKey();
  assert(key1 !== key2, 'Generated keys are different');
}

// Test 34: Generated keys work for encryption
{
  const key = generateEncryptionKey();
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = key;
  const plaintext = 'test';
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);
  assert(decrypted === plaintext, 'Generated key works for encryption');
  process.env.ENCRYPTION_KEY = originalKey;
}

console.log('\n=== Round-Trip Integrity Tests (Requirement 16.5) ===\n');

// Test 35: Various data types maintain integrity
{
  const testData = [
    'simple text',
    'email@example.com',
    '{"json": "data", "nested": {"key": "value"}}',
    'unicode: 你好世界 🌍',
    'special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
    '',
    'a'.repeat(1000),
  ];

  testData.forEach((plaintext, index) => {
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    assert(decrypted === plaintext, `Data integrity test ${index + 1}: ${plaintext.substring(0, 30)}...`);
  });
}

// Test 36: Tampering detection at various positions
{
  const plaintext = 'sensitive data';
  const encrypted = encrypt(plaintext);
  const tamperPositions = [0, 32, 64, encrypted.length - 2];
  
  tamperPositions.forEach((pos) => {
    const tampered = encrypted.slice(0, pos) + 'ff' + encrypted.slice(pos + 2);
    let threwError = false;
    try {
      decrypt(tampered);
    } catch {
      threwError = true;
    }
    assert(threwError, `Tampering detected at position ${pos}`);
  });
}

console.log('\n=== All Tests Passed! ===\n');
console.log('✓ 36 tests completed successfully');
console.log('✓ Requirements validated: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7');
console.log('\nEncryption module is ready for use.');
