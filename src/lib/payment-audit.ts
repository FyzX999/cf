/**
 * Payment Audit Logging
 * Tracks critical payment operations for compliance and debugging
 */

import { createServiceSupabase } from './supabase';
import { appendAudit } from './admin-store';

export interface PaymentAuditEvent {
  action:
    | 'payment_created'
    | 'payment_verified'
    | 'payment_settled'
    | 'payment_failed'
    | 'payment_cancelled'
    | 'payment_check_requested'
    | 'payment_check_completed'
    | 'payment_check_failed';
  orderId: string;
  amount: number;
  provider: string;
  status: string;
  details?: Record<string, any>;
  error?: string;
  userId?: string;
}

/**
 * Log a payment audit event
 */
export async function logPaymentAudit(event: PaymentAuditEvent): Promise<void> {
  try {
    // Log to Supabase if available
    const db = createServiceSupabase();
    if (db) {
      await db.from('payment_audit').insert({
        action: event.action,
        order_id: event.orderId,
        amount: event.amount,
        provider: event.provider,
        status: event.status,
        details: event.details ? JSON.stringify(event.details) : null,
        error: event.error || null,
        user_id: event.userId || null,
        created_at: new Date().toISOString(),
      });
    }

    // Also log to admin audit trail
    const auditAction = `${event.action}:${event.orderId}`;
    const auditTarget = `${event.provider}:${event.amount}`;
    await appendAudit(auditAction, auditTarget, event.userId || 'system');
  } catch (error) {
    console.error('[PaymentAudit] Failed to log event:', error);
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Log payment creation
 */
export async function logPaymentCreated(
  orderId: string,
  amount: number,
  provider: string,
  userId?: string
): Promise<void> {
  await logPaymentAudit({
    action: 'payment_created',
    orderId,
    amount,
    provider,
    status: 'pending',
    userId,
  });
}

/**
 * Log payment verification
 */
export async function logPaymentVerified(
  orderId: string,
  amount: number,
  provider: string,
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  await logPaymentAudit({
    action: 'payment_verified',
    orderId,
    amount,
    provider,
    status: 'verified',
    details,
    userId,
  });
}

/**
 * Log payment settlement
 */
export async function logPaymentSettled(
  orderId: string,
  amount: number,
  provider: string,
  userId?: string
): Promise<void> {
  await logPaymentAudit({
    action: 'payment_settled',
    orderId,
    amount,
    provider,
    status: 'completed',
    userId,
  });
}

/**
 * Log payment failure
 */
export async function logPaymentFailed(
  orderId: string,
  amount: number,
  provider: string,
  error: string,
  userId?: string
): Promise<void> {
  await logPaymentAudit({
    action: 'payment_failed',
    orderId,
    amount,
    provider,
    status: 'failed',
    error,
    userId,
  });
}

/**
 * Log payment check request
 */
export async function logPaymentCheckRequested(
  orderId: string,
  provider: string,
  userId?: string
): Promise<void> {
  await logPaymentAudit({
    action: 'payment_check_requested',
    orderId,
    amount: 0,
    provider,
    status: 'checking',
    userId,
  });
}
