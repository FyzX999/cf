import { NextRequest, NextResponse } from "next/server";
import { checkCashAppPayment, getCashAppConfig } from "@/lib/cashapp";
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";

/**
 * POST /api/payments/cashapp
 * Check if a CashApp payment has been received
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    // Get CashApp config
    const config = getCashAppConfig();
    if (!config) {
      return NextResponse.json(
        { error: "CashApp is not configured" },
        { status: 503 }
      );
    }

    // Find the pending payment record
    const payment = await findPaymentByGatewayId(orderId);
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status === "completed") {
      return NextResponse.json({
        status: "completed",
        payment,
      });
    }

    // Check email for payment (ONLY method - no manual verification)
    console.log(`[CashApp API] Checking payment for order ${orderId}, amount $${payment.amount}`);
    const cashappPayment = await checkCashAppPayment(
      orderId,
      payment.amount,
      config
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
    console.error("CashApp payment check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check payment",
      },
      { status: 500 }
    );
  }
}
