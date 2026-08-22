import { NextRequest, NextResponse } from "next/server";
import { requestPayout, getAffiliate } from "@/lib/affiliate";
import { requireAuth } from "@/lib/require-auth";
import { readStore } from "@/lib/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/payout
 * 
 * Request an affiliate payout
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Check if user is an affiliate
    const affiliate = await getAffiliate(user.id);
    if (!affiliate) {
      return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
    }

    const body = await request.json();
    const { amount, method, paymentDetails } = body;

    // Validate amount
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Validate method
    if (!method || !["wallet", "paypal", "crypto"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Request payout
    const result = await requestPayout(user.id, amount, method, paymentDetails);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      payout: result,
      message: "Payout requested successfully" 
    });
  } catch (error) {
    console.error("Affiliate payout error:", error);
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to request payout" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/affiliate/payout
 * 
 * Get user's payout history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    const store = await readStore();
    const payouts = store.affiliatePayouts.filter((p) => p.affiliateUserId === user.id);

    return NextResponse.json({ payouts });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to get payout history" },
      { status: 500 }
    );
  }
}
