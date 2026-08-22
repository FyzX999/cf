import { NextRequest, NextResponse } from "next/server";
import { createAffiliate, getAffiliate } from "@/lib/affiliate";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/signup
 * 
 * Create a new affiliate account for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Check if already an affiliate
    const existing = await getAffiliate(user.id);
    if (existing) {
      return NextResponse.json({ affiliate: existing });
    }

    // Create new affiliate account
    const affiliate = await createAffiliate(user.id);

    return NextResponse.json({ 
      affiliate,
      message: "Affiliate account created successfully"
    });
  } catch (error) {
    console.error("Affiliate signup error:", error);
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create affiliate account" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/affiliate/signup
 * 
 * Get current user's affiliate account
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const affiliate = await getAffiliate(user.id);

    if (!affiliate) {
      return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
    }

    return NextResponse.json({ affiliate });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to get affiliate account" },
      { status: 500 }
    );
  }
}
