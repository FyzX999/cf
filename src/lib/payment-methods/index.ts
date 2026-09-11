/**
 * Payment Methods - Unified Export Layer
 * 
 * This file re-exports all payment provider functionality for backward compatibility.
 * Each payment method (CashApp, PayPal, Crypto) has its own folder with isolated logic.
 * 
 * Folder Structure:
 * - cashapp/     CashApp email-based payments
 * - paypal/      PayPal integration
 * - crypto/      NOWPayments crypto integration
 * - shared/      Shared utilities (constants, errors, matching, retry logic)
 */

// CashApp exports
export { 
  checkCashAppPayment, 
  getCashAppConfig, 
  parseCashAppEmail, 
  processUnseenCashAppPayments,
  type CashAppPayment,
  type CashAppConfig
} from './cashapp';

// Shared utilities for all payment methods
export {
  // Payment constants
  PAYMENT_VALIDATION,
  CASHAPP_PATTERNS,
  PAYMENT_STATUS,
  IMAP_CONFIG,
  RETRY_CONFIG,
  DEDUP_CONFIG,
  type PaymentStatus,
} from './shared/payment-constants';

export {
  // Payment errors
  PaymentError,
  PaymentErrorCode,
  type PaymentOperationResult,
  safeParseAmount,
  validateOrderId,
  validateCashAppTag,
  paymentErrorToResponse,
} from './shared/payment-errors';

export {
  // Payment matching & fuzzy logic
  levenshteinDistance,
  normalizeOrderId,
  fuzzyMatchOrderId,
  dollarsToCents,
  centsToDollars,
  matchAmount,
  matchPayment,
  logPaymentMatchDetails,
} from './shared/payment-matching';

export {
  // Retry and deduplication
  sleep,
  calculateBackoff,
  retryWithBackoff,
  paymentCheckCache,
  withDeduplication,
} from './shared/payment-retry';

export {
  // Review queue for unmatched payments
  queueUnmatchedPayment,
  getUnmatchedPayments,
  markPaymentAsReviewed,
  getUnmatchedPaymentStats,
  type UnmatchedPayment,
} from './shared/payment-review-queue';
