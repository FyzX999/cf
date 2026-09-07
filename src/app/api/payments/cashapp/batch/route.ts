import { NextRequest, NextResponse } from "next/server";
import { processUnseenCashAppPayments, getCashAppConfig, type CashAppPayment } from "@/lib/cashapp";
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";

/**
 * POST /api/payments/cashapp/batch
 * Process all UNSEEN CashApp payment emails and trigger webhooks
 * Only marks emails as SEEN after successful webhook firing
 */
export async function POST(req: NextRequest) {
  try {
    // Get CashApp config
    const config = getCashAppConfig();
    if (!config) {
      console.error('[CashApp Batch API] Config not found - check environment variables');
      return NextResponse.json(
        { error: "CashApp is not configured" },
        { status: 503 }
      );
    }

    console.log(`[CashApp Batch API] Starting batch processing with config: email=${config.email}, host=${config.imapHost}:${config.imapPort}, tag=${config.cashappTag}`);

    // Define webhook callback that settles payments
    const webhookCallback = async (payment: CashAppPayment): Promise<boolean> => {
      try {
        console.log(`[CashApp Batch API] Webhook fired for order ${payment.note}, amount $${payment.amount}`);

        // Find the pending payment record by order ID (note field)
        const paymentRecord = await findPaymentByGatewayId(payment.note);
        
        if (!paymentRecord) {
          console.log(`[CashApp Batch API] ⚠️ No payment record found for order ${payment.note} - might be duplicate or manual payment`);
          return true; // Mark as success to avoid reprocessing (no pending order)
        }

        if (paymentRecord.status === "completed") {
          console.log(`[CashApp Batch API] ℹ️ Payment already completed for order ${payment.note}`);
          return true; // Already processed, mark as success
        }

        // Verify amount matches
        if (Math.abs(paymentRecord.amount - payment.amount) >= 0.01) {
          console.log(`[CashApp Batch API] ❌ Amount mismatch for order ${payment.note}: expected $${paymentRecord.amount}, got $${payment.amount}`);
          return false; // Amount mismatch - don't mark as SEEN, might need manual review
        }

        // Settle the payment
        console.log(`[CashApp Batch API] Settling payment for order ${payment.note}...`);
        await settlePayment(paymentRecord);
        
        console.log(`[CashApp Batch API] ✅ Successfully settled payment for order ${payment.note}`);
        return true;

      } catch (error) {
        console.error(`[CashApp Batch API] Webhook error for order ${payment.note}:`, error);
        return false; // Webhook failed - don't mark as SEEN
      }
    };

    // Process all UNSEEN emails
    const stats = await processUnseenCashAppPayments(config, webhookCallback);

    console.log(`[CashApp Batch API] Batch processing complete:`, stats);

    return NextResponse.json({
      success: true,
      stats: {
        processed: stats.processed,
        succeeded: stats.succeeded,
        failed: stats.failed,
        message: `Processed ${stats.processed} emails: ${stats.succeeded} succeeded, ${stats.failed} failed (left as UNSEEN for retry)`
      }
    });

  } catch (error) {
    console.error("[CashApp Batch API] Batch processing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process batch",
      },
      { status: 500 }
    );
  }
}