import { cancelOrder, createOrder, getOrder, refillOrder } from "@/lib/orders";
import { getLiveCatalog } from "@/lib/live-catalog";
import { getWallet, lookupApiKey } from "@/lib/commerce";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireKey(form: FormData) {
  const key = String(form.get("key") || "");
  if (!key) return { error: NextResponse.json({ error: "API key is required" }, { status: 401 }) };
  const account = await lookupApiKey(key);
  if (!account) return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  return { account };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const action = String(form.get("action") || "");
  const auth = await requireKey(form);
  if ("error" in auth && auth.error) return auth.error;
  const { account } = auth as { account: { userId: string; balance: number } };

  if (action === "services") {
    const services = await getLiveCatalog({ publicOnly: true });
    return NextResponse.json(
      services.map((s) => ({
        service: s.id,
        name: s.name,
        type: "Default",
        category: `${s.platform} | ${s.category}`,
        rate: s.ratePerThousand.toFixed(4),
        min: String(s.min),
        max: String(s.max),
        refill: s.refill,
        cancel: true,
      })),
    );
  }

  if (action === "balance") {
    const wallet = await getWallet(account.userId);
    return NextResponse.json({ balance: wallet.balance.toFixed(2), currency: "USD" });
  }

  if (action === "add") {
    try {
      const serviceId = String(form.get("service"));
      const order = await createOrder({
        serviceId,
        link: String(form.get("link") || ""),
        quantity: Number(form.get("quantity")),
        delivery: "standard",
        userId: account.userId,
        payNow: true,
      });
      if (!order) throw new Error("Order could not be created");
      return NextResponse.json({ order: order.publicId });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "add failed" },
        { status: 400 },
      );
    }
  }

  if (action === "status") {
    const ids = String(form.get("orders") || form.get("order") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (!ids.length) return NextResponse.json({ error: "Incorrect order ID" });
    if (ids.length === 1 && !form.get("orders")) {
      const order = await getOrder(ids[0]);
      if (!order) return NextResponse.json({ error: "Incorrect order ID" });
      return NextResponse.json({
        charge: order.total.toFixed(4),
        start_count: "0",
        status: order.paid ? order.status : "Pending",
        remains: String(order.quantity - order.delivered),
        currency: "USD",
      });
    }
    const entries = await Promise.all(
      ids.map(async (id) => {
        const order = await getOrder(id);
        return [
          id,
          order
            ? {
                charge: order.total.toFixed(4),
                start_count: "0",
                status: order.paid ? order.status : "Pending",
                remains: String(order.quantity - order.delivered),
                currency: "USD",
              }
            : { error: "Incorrect order ID" },
        ] as const;
      }),
    );
    return NextResponse.json(Object.fromEntries(entries));
  }

  if (action === "refill") {
    try {
      const ids = String(form.get("orders") || form.get("order") || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length === 1 && !form.get("orders")) {
        const result = await refillOrder(ids[0]);
        return NextResponse.json({ refill: String(result.refill) });
      }
      const rows = await Promise.all(
        ids.map(async (id) => {
          try {
            const result = await refillOrder(id);
            return { order: id, refill: result.refill };
          } catch (error) {
            return {
              order: id,
              refill: { error: error instanceof Error ? error.message : "refill failed" },
            };
          }
        }),
      );
      return NextResponse.json(rows);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "refill failed" },
        { status: 400 },
      );
    }
  }

  if (action === "cancel") {
    const ids = String(form.get("orders") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const rows = await Promise.all(
      ids.map(async (id) => {
        try {
          await cancelOrder(id);
          return { order: id, cancel: 1 };
        } catch (error) {
          return {
            order: id,
            cancel: { error: error instanceof Error ? error.message : "cancel failed" },
          };
        }
      }),
    );
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
