import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';
import { findPaymentByGatewayId, settlePayment } from "@/lib/payments";

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(adminCookieName())?.value;
  const isValid = await isValidAdminSession(token);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const orderId = id.toUpperCase();
    
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