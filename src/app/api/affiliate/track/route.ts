import { NextRequest, NextResponse } from "next/server";
import { trackReferral } from "@/lib/affiliate";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/affiliate/track
 * 
 * Track a referral signup (called when user signs up with referral code)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, userId } = body;

    if (!referralCode || !userId) {
      return NextResponse.json(
        { error: "Missing referralCode or userId" },
        { status: 400 }
      );
    }

    const referral = await trackReferral(referralCode, userId);

    if (!referral) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      referral,
      message: "Referral tracked successfully"
    });
  } catch (error) {
    console.error("Track referral error:", error);
    return NextResponse.json(
      { error: "Failed to track referral" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/affiliate/track?ref=CODE
 * 
 * Set referral cookie when user clicks affiliate link
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get("ref");

    if (!ref) {
      return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 });
    }

    // Set cookie for 30 days
    const cookieStore = await cookies();
    cookieStore.set("affiliate_ref", ref, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return NextResponse.json({ 
      message: "Referral tracked",
      ref 
    });
  } catch (error) {
    console.error("Set referral cookie error:", error);
    return NextResponse.json(
      { error: "Failed to set referral cookie" },
      { status: 500 }
    );
  }
}
