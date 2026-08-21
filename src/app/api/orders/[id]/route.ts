import { cancelOrder, getOrder, payOrder, refillOrder } from "@/lib/orders";
import { getAuthUser } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const order = await getOrder(id.toUpperCase());
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    giftCardCode?: string;
    method?: string;
  };
  try {
    if (body.action === "pay") {
      const user = await getAuthUser();
      const gift = body.giftCardCode?.trim();
      const order = await payOrder({
        publicId: id.toUpperCase(),
        userId: user?.id,
        giftCardCode: gift,
        allowWallet: body.method === "wallet",
      });
      return NextResponse.json({ order });
    }
    if (body.action === "cancel") {
      await cancelOrder(id.toUpperCase());
      return NextResponse.json({ ok: true });
    }
    if (body.action === "refill") {
      const result = await refillOrder(id.toUpperCase());
      return NextResponse.json({ ok: true, refill: result.refill });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 400 },
    );
  }
}
