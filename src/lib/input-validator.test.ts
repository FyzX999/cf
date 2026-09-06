/**
 * Unit tests for Input Validator
 * 
 * Tests basic functionality of validation and sanitization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  escapeHtml,
  stripSqlKeywords,
  containsSqlInjection,
  containsXss,
  validateEmail,
  validateOrderId,
  validateUrl,
  sanitizeQuantity,
  validateCashtag,
  validatePhone,
  validateField,
  validateObject,
} from './input-validator';

describe('Input Validator', () => {
  describe('sanitizeString', () => {
    it('should remove null bytes and control characters', () => {
      const input = 'Hello\x00World\x01Test';
      const result = sanitizeString(input);
      expect(result).toBe('HelloWorldTest');
    });

    it('should preserve newlines, tabs, and carriage returns', () => {
      const input = 'Line1\nLine2\tTabbed\rReturn';
      const result = sanitizeString(input);
      expect(result).toBe('Line1\nLine2\tTabbed\rReturn');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = sanitizeString(input);
      expect(result).toBe('test');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("XSS")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = escapeHtml(input);
      expect(result).toBe('Tom &amp; Jerry');
    });
  });

  describe('SQL Injection Detection', () => {
    it('should detect SQL keywords', () => {
      expect(containsSqlInjection('SELECT * FROM users')).toBe(true);
      expect(containsSqlInjection('DROP TABLE users')).toBe(true);
      expect(containsSqlInjection('normal text')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(containsSqlInjection('select * from users')).toBe(true);
      expect(containsSqlInjection('SeLeCt * FrOm users')).toBe(true);
    });

    it('should strip SQL keywords', () => {
      const input = 'SELECT * FROM users';
      const result = stripSqlKeywords(input);
      expect(result).not.toContain('SELECT');
      expect(result).not.toContain('FROM');
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      expect(containsXss('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(containsXss('<img onerror="alert(1)">')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(containsXss('javascript:alert(1)')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(containsXss('This is normal text')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should reject emails over 254 characters', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('validateOrderId', () => {
    it('should validate correct order IDs', () => {
      expect(validateOrderId('ORD-ABC12345')).toBe(true);
      expect(validateOrderId('ord-abc12345')).toBe(true); // case-insensitive
    });

    it('should reject invalid order IDs', () => {
      expect(validateOrderId('ORD-12345')).toBe(false); // too short
      expect(validateOrderId('ORD-ABCDEFGHI')).toBe(false); // too long
      expect(validateOrderId('ABC-12345678')).toBe(false); // wrong prefix
      expect(validateOrderId('ORD12345678')).toBe(false); // missing dash
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('https://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('javascript:alert(1)')).toBe(false);
      expect(validateUrl('example.com')).toBe(false); // missing protocol
      expect(validateUrl('')).toBe(false);
    });

    it('should reject URLs over 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2040);
      expect(validateUrl(longUrl)).toBe(false);
    });
  });

  describe('sanitizeQuantity', () => {
    it('should convert valid numbers', () => {
      expect(sanitizeQuantity(5)).toBe(5);
      expect(sanitizeQuantity('10')).toBe(10);
      expect(sanitizeQuantity(42.7)).toBe(42); // floors decimals
    });

    it('should constrain to valid range', () => {
      expect(sanitizeQuantity(0)).toBe(1); // min is 1
      expect(sanitizeQuantity(-5)).toBe(1); // negatives become 1
      expect(sanitizeQuantity(1000001)).toBe(1000000); // max is 1000000
    });

    it('should handle invalid inputs', () => {
      expect(sanitizeQuantity('invalid')).toBe(1);
      expect(sanitizeQuantity(null)).toBe(1);
      expect(sanitizeQuantity(undefined)).toBe(1);
    });
  });

  describe('validateCashtag', () => {
    it('should validate correct cashtags', () => {
      expect(validateCashtag('$username')).toBe(true);
      expect(validateCashtag('$User123')).toBe(true);
    });

    it('should reject invalid cashtags', () => {
      expect(validateCashtag('username')).toBe(false); // missing $
      expect(validateCashtag('$')).toBe(false); // too short
      expect(validateCashtag('$' + 'a'.repeat(21))).toBe(false); // too long
      expect(validateCashtag('$user_name')).toBe(false); // invalid chars
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1 (555) 123-4567')).toBe(true);
      expect(validatePhone('+44 20 1234 5678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false); // too short
      expect(validatePhone('12345678901234567')).toBe(false); // too long
      expect(validatePhone('abc-def-ghij')).toBe(false); // letters
    });
  });

  describe('validateField', () => {
    it('should validate required fields', () => {
      const rule = { type: 'string' as const, required: true };
      const result = validateField(null, rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should allow optional fields to be empty', () => {
      const rule = { type: 'string' as const, required: false };
      const result = validateField(null, rule);
      expect(result.valid).toBe(true);
    });

    it('should sanitize and validate strings', () => {
      const rule = { type: 'string' as const, maxLength: 10 };
      const result = validateField('Hello<script>', rule);
      expect(result.valid).toBe(false); // Contains XSS
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should truncate strings exceeding max length', () => {
      const rule = { type: 'string' as const, maxLength: 5 };
      const result = validateField('HelloWorld', rule);
      expect(result.sanitized).toBe('Hello');
    });

    it('should validate email fields', () => {
      const rule = { type: 'email' as const };
      const result = validateField('user@example.com', rule);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('user@example.com');
    });

    it('should validate quantity fields', () => {
      const rule = { type: 'quantity' as const, min: 1, max: 100 };
      const result = validateField(50, rule);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(50);
    });
  });

  describe('validateObject', () => {
    it('should validate an entire object', () => {
      const schema = {
        email: { type: 'email' as const, required: true },
        quantity: { type: 'quantity' as const, min: 1, max: 100 },
        link: { type: 'url' as const, required: true },
      };

      const data = {
        email: 'user@example.com',
        quantity: 5,
        link: 'https://instagram.com/profile',
      };

      const result = validateObject(data, schema);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should collect errors for invalid fields', () => {
      const schema = {
        email: { type: 'email' as const, required: true },
        quantity: { type: 'quantity' as const, min: 1, max: 100 },
      };

      const data = {
        email: 'invalid-email',
        quantity: 200, // exceeds max
      };

      const result = validateObject(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.quantity).toBeDefined();
    });

    it('should reject non-object inputs', () => {
      const schema = { field: { type: 'string' as const } };
      const result = validateObject('not an object', schema);
      expect(result.valid).toBe(false);
      expect(result.errors._root).toBeDefined();
    });
  });
});
