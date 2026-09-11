import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const publicId = url.searchParams.get("publicId");

    let query = supabase.from("order_progress").select("*");

    if (orderId) {
      query = query.eq("order_id", orderId);
    } else if (publicId) {
      // Get order ID from public_id first
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("public_id", publicId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      query = query.eq("order_id", order.id);
    } else {
      return NextResponse.json(
        { error: "orderId or publicId required" },
        { status: 400 }
      );
    }

    const { data, error } = await query.single();

    if (error) {
      // Return default progress if not found
      return NextResponse.json({
        progress_percent: 0,
        current_delivered: 0,
        target_quantity: 0,
        status: "pending",
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Order progress error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { orderId, current_delivered, target_quantity, estimated_completion_at } =
      await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId required" },
        { status: 400 }
      );
    }

    // Calculate progress
    const progress_percent = Math.round(
      (current_delivered / target_quantity) * 100
    );

    // Upsert order progress
    const { data, error } = await supabase
      .from("order_progress")
      .upsert(
        {
          order_id: orderId,
          current_delivered,
          target_quantity,
          progress_percent,
          estimated_completion_at,
          last_update_at: new Date().toISOString(),
        },
        { onConflict: "order_id" }
      )
      .select()
      .single();

    if (error) throw error;

    // Also update the order's delivered count
    await supabase
      .from("orders")
      .update({ delivered: current_delivered })
      .eq("id", orderId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Order progress update error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
