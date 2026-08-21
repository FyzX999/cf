import { getOrder } from "@/lib/orders";
import { paymentConfig, startCheckout } from "@/lib/payments";
import { getAuthUser } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getCryptoMinAmount(): Promise<number> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) return 1.0;
  
  try {
    const mode = (process.env.NOWPAYMENTS_MODE || "live").toLowerCase();
    const base = mode === "sandbox" ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
    const res = await fetch(`${base}/v1/min-amount?currency_from=eth&currency_to=trx`, {
      headers: { "x-api-key": apiKey },
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) return 1.0;
    const json = (await res.json()) as { min_amount?: number };
    return Number(json.min_amount ?? 1.0);
  } catch {
    return 1.0;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    const body = (await req.json()) as {
      method?: "paypal" | "nowpayments";
      kind?: "order" | "wallet";
      publicId?: string;
      amount?: number;
    };
    const method = body.method ?? "nowpayments";
    const kind = body.kind;
    if (method !== "nowpayments") {
      return NextResponse.json({ error: "Only crypto checkout is enabled right now" }, { status: 400 });
    }
    const cfg = paymentConfig();
    if (!cfg.crypto) {
      return NextResponse.json({ error: "Crypto payments are not configured yet" }, { status: 400 });
    }

    const minAmount = await getCryptoMinAmount();

    if (kind === "wallet") {
      if (!user) return NextResponse.json({ error: "Sign in to add wallet funds" }, { status: 401 });
      const amount = Number(body.amount);
      if (!(amount >= minAmount)) {
        return NextResponse.json(
          { error: `Minimum crypto deposit is $${minAmount.toFixed(2)}` },
          { status: 400 }
        );
      }
      const result = await startCheckout({
        method,
        kind: "wallet",
        amount,
        userId: user.id,
      });
      return NextResponse.json({ url: result.url });
    }

    if (kind !== "order" || !body.publicId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }
    const order = await getOrder(body.publicId.toUpperCase());
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.paid) return NextResponse.json({ error: "Order is already paid" }, { status: 400 });

    if (order.total < minAmount) {
      return NextResponse.json(
        { 
          error: `This order total ($${order.total.toFixed(2)}) is below the crypto payment minimum of $${minAmount.toFixed(2)}. Please use wallet or gift card payment.` 
        },
        { status: 400 }
      );
    }

    const result = await startCheckout({
      method,
      kind: "order",
      amount: order.total,
      publicId: order.publicId,
      userId: user?.id,
    });
    return NextResponse.json({ url: result.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 400 },
    );
  }
}
