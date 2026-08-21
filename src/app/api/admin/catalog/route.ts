import { appendAudit, readStore, updateServiceOverrides } from "@/lib/admin-store";
import { getLiveCatalog, profitPerThousand } from "@/lib/live-catalog";
import { isProviderConfigured, listProviderServicesCached } from "@/lib/provider";
import { matchProviderService } from "@/lib/provider-map";
import { requireAdminApi } from "@/lib/require-admin";
import type { ServiceOverride } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const store = await readStore();
  let provider: Awaited<ReturnType<typeof listProviderServicesCached>> = [];
  let configured = false;
  try {
    configured = isProviderConfigured();
    if (configured) provider = await listProviderServicesCached();
  } catch {
    configured = isProviderConfigured();
  }

  const catalog = await getLiveCatalog();
  const mapped = catalog.map((service) => {
    const matched = provider.length ? matchProviderService(service, provider) : null;
    return {
      ...service,
      profitPerThousand: profitPerThousand(service),
      providerName: matched?.name ?? null,
      providerRate: matched?.rate ?? null,
      liveCost: matched ? Number(matched.rate) : null,
      suggestedProviderId: matched?.service ?? null,
    };
  });

  return NextResponse.json({
    configured,
    settings: store.settings,
    services: mapped,
    providerCount: provider.length,
  });
}

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await req.json()) as { services?: Record<string, ServiceOverride> };
  if (!body.services || typeof body.services !== "object") {
    return NextResponse.json({ error: "services object is required" }, { status: 400 });
  }
  await updateServiceOverrides(body.services);
  await appendAudit("update_catalog", `${Object.keys(body.services).length} services`);
  const catalog = await getLiveCatalog();
  return NextResponse.json({
    services: catalog.map((service) => ({
      ...service,
      profitPerThousand: profitPerThousand(service),
    })),
  });
}
