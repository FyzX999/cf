import type { Platform, PlatformSlug, Service } from "./types";

export const platforms: Platform[] = [
  { slug: "instagram", name: "Instagram", accent: "#E1306C", tagline: "Followers, likes, views, and more" },
  { slug: "tiktok", name: "TikTok", accent: "#25F4EE", tagline: "Views, likes, and live traffic" },
  { slug: "youtube", name: "YouTube", accent: "#FF0000", tagline: "Subscribers, views, and watch time" },
  { slug: "facebook", name: "Facebook", accent: "#1877F2", tagline: "Pages, posts, and video reach" },
  { slug: "x", name: "X", accent: "#E7E9EA", tagline: "Followers, likes, views, and reposts" },
  { slug: "telegram", name: "Telegram", accent: "#2AABEE", tagline: "Members, views, and reactions" },
  { slug: "spotify", name: "Spotify", accent: "#1DB954", tagline: "Plays, followers, and saves" },
  { slug: "discord", name: "Discord", accent: "#5865F2", tagline: "Members, boosts, and online counts" },
];

type Seed = {
  category: string;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
};

const seeds: Record<PlatformSlug, Seed[]> = {
  instagram: [
    { category: "Followers [Standard]", rate: 0.85, min: 100, max: 500000, refill: true },
    { category: "Followers [Premium HQ]", rate: 2.45, min: 500, max: 100000, refill: true },
    { category: "Followers [Real Active]", rate: 4.85, min: 250, max: 50000, refill: true },
    { category: "Followers [Max 1M]", rate: 0.68, min: 1000, max: 1000000, refill: true },
    { category: "Followers [Instant]", rate: 1.95, min: 100, max: 250000, refill: true },
    { category: "Likes", rate: 0.22, min: 50, max: 500000, refill: true },
    { category: "Reel Views", rate: 0.09, min: 100, max: 1000000, refill: false },
    { category: "Video Views", rate: 0.08, min: 100, max: 2000000, refill: false },
    { category: "Story Views", rate: 0.31, min: 50, max: 50000, refill: false },
    { category: "Comments", rate: 2.4, min: 5, max: 5000, refill: false },
    { category: "Saves", rate: 0.45, min: 20, max: 50000, refill: true },
    { category: "Shares", rate: 0.62, min: 20, max: 25000, refill: false },
    { category: "Profile Visits", rate: 0.18, min: 100, max: 100000, refill: false },
    { category: "Live Views", rate: 1.1, min: 50, max: 20000, refill: false },
  ],
  tiktok: [
    { category: "Followers", rate: 1.15, min: 50, max: 200000, refill: true },
    { category: "Likes", rate: 0.19, min: 50, max: 1000000, refill: true },
    { category: "Video Views", rate: 0.05, min: 100, max: 5000000, refill: false },
    { category: "Shares", rate: 0.72, min: 20, max: 50000, refill: false },
    { category: "Saves", rate: 0.41, min: 20, max: 50000, refill: true },
    { category: "Comments", rate: 2.1, min: 5, max: 5000, refill: false },
    { category: "Live Views", rate: 1.35, min: 50, max: 15000, refill: false },
    { category: "Profile Views", rate: 0.16, min: 100, max: 200000, refill: false },
  ],
  youtube: [
    { category: "Subscribers", rate: 4.9, min: 50, max: 50000, refill: true },
    { category: "Views", rate: 0.74, min: 100, max: 1000000, refill: false },
    { category: "Likes", rate: 0.95, min: 20, max: 100000, refill: true },
    { category: "Comments", rate: 3.2, min: 5, max: 2000, refill: false },
    { category: "Shorts Views", rate: 0.28, min: 100, max: 2000000, refill: false },
    { category: "Watch Time", rate: 6.4, min: 100, max: 10000, refill: false },
    { category: "Live Views", rate: 2.8, min: 20, max: 10000, refill: false },
  ],
  facebook: [
    { category: "Page Followers", rate: 1.4, min: 50, max: 100000, refill: true },
    { category: "Page Likes", rate: 1.35, min: 50, max: 100000, refill: true },
    { category: "Post Likes", rate: 0.33, min: 20, max: 200000, refill: true },
    { category: "Reactions", rate: 0.38, min: 20, max: 100000, refill: false },
    { category: "Video Views", rate: 0.12, min: 100, max: 2000000, refill: false },
    { category: "Story Views", rate: 0.29, min: 50, max: 50000, refill: false },
    { category: "Comments", rate: 2.2, min: 5, max: 5000, refill: false },
    { category: "Shares", rate: 0.88, min: 10, max: 25000, refill: false },
  ],
  x: [
    { category: "Followers", rate: 1.9, min: 50, max: 50000, refill: true },
    { category: "Post Likes", rate: 0.41, min: 20, max: 100000, refill: true },
    { category: "Post Views", rate: 0.07, min: 100, max: 2000000, refill: false },
    { category: "Reposts", rate: 0.96, min: 10, max: 25000, refill: false },
    { category: "Replies", rate: 2.7, min: 5, max: 2000, refill: false },
    { category: "Bookmarks", rate: 0.54, min: 10, max: 25000, refill: false },
  ],
  telegram: [
    { category: "Channel Members", rate: 1.05, min: 50, max: 100000, refill: true },
    { category: "Post Views", rate: 0.06, min: 100, max: 2000000, refill: false },
    { category: "Reactions", rate: 0.27, min: 20, max: 100000, refill: false },
    { category: "Poll Votes", rate: 0.48, min: 20, max: 50000, refill: false },
  ],
  spotify: [
    { category: "Plays", rate: 0.35, min: 100, max: 500000, refill: false },
    { category: "Followers", rate: 1.8, min: 50, max: 50000, refill: true },
    { category: "Playlist Followers", rate: 1.65, min: 50, max: 50000, refill: true },
    { category: "Saves", rate: 0.52, min: 20, max: 50000, refill: false },
  ],
  discord: [
    { category: "Server Members", rate: 2.4, min: 50, max: 25000, refill: true },
    { category: "Server Boosts", rate: 18, min: 1, max: 30, refill: false },
    { category: "Online Members", rate: 3.1, min: 10, max: 5000, refill: false },
  ],
};

function slugify(platform: PlatformSlug, category: string) {
  return `${platform}-${category.toLowerCase().replace(/\s+/g, "-").replace(/\[|\]/g, "")}`;
}

export const services: Service[] = platforms.flatMap((platform, pIndex) =>
  seeds[platform.slug].map((seed, sIndex) => {
    const premium = seed.refill && seed.rate < 5;
    const isDiscord = platform.slug === "discord";
    return {
      id: `${pIndex + 1}${String(sIndex + 1).padStart(2, "0")}`,
      platform: platform.slug,
      slug: slugify(platform.slug, seed.category),
      name: `${platform.name} ${seed.category}`,
      category: seed.category,
      quality: premium ? "Premium" : seed.rate > 5 ? "HQ" : "Standard",
      delivery: seed.rate < 0.2 ? "Instant" : "Fast",
      refill: seed.refill,
      refillDays: seed.refill ? 30 : 0,
      min: seed.min,
      max: seed.max,
      passwordRequired: false,
      ratePerThousand: seed.rate,
      costPerThousand: Number((seed.rate / 1.8).toFixed(4)),
      markupMultiplier: 1.8,
      priceMode: "multiplier" as const,
      visible: true,
      active: true,
      manual: isDiscord,
      providerServiceId: null,
      startTime: seed.rate < 0.2 ? "0–5 min" : "5–30 min",
      popularity: 100 - pIndex * 8 - sIndex * 3,
      description: `High-retention ${platform.name} ${seed.category.toLowerCase()} delivered through the cheapfollower.shop marketplace.`,
    };
  }),
);

export function getPlatform(slug: string) {
  return platforms.find((p) => p.slug === slug);
}

export function getServicesByPlatform(slug: string) {
  return services.filter((s) => s.platform === slug);
}

export function getService(platform: string, slug: string) {
  return services.find((s) => s.platform === platform && s.slug === slug);
}

export function searchServices(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter((s) =>
    `${s.name} ${s.category} ${s.platform} ${s.quality}`.toLowerCase().includes(q),
  );
}

export type DeliveryMultipliers = {
  standard: number;
  fast: number;
  drip: number;
};

export function calcPrice(
  ratePerThousand: number,
  quantity: number,
  delivery: "standard" | "fast" | "drip" = "standard",
  multipliers: DeliveryMultipliers = { standard: 1, fast: 1.35, drip: 1.15 },
) {
  return Number(((ratePerThousand * quantity) / 1000) * (multipliers[delivery] ?? 1));
}
