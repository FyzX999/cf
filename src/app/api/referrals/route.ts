import { createClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";
import { isValidAdminSession, adminCookieName } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get user from auth cookie
async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get(adminCookieName())?.value;
  if (!token || !(await isValidAdminSession(token))) {
    return null;
  }
  return { authenticated: true };
}

// Generate unique referral code
function generateReferralCode(): string {
  return `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, referral_code } = await request.json();

    if (action === "create") {
      const code = generateReferralCode();

      const { data, error } = await supabase
        .from("referrals")
        .insert({
          referral_code: code,
          status: "active",
          commission_rate: 10.0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (action === "claim") {
      const { data: referral, error: refError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referral_code", referral_code)
        .single();

      if (refError || !referral) {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("referrals")
        .update({
          status: "active",
          uses: (referral.uses || 0) + 1,
        })
        .eq("id", referral.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: "Referral claimed! Get 10% commission on your purchases.",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Referral error:", error);
    return NextResponse.json(
      { error: "Failed to process referral" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "code") {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === "commissions") {
      const { data, error } = await supabase
        .from("referral_commissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const totals = {
        earned: 0,
        paid: 0,
        pending: 0,
      };

      data.forEach((c: any) => {
        if (c.status === "earned") totals.earned += parseFloat(c.amount);
        else if (c.status === "paid") totals.paid += parseFloat(c.amount);
        else if (c.status === "pending") totals.pending += parseFloat(c.amount);
      });

      return NextResponse.json({ commissions: data, totals });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}
