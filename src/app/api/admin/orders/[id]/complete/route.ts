import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";

/**
 * Verify admin authentication
 */
async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(adminCookieName())?.value;
  const isValid = await isValidAdminSession(token);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * POST /api/admin/orders/[id]/complete
 * Manually mark a CashApp payment as completed (admin override)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const orderId = params.id.toUpperCase();
    
    // Find the pending payment
    const payment = await findPaymentByGatewayId(orderId);
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status === "completed") {
      return NextResponse.json({
        message: "Payment already completed",
        payment,
      });
    }

    // Settle the payment
    const settled = await settlePayment(payment);

    return NextResponse.json({
      message: "Payment manually completed",
      payment: settled,
    });
  } catch (error) {
    console.error("Manual payment completion error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to complete payment",
      },
      { status: 500 }
    );
  }
}
