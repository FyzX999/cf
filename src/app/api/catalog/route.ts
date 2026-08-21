import { platforms } from "@/lib/catalog";
import { getLiveCatalog } from "@/lib/live-catalog";
import { readStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [services, store] = await Promise.all([getLiveCatalog({ publicOnly: true }), readStore()]);
  return NextResponse.json({
    services,
    platforms,
    settings: {
      deliveryMultipliers: store.settings.deliveryMultipliers,
      guestCheckout: store.settings.guestCheckout,
      maintenanceMode: store.settings.maintenanceMode,
      minOrderAmount: store.settings.minOrderAmount,
      announcement: store.settings.announcement,
      tagline: store.settings.tagline,
      siteName: store.settings.siteName,
      currency: store.settings.currency,
    },
  });
}
