import { newGiftCard, newPromoCode, upsertGiftCard, upsertPromo, listCommerce } from "@/lib/commerce";
import { requireAdminApi } from "@/lib/require-admin";
import { appendAudit } from "@/lib/admin-store";
import { NextResponse } from "next/server";
import type { GiftCard, PromoCode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const data = await listCommerce();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    kind?: "promo" | "gift";
    promo?: Partial<PromoCode> & Pick<PromoCode, "code" | "type" | "value">;
    gift?: { code?: string; amount: number };
  };
  try {
    if (body.kind === "promo" && body.promo) {
      const promo = await upsertPromo(newPromoCode(body.promo));
      await appendAudit("upsert_promo", promo.code);
      return NextResponse.json({ promo });
    }
    if (body.kind === "gift" && body.gift) {
      const gift = await upsertGiftCard(newGiftCard(body.gift));
      await appendAudit("create_gift_card", gift.code);
      return NextResponse.json({ gift });
    }
    return NextResponse.json({ error: "kind must be promo or gift" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    kind?: "promo" | "gift";
    promo?: PromoCode;
    gift?: GiftCard;
  };
  if (body.kind === "promo" && body.promo) {
    const promo = await upsertPromo(body.promo);
    return NextResponse.json({ promo });
  }
  if (body.kind === "gift" && body.gift) {
    const gift = await upsertGiftCard(body.gift);
    return NextResponse.json({ gift });
  }
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
