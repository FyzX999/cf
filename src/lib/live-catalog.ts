import { services as seedServices } from "./catalog";
import { readStore } from "./admin-store";
import type { Service, ServiceOverride, SiteSettings } from "./types";

export function retailFromCost(cost: number, multiplier: number) {
  return Number((cost * multiplier).toFixed(4));
}

export function applyServiceOverride(seed: Service, override: ServiceOverride | undefined, settings: SiteSettings): Service {
  const patch = Object.fromEntries(
    Object.entries(override ?? {}).filter(([, value]) => value !== undefined),
  ) as ServiceOverride;
  const merged: Service = {
    ...seed,
    ...patch,
    providerServiceId: patch.providerServiceId === undefined ? seed.providerServiceId : patch.providerServiceId,
  };
  const cost = Number(merged.costPerThousand);
  const multiplier = Number(
    patch.markupMultiplier ?? settings.defaultMarkupMultiplier ?? seed.markupMultiplier ?? 1.8,
  );
  merged.markupMultiplier = Number(multiplier.toFixed(4));
  merged.priceMode = patch.priceMode ?? seed.priceMode ?? "multiplier";
  if (merged.priceMode === "multiplier") {
    merged.ratePerThousand = retailFromCost(cost, merged.markupMultiplier);
  } else {
    merged.ratePerThousand = Number(Number(patch.ratePerThousand ?? seed.ratePerThousand).toFixed(4));
    if (cost > 0) merged.markupMultiplier = Number((merged.ratePerThousand / cost).toFixed(4));
  }
  return merged;
}

export async function getLiveCatalog(opts?: { publicOnly?: boolean }): Promise<Service[]> {
  const store = await readStore();
  const list = seedServices.map((seed) => applyServiceOverride(seed, store.services[seed.id], store.settings));
  if (opts?.publicOnly) return list.filter((s) => s.visible && s.active);
  return list;
}

export async function getLiveServiceById(id: string) {
  const list = await getLiveCatalog();
  return list.find((s) => s.id === id) ?? null;
}

export async function getLiveService(platform: string, slug: string) {
  const list = await getLiveCatalog({ publicOnly: true });
  return list.find((s) => s.platform === platform && s.slug === slug) ?? null;
}

export async function getLiveServicesByPlatform(slug: string) {
  const list = await getLiveCatalog({ publicOnly: true });
  return list.filter((s) => s.platform === slug);
}

export async function searchLiveServices(query: string) {
  const list = await getLiveCatalog({ publicOnly: true });
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((s) => `${s.name} ${s.category} ${s.platform} ${s.quality}`.toLowerCase().includes(q));
}

export function profitPerThousand(service: Service) {
  return Number((service.ratePerThousand - service.costPerThousand).toFixed(4));
}
