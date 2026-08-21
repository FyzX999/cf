import { findPromo, previewPromo } from "@/lib/commerce";
import { calcPrice } from "@/lib/catalog";
import { getLiveServiceById } from "@/lib/live-catalog";
import { readStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    serviceId?: string;
    quantity?: number;
    delivery?: "standard" | "fast" | "drip";
  };
  const code = String(body.code || "");
  const promo = await findPromo(code);
  if (!promo) return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
  try {
    const store = await readStore();
    const service = body.serviceId ? await getLiveServiceById(body.serviceId) : null;
    const base = service
      ? calcPrice(service.ratePerThousand, Number(body.quantity || service.min), body.delivery ?? "standard", store.settings.deliveryMultipliers)
      : 0;
    const total = service ? previewPromo(base, promo) : null;
    return NextResponse.json({
      ok: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      total,
      original: service ? base : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Promo failed" }, { status: 400 });
  }
}
