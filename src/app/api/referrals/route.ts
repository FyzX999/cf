import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate unique referral code
function generateReferralCode(): string {
  return `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "create") {
      // Create referral code for current user
      const code = generateReferralCode();

      const { data, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: auth.sub,
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
      // Claim referral by code
      const { referral_code } = await request.json();

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

      // Update referral with referred user
      const { error: updateError } = await supabase
        .from("referrals")
        .update({
          referred_user_id: auth.sub,
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

export async function GET(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "code") {
      // Get user's referral codes
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", auth.sub)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === "commissions") {
      // Get user's earned commissions
      const { data, error } = await supabase
        .from("referral_commissions")
        .select("*, orders(public_id, total, service_name)")
        .eq("referrer_id", auth.sub)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate totals
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
