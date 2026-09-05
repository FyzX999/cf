import { appendAudit, readStore, updateSettings } from "@/lib/admin-store";
import { requireAdminApi } from "@/lib/require-admin";
import type { SiteSettings } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const store = await readStore();
  return NextResponse.json({ settings: store.settings });
}

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  
  try {
    const body = await req.json();
    
    // Ensure numeric fields are numbers
    const sanitized: Partial<SiteSettings> = {
      ...body,
      defaultMarkupMultiplier: Number(body.defaultMarkupMultiplier),
      resellerDiscountPercent: Number(body.resellerDiscountPercent),
      minOrderAmount: Number(body.minOrderAmount),
      baseOrderCount: body.baseOrderCount ? Number(body.baseOrderCount) : undefined,
      deliveryMultipliers: {
        standard: Number(body.deliveryMultipliers?.standard || 1),
        fast: Number(body.deliveryMultipliers?.fast || 1.35),
        drip: Number(body.deliveryMultipliers?.drip || 1.15)
      }
    };
    
    const store = await updateSettings(sanitized);
    await appendAudit("update_settings", "site");
    return NextResponse.json({ settings: store.settings });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 400 }
    );
  }
}