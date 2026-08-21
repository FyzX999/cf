import { claimGuestOrders, createOrder, listOrdersForUser } from "@/lib/orders";
import { getAuthUser } from "@/lib/supabase-server";
import type { DeliverySpeed } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view your orders", orders: [] }, { status: 401 });
  }
  const orders = await listOrdersForUser(user.id);
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    const body = (await req.json()) as {
      serviceId?: string;
      link?: string;
      quantity?: number;
      delivery?: DeliverySpeed;
      claimIds?: string[];
      promoCode?: string;
    };
    if (body.claimIds?.length && user) {
      const claimed = await claimGuestOrders(user.id, body.claimIds);
      return NextResponse.json({ claimed });
    }
    const order = await createOrder({
      serviceId: String(body.serviceId),
      link: String(body.link ?? ""),
      quantity: Number(body.quantity),
      delivery: body.delivery ?? "standard",
      userId: user?.id,
      userEmail: user?.email ?? undefined,
      promoCode: body.promoCode,
    });
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order failed" },
      { status: 400 },
    );
  }
}
