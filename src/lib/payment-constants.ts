/**
 * Payment Validation Constants
 * Centralized validation patterns and configuration
 */

export const PAYMENT_VALIDATION = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 9999.99,
  ORDER_ID_PATTERN: /^[A-Z]{2}\d{6}$/,
  CASHTAG_PATTERN: /^\$[a-zA-Z0-9_]+$/,
} as const;

export const CASHAPP_PATTERNS = {
  RECEIVED_PHRASE: 'You were sent',
  AMOUNT_REGEX: /You were sent \$(\d+(?:\.\d{1,2})?)/i,
  NOTE_REGEX: /\bCF(\d{6,})\b/i,
  CF_PATTERNS: [
    /\b(CF\d{6})\b/i,           // Standalone CF689836
    /For:?\s*(CF\d{6})\b/i,     // "For CF689836" or "For: CF689836"
    /Note:?\s*(CF\d{6})\b/i,    // "Note CF689836" or "Note: CF689836"
    /Memo:?\s*(CF\d{6})\b/i,    // "Memo CF689836" or "Memo: CF689836"
  ],
  RECIPIENT_PATTERNS: [
    /(?:to|paid)\s+(\$[a-zA-Z0-9_]+)/i,
    /(\$[a-zA-Z0-9_]+)\s+(?:received|got)/i,
  ],
  SENDER_PATTERNS: [
    /(?:from|by)\s+(\$[a-zA-Z0-9_]+)/i,
    /(\$[a-zA-Z0-9_]+)\s+(?:sent|paid)/i,
  ],
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export const IMAP_CONFIG = {
  TLS_OPTIONS: { rejectUnauthorized: false },
  CONN_TIMEOUT_MS: 30000,
  AUTH_TIMEOUT_MS: 30000,
  SEARCH_TIMEOUT_MS: 60000,
  BATCH_SEARCH_DAYS: 1, // Search last 1 day for batch processor
  CHECK_SEARCH_DAYS: 7, // Search last 7 days for manual checks
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
} as const;

export const DEDUP_CONFIG = {
  CACHE_TTL_MS: 5000, // 5 second cache for duplicate requests
  MAX_CACHE_SIZE: 1000,
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
