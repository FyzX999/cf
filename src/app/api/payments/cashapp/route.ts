import { NextRequest, NextResponse } from "next/server";
import { checkCashAppPayment, getCashAppConfig } from "@/lib/cashapp";
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";
import { PaymentError, PaymentErrorCode, paymentErrorToResponse, validateOrderId } from "@/lib/payment-errors";
import { withDeduplication } from "@/lib/payment-retry";

/**
 * POST /api/payments/cashapp
 * Check if a CashApp payment has been received
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    // Validate order ID format
    if (!validateOrderId(orderId)) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_ORDER_ID,
        'Invalid order ID format (expected: CFXXXXXX)',
        400
      );
    }

    // Get CashApp config
    const config = getCashAppConfig();
    if (!config) {
      console.error('[CashApp API] Config not found - check environment variables');
      throw new PaymentError(
        PaymentErrorCode.NOT_CONFIGURED,
        "CashApp is not configured",
        503
      );
    }

    console.log(`[CashApp API] Config loaded: email=${config.email}, host=${config.imapHost}:${config.imapPort}, tag=${config.cashappTag}`);

    // Find the pending payment record
    const payment = await findPaymentByGatewayId(orderId);
    if (!payment) {
      throw new PaymentError(
        PaymentErrorCode.NOT_FOUND,
        "Payment not found",
        404
      );
    }

    if (payment.status === "completed") {
      return NextResponse.json({
        status: "completed",
        message: "Payment already processed",
      });
    }

    // Check payment with retry logic
    const dedupKey = `cashapp-check-${orderId}`;
    const result = await withDeduplication(dedupKey, () =>
      checkCashAppPayment(orderId, Number((payment as any).amount), config as any)
    );

    if (!result || !(result as any).found) {
      return NextResponse.json({
        status: "pending",
        message: "Payment not found yet",
      });
    }

    // Settle the payment
    await settlePayment(payment);

    return NextResponse.json({
      status: "completed",
      message: "Payment processed successfully",
      orderId,
    });

  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json(
        error.toJSON(),
        { status: error.statusCode }
      );
    }
    
    console.error("[CashApp API] Unhandled error:", error);
    return NextResponse.json(
      paymentErrorToResponse(error),
      { status: 500 }
    );
  }
}


