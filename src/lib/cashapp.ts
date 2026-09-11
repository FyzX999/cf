/**
 * DEPRECATED: Use @/lib/payment-methods/cashapp instead
 * This file is maintained for backward compatibility only.
 * 
 * Migration path:
 *   Old: import { checkCashAppPayment } from '@/lib/cashapp'
 *   New: import { checkCashAppPayment } from '@/lib/payment-methods/cashapp'
 */

export {
  checkCashAppPayment,
  getCashAppConfig,
  parseCashAppEmail,
  processUnseenCashAppPayments,
  type CashAppPayment,
  type CashAppConfig,
} from './payment-methods/cashapp';
