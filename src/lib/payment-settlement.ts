/**
 * Payment Settlement Utilities
 * Atomic operations to prevent race conditions
 */

import { writeStore, readStore } from './admin-store';
import type { PaymentRecord } from './types';
import { PaymentError, PaymentErrorCode } from './payment-errors';

/**
 * Atomically settle a payment - prevents race conditions
 * Returns: settled payment or null if already completed
 */
export async function atomicSettlePayment(
  record: PaymentRecord
): Promise<PaymentRecord | null> {
  let settled: PaymentRecord | null = null;
  let alreadyCompleted: PaymentRecord | null = null;

  // Use atomic write to check and update in one operation
  await writeStore((store) => {
    const existing = store.payments.find(
      (p) => p.id === record.id || p.gatewayId === record.gatewayId
    );

    if (existing?.status === 'completed') {
      alreadyCompleted = existing;
      return store; // No changes
    }

    // Mark as completed atomically
    settled = {
      ...(existing ?? record),
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    };

    const rest = store.payments.filter(
      (p) => p.id !== settled!.id && p.gatewayId !== settled!.gatewayId
    );

    return {
      ...store,
      payments: [settled, ...rest].slice(0, 500),
    };
  });

  if (alreadyCompleted) {
    console.log(`[Payment Settlement] Payment already completed: ${record.gatewayId}`);
    return alreadyCompleted;
  }

  if (!settled) {
    throw new PaymentError(
      PaymentErrorCode.SETTLEMENT_FAILED,
      'Failed to settle payment - could not update store',
      500
    );
  }

  return settled;
}

/**
 * Find payment with proper error handling
 */
export async function findPaymentSafely(gatewayId: string): Promise<PaymentRecord> {
  const store = await readStore();
  const payment = store.payments.find((p) => p.gatewayId === gatewayId);

  if (!payment) {
    throw new PaymentError(
      PaymentErrorCode.NOT_FOUND,
      `Payment not found for order ${gatewayId}`,
      404
    );
  }

  return payment;
}

/**
 * Validate payment can be settled
 */
export function validatePaymentForSettlement(payment: PaymentRecord): void {
  if (!payment) {
    throw new PaymentError(
      PaymentErrorCode.NOT_FOUND,
      'Payment record not found',
      404
    );
  }

  if (payment.status === 'completed') {
    throw new PaymentError(
      PaymentErrorCode.ALREADY_COMPLETED,
      'Payment already completed',
      400,
      { payment }
    );
  }

  if (!payment.amount || payment.amount <= 0) {
    throw new PaymentError(
      PaymentErrorCode.INVALID_AMOUNT,
      'Invalid payment amount',
      400,
      { amount: payment.amount }
    );
  }
}
