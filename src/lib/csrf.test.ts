/**
 * Unit Tests for CSRF Token Management Module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCsrfToken,
  verifyCsrfToken,
  cleanupExpiredTokens,
  getCsrfTokenFromRequest,
  invalidateSessionTokens,
  getActiveTokenCount,
  clearAllTokens,
} from './csrf';

describe('CSRF Token Management', () => {
  const mockSessionId = 'test-session-123';

  beforeEach(() => {
    // Clean up all tokens before each test
    clearAllTokens();
  });

  describe('generateCsrfToken', () => {
    it('should generate a token with 64 hex characters', () => {
      const token = generateCsrfToken(mockSessionId);
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken(mockSessionId);
      const token2 = generateCsrfToken(mockSessionId);
      expect(token1).not.toBe(token2);
    });

    it('should bind token to session ID', () => {
      const token = generateCsrfToken(mockSessionId);
      expect(verifyCsrfToken(token, mockSessionId)).toBe(true);
    });
  });

  describe('verifyCsrfToken', () => {
    it('should verify valid token with correct session', () => {
      const token = generateCsrfToken(mockSessionId);
      expect(verifyCsrfToken(token, mockSessionId)).toBe(true);
    });

    it('should reject token with wrong session', () => {
      const token = generateCsrfToken(mockSessionId);
      expect(verifyCsrfToken(token, 'different-session')).toBe(false);
    });

    it('should reject non-existent token', () => {
      expect(verifyCsrfToken('nonexistent-token-0123456789abcdef', mockSessionId)).toBe(false);
    });

    it('should reject expired token', () => {
      // Mock Date.now to generate an expired token
      const originalNow = Date.now;
      const pastTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      vi.spyOn(Date, 'now').mockReturnValue(pastTime);

      const token = generateCsrfToken(mockSessionId);

      // Restore Date.now
      vi.spyOn(Date, 'now').mockReturnValue(originalNow());

      // Token should now be expired
      expect(verifyCsrfToken(token, mockSessionId)).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens', () => {
      // Generate a token in the past
      const originalNow = Date.now;
      const pastTime = Date.now() - 2 * 60 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(pastTime);

      generateCsrfToken(mockSessionId);

      vi.spyOn(Date, 'now').mockReturnValue(originalNow());

      const cleanedCount = cleanupExpiredTokens();
      expect(cleanedCount).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it('should not remove valid tokens', () => {
      const token = generateCsrfToken(mockSessionId);
      const initialCount = getActiveTokenCount();

      const cleanedCount = cleanupExpiredTokens();
      expect(cleanedCount).toBe(0);
      expect(getActiveTokenCount()).toBe(initialCount);
      expect(verifyCsrfToken(token, mockSessionId)).toBe(true);
    });
  });

  describe('getCsrfTokenFromRequest', () => {
    it('should extract token from X-CSRF-Token header', () => {
      const mockToken = 'test-token-123';
      const mockRequest = new Request('http://localhost', {
        headers: {
          'X-CSRF-Token': mockToken,
        },
      });

      expect(getCsrfTokenFromRequest(mockRequest)).toBe(mockToken);
    });

    it('should return null if header is missing', () => {
      const mockRequest = new Request('http://localhost');
      expect(getCsrfTokenFromRequest(mockRequest)).toBeNull();
    });
  });

  describe('invalidateSessionTokens', () => {
    it('should invalidate all tokens for a session', () => {
      const token1 = generateCsrfToken(mockSessionId);
      const token2 = generateCsrfToken(mockSessionId);
      const token3 = generateCsrfToken('other-session');

      const invalidatedCount = invalidateSessionTokens(mockSessionId);
      expect(invalidatedCount).toBe(2);

      // Session tokens should be invalid
      expect(verifyCsrfToken(token1, mockSessionId)).toBe(false);
      expect(verifyCsrfToken(token2, mockSessionId)).toBe(false);

      // Other session token should still be valid
      expect(verifyCsrfToken(token3, 'other-session')).toBe(true);
    });

    it('should return 0 if no tokens found for session', () => {
      const invalidatedCount = invalidateSessionTokens('nonexistent-session');
      expect(invalidatedCount).toBe(0);
    });
  });

  describe('getActiveTokenCount', () => {
    it('should return correct count of active tokens', () => {
      const initialCount = getActiveTokenCount();
      
      generateCsrfToken(mockSessionId);
      expect(getActiveTokenCount()).toBe(initialCount + 1);

      generateCsrfToken('another-session');
      expect(getActiveTokenCount()).toBe(initialCount + 2);

      invalidateSessionTokens(mockSessionId);
      expect(getActiveTokenCount()).toBe(initialCount + 1);
    });
  });

  describe('Security Properties', () => {
    it('should have sufficient entropy (generate 100 unique tokens)', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken(`session-${i}`));
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should enforce session binding strictly', () => {
      const sessions = ['session-1', 'session-2', 'session-3'];
      const tokens = sessions.map(s => generateCsrfToken(s));

      // Each token should only work with its own session
      for (let i = 0; i < tokens.length; i++) {
        for (let j = 0; j < sessions.length; j++) {
          if (i === j) {
            expect(verifyCsrfToken(tokens[i], sessions[j])).toBe(true);
          } else {
            expect(verifyCsrfToken(tokens[i], sessions[j])).toBe(false);
          }
        }
      }
    });

    it('should handle expiration correctly within 1 hour window', () => {
      const token = generateCsrfToken(mockSessionId);

      // Token should be valid immediately
      expect(verifyCsrfToken(token, mockSessionId)).toBe(true);

      // Mock time forward by 59 minutes (should still be valid)
      const originalNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(originalNow + 59 * 60 * 1000);
      expect(verifyCsrfToken(token, mockSessionId)).toBe(true);

      // Mock time forward by 61 minutes (should be expired)
      vi.spyOn(Date, 'now').mockReturnValue(originalNow + 61 * 60 * 1000);
      expect(verifyCsrfToken(token, mockSessionId)).toBe(false);

      vi.restoreAllMocks();
    });
  });
});
