/**
 * Payment Review Queue
 * Routes unmatched CashApp emails to manual review instead of discarding them
 */

import { readStore, writeStore } from './admin-store';

export interface UnmatchedPayment {
  id: string;
  rawEmail: {
    subject: string;
    from: string;
    date: string;
    htmlSnippet: string; // First 2000 chars of HTML
  };
  extractedData: {
    amount?: number;
    note?: string;
    recipient?: string;
  };
  reason: string; // Why it didn't match (e.g., "Note extraction failed")
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: string;
}

/**
 * Add an unmatched payment to the review queue
 * Called when IMAP detects a payment email but extraction fails
 */
export async function queueUnmatchedPayment(data: {
  subject: string;
  from: string;
  date: Date;
  htmlSnippet: string;
  extractedData?: {
    amount?: number;
    note?: string;
    recipient?: string;
  };
  reason: string;
}): Promise<void> {
  const unmatchedPayment: UnmatchedPayment = {
    id: `unmatch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    rawEmail: {
      subject: data.subject,
      from: data.from,
      date: data.date.toISOString(),
      htmlSnippet: data.htmlSnippet,
    },
    extractedData: data.extractedData || {},
    reason: data.reason,
    createdAt: new Date().toISOString(),
  };

  console.log(`[Payment Review Queue] Adding unmatched payment: ${unmatchedPayment.id}`);
  console.log(`[Payment Review Queue] Reason: ${data.reason}`);

  await writeStore((store) => {
    // Initialize unmatchedPayments array if it doesn't exist
    const payments = (store as any).unmatchedPayments || [];
    
    // Add new unmatched payment
    const updated = [unmatchedPayment, ...payments].slice(0, 100); // Keep last 100
    
    return {
      ...store,
      unmatchedPayments: updated,
    } as any;
  });
}

/**
 * Get all unmatched payments awaiting review
 */
export async function getUnmatchedPayments(): Promise<UnmatchedPayment[]> {
  const store = await readStore();
  return ((store as any).unmatchedPayments || []) as UnmatchedPayment[];
}

/**
 * Mark an unmatched payment as reviewed
 */
export async function markPaymentAsReviewed(
  id: string,
  resolution: string,
  reviewedBy: string = 'admin'
): Promise<void> {
  await writeStore((store) => {
    const payments = ((store as any).unmatchedPayments || []) as UnmatchedPayment[];
    const updated = payments.map((p) =>
      p.id === id
        ? {
            ...p,
            reviewedAt: new Date().toISOString(),
            reviewedBy,
            resolution,
          }
        : p
    );
    return {
      ...store,
      unmatchedPayments: updated,
    } as any;
  });

  console.log(
    `[Payment Review Queue] Marked ${id} as reviewed: ${resolution}`
  );
}

/**
 * Get stats on unmatched payments
 */
export async function getUnmatchedPaymentStats(): Promise<{
  total: number;
  pending: number;
  reviewed: number;
  byReason: Record<string, number>;
}> {
  const payments = await getUnmatchedPayments();
  
  const byReason: Record<string, number> = {};
  let pending = 0;
  let reviewed = 0;

  payments.forEach((p) => {
    byReason[p.reason] = (byReason[p.reason] || 0) + 1;
    if (p.reviewedAt) reviewed++;
    else pending++;
  });

  return {
    total: payments.length,
    pending,
    reviewed,
    byReason,
  };
}
