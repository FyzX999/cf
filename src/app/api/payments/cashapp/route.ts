import { NextRequest, NextResponse } from "next/server";
import { checkCashAppPayment, getCashAppConfig, verifyCashAppTransaction, isTransactionUsed, markTransactionUsed } from "@/lib/cashapp";
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";

/**
 * POST /api/payments/cashapp
 * Check if a CashApp payment has been received
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, transactionId } = body; // Changed from receiptUrl to transactionId

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

    let cashappPayment = null;

    // If transaction ID provided, verify it manually
    if (transactionId && transactionId.trim()) {
      try {
        cashappPayment = await verifyCashAppTransaction(
          transactionId,
          orderId,
          payment.amount
        );

        if (!cashappPayment) {
          return NextResponse.json(
            { error: "Invalid transaction ID" },
            { status: 400 }
          );
        }

        // Mark transaction as used
        markTransactionUsed(transactionId, orderId);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid transaction ID" },
          { status: 400 }
        );
      }
    } else {
      // Check email for payment (original method)
      cashappPayment = await checkCashAppPayment(
        orderId,
        payment.amount,
        config
      );

      if (!cashappPayment) {
        return NextResponse.json({
          status: "pending",
          message: "Payment not yet received",
        });
      }
    }

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
