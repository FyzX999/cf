import { NextRequest, NextResponse } from "next/server";
import { checkCashAppPayment, getCashAppConfig, parseCashAppReceipt, isReceiptUsed, markReceiptUsed } from "@/lib/cashapp";
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";

/**
 * POST /api/payments/cashapp
 * Check if a CashApp payment has been received
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, receiptUrl } = body;

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

    // If receipt URL provided, verify it
    if (receiptUrl) {
      // Check if receipt already used
      if (isReceiptUsed(receiptUrl)) {
        return NextResponse.json(
          { error: "This receipt has already been used" },
          { status: 400 }
        );
      }

      try {
        cashappPayment = await parseCashAppReceipt(
          receiptUrl,
          orderId,
          payment.amount
        );

        if (!cashappPayment) {
          return NextResponse.json(
            { error: "Receipt does not match order details (check amount and note)" },
            { status: 400 }
          );
        }

        // Mark receipt as used
        markReceiptUsed(receiptUrl, orderId);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid receipt URL" },
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
