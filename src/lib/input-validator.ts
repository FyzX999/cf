/**
 * Input Validation and Sanitization Module
 * SECURITY: Prevents SQL injection, XSS, and other injection attacks
 */

export interface ValidationRule {
  type: 'string' | 'email' | 'url' | 'orderId' | 'quantity' | 'phone' | 'cashtag';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedChars?: string;
  min?: number;  // For numeric types
  max?: number;  // For numeric types
}

export interface ValidationResult {
  valid: boolean;
  sanitized?: string | number;
  errors: string[];
}

// SQL keywords to detect injection attempts
const SQL_KEYWORDS = [
  'SELECT', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION', 
  'EXEC', 'EXECUTE', 'SCRIPT', '--', '/*', '*/', ';--', 
  'xp_', 'sp_', 'ALTER', 'CREATE', 'TRUNCATE'
];

// XSS patterns to detect script injection
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /on\w+\s*=\s*["']?[^"']*["']?/gi,  // event handlers
  /javascript:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<applet/gi
];

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if input contains SQL injection attempts
 */
function containsSqlInjection(input: string): boolean {
  const upper = input.toUpperCase();
  return SQL_KEYWORDS.some(keyword => upper.includes(keyword));
}

/**
 * Check if input contains XSS attempts
 */
function containsXss(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Remove control characters, null bytes, and non-printable ASCII
 */
export function sanitizeString(input: string): string {
  // Remove null bytes and control characters (except newline, tab, carriage return)
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Strip SQL keywords from input (for non-SQL contexts)
 */
export function stripSqlKeywords(input: string): string {
  let result = input;
  SQL_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    result = result.replace(regex, '');
  });
  return result.trim();
}

/**
 * Validate email address (RFC 5322 compliant)
 */
export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  
  // RFC 5322 compliant regex (simplified but robust)
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(email);
}

/**
 * Validate order ID format (CF followed by 6+ digits)
 */
export function validateOrderId(orderId: string): boolean {
  if (!orderId) return false;
  
  // Format: CF followed by 6 or more digits
  const regex = /^CF\d{6,}$/i;
  return regex.test(orderId.toUpperCase());
}

/**
 * Validate URL (must start with http:// or https://)
 */
export function validateUrl(url: string): boolean {
  if (!url || url.length > 2048) return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize quantity (positive integer between 1 and 1,000,000)
 */
export function sanitizeQuantity(qty: unknown): number {
  const num = Number(qty);
  
  if (!Number.isFinite(num) || num < 1 || num > 1000000) {
    throw new Error('Quantity must be between 1 and 1,000,000');
  }
  
  // Ensure it's an integer
  return Math.floor(num);
}

/**
 * Validate cashtag format ($alphanumeric 1-20 chars)
 */
export function validateCashtag(cashtag: string): boolean {
  if (!cashtag) return false;
  
  const regex = /^\$[a-zA-Z0-9]{1,20}$/;
  return regex.test(cashtag);
}

/**
 * Validate phone number (digits, spaces, +, -, (, ) only; 10-15 digits)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  
  // Remove allowed non-digit characters
  const digitsOnly = phone.replace(/[\s+\-()]/g, '');
  
  // Check if only digits remain and length is 10-15
  return /^\d{10,15}$/.test(digitsOnly);
}

/**
 * Validate a single field against a rule
 */
export function validateField(
  value: unknown, 
  rule: ValidationRule
): ValidationResult {
  const errors: string[] = [];
  
  // Check required
  if (rule.required && (value === null || value === undefined || value === '')) {
    return { valid: false, errors: ['Field is required'] };
  }
  
  // If not required and empty, return valid
  if (!rule.required && (value === null || value === undefined || value === '')) {
    return { valid: true, sanitized: '', errors: [] };
  }
  
  // Type-specific validation
  switch (rule.type) {
    case 'string': {
      let str = String(value);
      
      // Sanitize
      str = sanitizeString(str);
      
      // Check SQL injection
      if (containsSqlInjection(str)) {
        errors.push('Input contains forbidden SQL keywords');
      }
      
      // Check XSS
      if (containsXss(str)) {
        errors.push('Input contains potentially malicious script');
      }
      
      // Check length
      if (rule.minLength && str.length < rule.minLength) {
        errors.push(`Must be at least ${rule.minLength} characters`);
      }
      
      if (rule.maxLength && str.length > rule.maxLength) {
        // Truncate if too long
        str = str.slice(0, rule.maxLength);
      }
      
      // Escape HTML
      const sanitized = escapeHtml(str);
      
      return { valid: errors.length === 0, sanitized, errors };
    }
    
    case 'email': {
      const email = String(value).toLowerCase().trim();
      
      if (!validateEmail(email)) {
        errors.push('Invalid email format');
      }
      
      return { valid: errors.length === 0, sanitized: email, errors };
    }
    
    case 'orderId': {
      const orderId = String(value).toUpperCase().trim();
      
      if (!validateOrderId(orderId)) {
        errors.push('Invalid order ID format');
      }
      
      return { valid: errors.length === 0, sanitized: orderId, errors };
    }
    
    case 'url': {
      const url = String(value).trim();
      
      if (!validateUrl(url)) {
        errors.push('Invalid URL format. Must start with http:// or https://');
      }
      
      return { valid: errors.length === 0, sanitized: url, errors };
    }
    
    case 'quantity': {
      try {
        const qty = sanitizeQuantity(value);
        return { valid: true, sanitized: qty, errors: [] };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Invalid quantity');
        return { valid: false, errors };
      }
    }
    
    case 'cashtag': {
      const cashtag = String(value).trim();
      
      if (!validateCashtag(cashtag)) {
        errors.push('Invalid cashtag format. Must be $alphanumeric (1-20 chars)');
      }
      
      return { valid: errors.length === 0, sanitized: cashtag, errors };
    }
    
    case 'phone': {
      const phone = String(value).trim();
      
      if (!validatePhone(phone)) {
        errors.push('Invalid phone number format');
      }
      
      return { valid: errors.length === 0, sanitized: phone, errors };
    }
    
    default:
      return { valid: false, errors: ['Unknown validation type'] };
  }
}

/**
 * Validate an entire object against a schema
 */
export function validateObject<T>(
  data: unknown, 
  schema: Record<string, ValidationRule>
): { valid: boolean; data?: T; errors: Record<string, string[]> } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: { _root: ['Data must be an object'] } };
  }
  
  const errors: Record<string, string[]> = {};
  const validated: Record<string, unknown> = {};
  
  for (const [key, rule] of Object.entries(schema)) {
    const value = (data as Record<string, unknown>)[key];
    const result = validateField(value, rule);
    
    if (!result.valid) {
      errors[key] = result.errors;
    } else {
      validated[key] = result.sanitized;
    }
  }
  
  const valid = Object.keys(errors).length === 0;
  
  return {
    valid,
    data: valid ? (validated as T) : undefined,
    errors,
  };
}
