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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
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

    const { data: bulkOrder, error: createError } = await supabase
      .from("bulk_orders")
      .insert({
        name,
        total_orders: orders.length,
        total_amount,
        csv_data: orders,
        status: "processing",
      })
      .select()
      .single();

    if (createError) throw createError;

    const orderPromises = orders.map((order: any) =>
      supabase.from("orders").insert({
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

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const bulkOrderId = url.searchParams.get("id");

    if (bulkOrderId) {
      const { data: bulkOrder, error: bulkError } = await supabase
        .from("bulk_orders")
        .select("*")
        .eq("id", bulkOrderId)
        .single();

      if (bulkError) throw bulkError;

      if (!bulkOrder) {
        return NextResponse.json(
          { error: "Bulk order not found" },
          { status: 404 }
        );
      }

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
      const { data, error } = await supabase
        .from("bulk_orders")
        .select("*")
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
