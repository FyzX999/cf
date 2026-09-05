/**
 * Two-Factor Authentication (2FA) System
 * 
 * Implements TOTP-based 2FA for user accounts and admin panel
 * with device remembering capability.
 */

import { createHmac, randomBytes } from 'crypto';

export interface TwoFactorSecret {
  secret: string;
  backupCodes: string[];
  enabled: boolean;
  enabledAt?: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
}

/**
 * Generate a random base32 secret for TOTP
 */
export function generateSecret(): string {
  const buffer = randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Base32 encoding for TOTP secrets
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding for TOTP verification
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = Buffer.alloc(Math.ceil(input.length * 5 / 8));

  for (let i = 0; i < input.length; i++) {
    const idx = alphabet.indexOf(input[i].toUpperCase());
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Generate TOTP code for current time window
 */
export function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  return generateHOTP(secret, time);
}

/**
 * Generate HOTP code
 */
function generateHOTP(secret: string, counter: number): string {
  const decodedSecret = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  
  for (let i = 0; i < 8; i++) {
    buffer[7 - i] = counter & 0xff;
    counter = counter >> 8;
  }

  const hmac = createHmac('sha1', decodedSecret);
  hmac.update(buffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  );

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify TOTP code (checks current window and +/- 1 window for clock drift)
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = -window; i <= window; i++) {
    const code = generateHOTP(secret, currentTime + i);
    if (code === token) {
      return true;
    }
  }

  return false;
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, backupCodes: string[]): { valid: boolean; remainingCodes?: string[] } {
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const index = backupCodes.findIndex(c => c === normalizedCode);
  
  if (index === -1) {
    return { valid: false };
  }

  // Remove used backup code
  const remainingCodes = backupCodes.filter((_, i) => i !== index);
  return { valid: true, remainingCodes };
}

/**
 * Generate QR code data URL for authenticator apps
 */
export function generateQRCodeData(secret: string, email: string, issuer: string = 'CheapFollower'): string {
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  return otpauthUrl;
}

/**
 * Generate trusted device token
 */
export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create trusted device record
 */
export function createTrustedDevice(userAgent: string, ip: string, name?: string): TrustedDevice {
  const now = new Date().toISOString();
  return {
    id: generateDeviceToken(),
    name: name || 'Unknown Device',
    userAgent,
    ip,
    createdAt: now,
    lastUsedAt: now
  };
}

/**
 * Verify device token
 */
export function verifyDeviceToken(token: string, trustedDevices: TrustedDevice[]): TrustedDevice | null {
  const device = trustedDevices.find(d => d.id === token);
  if (!device) return null;

  // Check if device was created within the last 30 days
  const createdAt = new Date(device.createdAt);
  const now = new Date();
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceCreation > 30) {
    return null; // Device expired
  }

  return device;
}

/**
 * Update device last used time
 */
export function updateDeviceLastUsed(device: TrustedDevice): TrustedDevice {
  return {
    ...device,
    lastUsedAt: new Date().toISOString()
  };
}