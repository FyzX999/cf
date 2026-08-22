import { NextRequest, NextResponse } from "next/server";
import { getAffiliateStats, getAffiliate } from "@/lib/affiliate";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/affiliate/stats
 * 
 * Get affiliate statistics and dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Check if user is an affiliate
    const affiliate = await getAffiliate(user.id);
    if (!affiliate) {
      return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
    }

    // Get comprehensive stats
    const stats = await getAffiliateStats(user.id);
    
    if (!stats) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      affiliate,
      stats 
    });
  } catch (error) {
    console.error("Affiliate stats error:", error);
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to get affiliate stats" },
      { status: 500 }
    );
  }
}
