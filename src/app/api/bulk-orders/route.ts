import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, orders, total_amount } = await request.json();

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "Orders required" },
        { status: 400 }
      );
    }

    // Create bulk order record
    const { data: bulkOrder, error: createError } = await supabase
      .from("bulk_orders")
      .insert({
        user_id: auth.sub,
        name,
        total_orders: orders.length,
        total_amount,
        csv_data: orders,
        status: "processing",
      })
      .select()
      .single();

    if (createError) throw createError;

    // Create individual orders asynchronously
    // (In production, use a queue system like Resend or Bull)
    const orderPromises = orders.map((order: any) =>
      supabase.from("orders").insert({
        user_id: auth.sub,
        service_id: order.service_id,
        service_name: order.service_name,
        platform: order.platform,
        quantity: order.quantity,
        link: order.link,
        total: order.total,
        delivery: order.delivery || "standard",
        status: "pending",
        public_id: `BULK-${bulkOrder.id.substring(0, 8)}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
      })
    );

    await Promise.all(orderPromises);

    return NextResponse.json({
      success: true,
      bulkOrderId: bulkOrder.id,
      message: `${orders.length} orders created`,
    });
  } catch (error) {
    console.error("Bulk order error:", error);
    return NextResponse.json(
      { error: "Failed to create bulk orders" },
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
    const bulkOrderId = url.searchParams.get("id");

    if (bulkOrderId) {
      // Get specific bulk order with its child orders
      const { data: bulkOrder, error: bulkError } = await supabase
        .from("bulk_orders")
        .select("*")
        .eq("id", bulkOrderId)
        .eq("user_id", auth.sub)
        .single();

      if (bulkError) throw bulkError;

      if (!bulkOrder) {
        return NextResponse.json(
          { error: "Bulk order not found" },
          { status: 404 }
        );
      }

      // Get child orders
      const { data: childOrders, error: childError } = await supabase
        .from("orders")
        .select("*")
        .filter("public_id", "like", `BULK-${bulkOrderId.substring(0, 8)}%`);

      if (childError) throw childError;

      return NextResponse.json({
        ...bulkOrder,
        orders: childOrders,
        completed_orders: childOrders?.filter(
          (o: any) => o.status === "completed"
        ).length,
      });
    } else {
      // Get all bulk orders for user
      const { data, error } = await supabase
        .from("bulk_orders")
        .select("*")
        .eq("user_id", auth.sub)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Bulk orders GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bulk orders" },
      { status: 500 }
    );
  }
}
