/**
 * XSS Prevention Utility
 * 
 * This module provides functions to sanitize user-generated content
 * before rendering to prevent XSS attacks.
 * 
 * Requirements addressed:
 * - Security Requirement 20: Input sanitization for XSS prevention
 * - Escape HTML/script tags in ticket body before rendering
 * - Sanitize email headers to prevent injection
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes script tags, event handlers, and dangerous attributes
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHTML(html: string): string {
  if (!html) return "";

  let sanitized = html;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Remove object and embed tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");

  // Remove style tags that could contain expression()
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, "");

  return sanitized;
}

/**
 * Escapes HTML entities to prevent script execution
 * Converts special characters to their HTML entity equivalents
 * 
 * @param text - The text to escape
 * @returns Text with HTML entities escaped
 */
export function escapeHTML(text: string): string {
  if (!text) return "";

  const entityMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'\/]/g, (char) => entityMap[char] || char);
}

/**
 * Sanitizes email subject and body to prevent email header injection
 * Removes newline characters and control characters that could be exploited
 * 
 * @param input - The email header value to sanitize
 * @returns Sanitized string safe for email headers
 */
export function sanitizeEmailHeader(input: string): string {
  if (!input) return "";

  let sanitized = input;

  // Remove newline characters (CR, LF) that could inject headers
  sanitized = sanitized.replace(/[\r\n]/g, "");

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove other control characters (0x00-0x1F except space)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitizes email address to prevent injection attacks
 * Validates format and removes potentially malicious characters
 * 
 * @param email - The email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Trim and remove any whitespace
  const trimmed = email.trim().replace(/\s/g, "");

  // Check if it matches basic email format
  if (!emailRegex.test(trimmed)) {
    return "";
  }

  return trimmed;
}

/**
 * Sanitizes ticket message body for display
 * This is the main function used when rendering ticket messages
 * 
 * @param body - The ticket message body
 * @returns Sanitized body safe for display
 */
export function sanitizeTicketMessage(body: string): string {
  if (!body) return "";

  // First escape HTML to prevent any script execution
  let sanitized = escapeHTML(body);

  return sanitized;
}

/**
 * Sanitizes ticket subject
 * 
 * @param subject - The ticket subject
 * @returns Sanitized subject
 */
export function sanitizeTicketSubject(subject: string): string {
  if (!subject) return "";

  // Escape HTML in subject
  return escapeHTML(subject);
}
