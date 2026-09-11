import { NextRequest, NextResponse } from "next/server";
import { checkCashAppPayment, getCashAppConfig } from "@/lib/cashapp";
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";
import { PaymentError, paymentErrorToResponse, validateOrderId } from "@/lib/payment-errors";
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
        'INVALID_ORDER_ID',
        'Invalid order ID format (expected: CFXXXXXX)',
        400
      );
    }

    // Get CashApp config
    const config = getCashAppConfig();
    if (!config) {
      console.error('[CashApp API] Config not found - check environment variables');
      throw new PaymentError(
        'PAYMENT_NOT_CONFIGURED',
        "CashApp is not configured",
        503
      );
    }

    console.log(`[CashApp API] Config loaded: email=${config.email}, host=${config.imapHost}:${config.imapPort}, tag=${config.cashappTag}`);

    // Find the pending payment record
    const payment = await findPaymentByGatewayId(orderId);
    if (!payment) {
      throw new PaymentError(
        'PAYMENT_NOT_FOUND',
        "Payment not found",
        404
      );
    }

    if (payment.status === "completed") {
      return NextResponse.json({
        status: "completed",
        payment,
      });
    }

    // Check email for payment with deduplication to prevent duplicate checks
    console.log(`[CashApp API] Checking payment for order ${orderId}, amount $${payment.amount}`);
    
    const cashappPayment = await withDeduplication(
      `cashapp-check:${orderId}`,
      () => checkCashAppPayment(
        orderId,
        payment.amount,
        config
      )
    );

    if (!cashappPayment) {
      console.log(`[CashApp API] ❌ Payment not found for order ${orderId}`);
      return NextResponse.json({
        status: "pending",
        message: "Payment not yet received. Please wait for email confirmation (usually 5-7 minutes after payment).",
      });
    }

    console.log(`[CashApp API] ✅ Payment found for order ${orderId}, settling...`);

    // Settle the payment
    const settled = await settlePayment(payment);

    return NextResponse.json({
      status: "completed",
      payment: settled,
    });
  } catch (error) {
    console.error("[CashApp payment check error]:", error);
    
    const response = error instanceof PaymentError
      ? error.toJSON()
      : paymentErrorToResponse(error);
    
    const statusCode = error instanceof PaymentError ? error.statusCode : 500;
    return NextResponse.json(response, { status: statusCode });
  }
}
