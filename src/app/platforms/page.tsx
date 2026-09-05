import Link from "next/link";
import { platforms } from "@/lib/catalog";
import { getLiveServicesByPlatform } from "@/lib/live-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Social Media Platforms - Instagram, TikTok, YouTube & More | CheapFollower",
  description:
    "Buy SMM services for 8+ platforms: Instagram, TikTok, YouTube, Facebook, X (Twitter), Telegram, Spotify, Discord. Affordable followers, views, likes & more.",
  alternates: {
    canonical: "/platforms",
  },
  openGraph: {
    title: "Supported Social Media Platforms | CheapFollower",
    description: "SMM services available for Instagram, TikTok, YouTube, Facebook, X, Telegram, Spotify & Discord.",
    url: "/platforms",
  },
};

export default async function PlatformsPage() {
  const grouped = await Promise.all(platforms.map(async (p) => ({ p, list: await getLiveServicesByPlatform(p.slug) })));
  
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Social Media Platforms</h1>
      <p className="muted mt-2">Buy cheap followers, views, likes & subscribers across major social media platforms. Each platform has dedicated services with instant delivery.</p>
      <div className="mt-8 space-y-8">
        {grouped.map(({ p, list }) => (
          <section key={p.slug} className="glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{p.name} Services</h2>
                <p className="text-sm text-[#9aa3b5] mt-1">{p.tagline}</p>
              </div>
              <Link href={`/services/${p.slug}`} className="btn btn-ghost">
                Browse {p.name}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {list.slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  href={`/services/${s.platform}/${s.slug}`}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 hover:border-white/20"
                >
                  {s.category}
                </Link>
              ))}
              {list.length > 8 && (
                <Link
                  href={`/services/${p.slug}`}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-[#6ea8ff] hover:bg-white/5"
                >
                  +{list.length - 8} more
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-10 glass p-6">
        <h2 className="text-lg font-semibold mb-3">Why Multi-Platform SMM Services?</h2>
        <p className="text-sm text-[#c5cddc] leading-6">
          Our SMM panel supports growth across all major social media platforms from a single dashboard. Whether you need Instagram followers, TikTok views, YouTube subscribers, or services for Facebook, X (Twitter), Telegram, Spotify, and Discord - buy everything with one account. No need to juggle multiple vendors. Track all orders, manage wallet balance, request refills, and access reseller API from one place.
        </p>
      </div>
    </div>
  );
}
