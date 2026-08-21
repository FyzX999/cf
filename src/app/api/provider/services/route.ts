import { isGodofPanelConfigured, listProviderServicesCached } from "@/lib/provider";
import { mappedCatalogServices } from "@/lib/provider-map";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isGodofPanelConfigured()) {
    return NextResponse.json({ configured: false, services: [], mapped: [] });
  }
  try {
    const [services, mapped] = await Promise.all([
      listProviderServicesCached(),
      mappedCatalogServices(),
    ]);
    return NextResponse.json({ configured: true, services, mapped });
  } catch (error) {
    return NextResponse.json(
      { configured: true, error: error instanceof Error ? error.message : "Provider error" },
      { status: 502 },
    );
  }
}
