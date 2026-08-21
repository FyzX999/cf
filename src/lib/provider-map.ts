import { listProviderServicesCached, type GopService } from "./provider";
import { applyServiceOverride, getLiveCatalog, retailFromCost } from "./live-catalog";
import { readStore } from "./admin-store";
import type { PlatformSlug, Service } from "./types";

const PLATFORM_HINTS: Record<PlatformSlug, string[]> = {
  instagram: ["instagram", "ig "],
  tiktok: ["tiktok", "tik tok"],
  youtube: ["youtube", "yt "],
  facebook: ["facebook", "fb "],
  x: ["twitter", "tweet", "x |", "(twitter)", "x.com"],
  telegram: ["telegram", "tg "],
  spotify: ["spotify"],
  discord: ["discord"],
};

const CATEGORY_HINTS: Record<string, string[]> = {
  Followers: ["followers", "follower"],
  Likes: ["likes", "like"],
  "Reel Views": ["reel view", "reels view", "reel"],
  "Video Views": ["video view"],
  "Story Views": ["story view", "stories view"],
  Comments: ["comment"],
  Saves: ["save"],
  Shares: ["share"],
  "Profile Visits": ["profile visit"],
  "Live Views": ["live view", "livestream"],
  "Profile Views": ["profile view"],
  Subscribers: ["subscriber", "sub "],
  Views: ["views"],
  "Shorts Views": ["short"],
  "Watch Time": ["watch time", "hours"],
  "Page Followers": ["page follower", "page follow"],
  "Page Likes": ["page like"],
  "Post Likes": ["post like", "likes"],
  Reactions: ["reaction"],
  Reposts: ["repost", "retweet"],
  Replies: ["reply", "replies"],
  Bookmarks: ["bookmark"],
  "Channel Members": ["member", "subscriber"],
  "Post Views": ["post view", "views"],
  "Poll Votes": ["poll"],
  Plays: ["play", "stream"],
  "Playlist Followers": ["playlist"],
  "Server Members": ["member"],
  "Server Boosts": ["boost"],
  "Online Members": ["online"],
};

function haystack(service: GopService) {
  return `${service.category} ${service.name} ${service.type}`.toLowerCase();
}

function matchesPlatform(text: string, platform: PlatformSlug) {
  return PLATFORM_HINTS[platform].some((hint) => text.includes(hint));
}

function matchesCategory(text: string, category: string) {
  const hints = CATEGORY_HINTS[category] ?? [category.toLowerCase()];
  return hints.some((hint) => text.includes(hint));
}

function overrideMap() {
  const raw = process.env.GODOFPANEL_SERVICE_MAP?.trim();
  if (!raw) return {} as Record<string, number>;
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed;
  } catch {
    return {};
  }
}

export function matchProviderService(catalog: Service, provider: GopService[]) {
  const candidates = provider.filter((item) => {
    const text = haystack(item);
    return matchesPlatform(text, catalog.platform) && matchesCategory(text, catalog.category);
  });
  if (!candidates.length) return null;
  return candidates.slice().sort((a, b) => Number(a.rate) - Number(b.rate))[0];
}

export function markupRate(providerRate: number, multiplier?: number) {
  if (multiplier && multiplier > 0) return retailFromCost(providerRate, multiplier);
  const percent = Number(process.env.MARKUP_PERCENT ?? 80);
  const fallback = 1 + (Number.isFinite(percent) ? percent : 80) / 100;
  return retailFromCost(providerRate, fallback);
}

export async function resolveProviderServiceId(catalog: Service) {
  // Priority: 1. Service's own providerServiceId, 2. Env variable map, 3. Auto-match
  if (catalog.providerServiceId) return catalog.providerServiceId;
  const overrides = overrideMap();
  if (overrides[catalog.id]) return overrides[catalog.id];
  const provider = await listProviderServicesCached();
  return matchProviderService(catalog, provider)?.service ?? null;
}

export async function mappedCatalogServices() {
  const [provider, catalog, store] = await Promise.all([
    listProviderServicesCached(),
    getLiveCatalog(),
    readStore(),
  ]);
  const overrides = overrideMap();
  return catalog.map((service) => {
    const matched = matchProviderService(service, provider);
    // Priority: 1. Service's own providerServiceId, 2. Env variable map, 3. Auto-match
    const providerServiceId = service.providerServiceId ?? overrides[service.id] ?? matched?.service ?? null;
    const liveCost = matched ? Number(matched.rate) : service.costPerThousand;
    const withCost: Service = store.settings.autoSyncProviderCost
      ? applyServiceOverride(
          {
            ...service,
            costPerThousand: liveCost,
            min: matched ? Number(matched.min) : service.min,
            max: matched ? Number(matched.max) : service.max,
          },
          store.services[service.id],
          store.settings,
        )
      : service;
    return {
      ...withCost,
      providerServiceId,
      providerName: matched?.name ?? null,
      providerRate: matched?.rate ?? null,
      liveCost,
    };
  });
}
