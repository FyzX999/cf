/**
 * Payment Error Types and Utilities
 * Standardized error handling for payment operations
 */

export enum PaymentErrorCode {
  NOT_FOUND = 'PAYMENT_NOT_FOUND',
  NOT_CONFIGURED = 'PAYMENT_NOT_CONFIGURED',
  INVALID_ORDER_ID = 'INVALID_ORDER_ID',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EMAIL_CONNECTION_ERROR = 'EMAIL_CONNECTION_ERROR',
  TIMEOUT = 'TIMEOUT',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  ALREADY_COMPLETED = 'ALREADY_COMPLETED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  RECIPIENT_MISMATCH = 'RECIPIENT_MISMATCH',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  NOTE_MISMATCH = 'NOTE_MISMATCH',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class PaymentError extends Error {
  constructor(
    public code: PaymentErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

export type PaymentOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: PaymentError };

/**
 * Safe number parsing for payment amounts
 */
export function safeParseAmount(str: string | unknown): number | null {
  if (typeof str !== 'string') return null;
  const num = parseFloat(str);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Validate order ID format
 */
export function validateOrderId(orderId: unknown): orderId is string {
  if (typeof orderId !== 'string') return false;
  return /^[A-Z]{2}\d{6}$/.test(orderId);
}

/**
 * Validate CashApp tag format
 */
export function validateCashAppTag(tag: unknown): tag is string {
  if (typeof tag !== 'string') return false;
  return /^\$[a-zA-Z0-9_]+$/.test(tag);
}

/**
 * Convert PaymentError to standardized API response
 */
export function paymentErrorToResponse(error: unknown) {
  if (error instanceof PaymentError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
    };
  }

  return {
    error: error instanceof Error ? error.message : 'Unknown error',
    code: PaymentErrorCode.INTERNAL_ERROR,
  };
}
