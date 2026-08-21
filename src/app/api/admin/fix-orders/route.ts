import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Admin endpoint to fix stuck orders that were paid but status wasn't updated
export async function POST(req: Request) {
  try {
    const { adminKey } = (await req.json()) as { adminKey?: string };
    
    // Simple auth check
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServiceSupabase();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Find orders that are pending but were created more than 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuck, error: fetchError } = await db
      .from("orders")
      .select("public_id, status, paid, provider_order_id, total, created_at")
      .eq("status", "pending")
      .or("paid.is.null,paid.eq.false")
      .lt("created_at", tenMinutesAgo)
      .limit(100);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!stuck || stuck.length === 0) {
      return NextResponse.json({ fixed: 0, message: "No stuck orders found" });
    }

    // For each stuck order, check if it should be marked as paid
    // (If it has small total below crypto minimum, it was likely paid via wallet but update failed)
    const toFix = stuck.filter((order) => {
      // Orders with very small totals (<$0.50) were likely wallet-paid
      return order.total < 0.5;
    });

    const fixed: string[] = [];
    
    for (const order of toFix) {
      // Mark as paid and processing
      const { error: updateError } = await db
        .from("orders")
        .update({
          paid: true,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("public_id", order.public_id);

      if (!updateError) {
        fixed.push(order.public_id);
      }
    }

    return NextResponse.json({
      fixed: fixed.length,
      orderIds: fixed,
      message: `Fixed ${fixed.length} stuck orders`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fix failed" },
      { status: 500 }
    );
  }
}
