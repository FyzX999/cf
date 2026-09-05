import { newGiftCard, newPromoCode, upsertGiftCard, upsertPromo, listCommerce } from "@/lib/commerce";
import { requireAdminApi } from "@/lib/require-admin";
import { appendAudit, writeStore } from "@/lib/admin-store";
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
    count?: number;
  };
  try {
    if (body.kind === "promo" && body.promo) {
      const promo = await upsertPromo(newPromoCode(body.promo));
      await appendAudit("upsert_promo", promo.code);
      return NextResponse.json({ promo });
    }
    if (body.kind === "gift" && body.gift) {
      const count = body.count || 1;
      
      if (count > 1) {
        // Mass create gift cards
        const gifts: GiftCard[] = [];
        for (let i = 0; i < count; i++) {
          const gift = await upsertGiftCard(newGiftCard({ amount: body.gift.amount }));
          gifts.push(gift);
        }
        await appendAudit("create_gift_cards", `${count} cards`);
        return NextResponse.json({ gifts, count: gifts.length });
      } else {
        const gift = await upsertGiftCard(newGiftCard(body.gift));
        await appendAudit("create_gift_card", gift.code);
        return NextResponse.json({ gift });
      }
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

export async function DELETE(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  
  const body = (await req.json().catch(() => ({}))) as {
    kind?: "promo" | "gift";
    code?: string;
  };
  
  try {
    if (body.kind === "promo" && body.code) {
      await writeStore((store) => ({
        ...store,
        promoCodes: store.promoCodes.filter((p) => p.code !== body.code?.toUpperCase().trim())
      }));
      await appendAudit("delete_promo", body.code);
      return NextResponse.json({ success: true });
    }
    
    if (body.kind === "gift" && body.code) {
      await writeStore((store) => ({
        ...store,
        giftCards: store.giftCards.filter((g) => g.code !== body.code?.toUpperCase().trim())
      }));
      await appendAudit("delete_gift_card", body.code);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 400 });
  }
}