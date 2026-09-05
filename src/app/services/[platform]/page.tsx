import { getPlatform } from "@/lib/catalog";
import { getLiveServicesByPlatform } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  const p = getPlatform(platform);
  
  if (!p) {
    return {
      title: "Platform Not Found",
    };
  }

  const titleMap: Record<string, string> = {
    instagram: "Buy Cheap Instagram Followers, Likes & Views",
    tiktok: "Buy Cheap TikTok Views, Likes & Followers",
    youtube: "Buy Cheap YouTube Subscribers, Views & Likes",
    facebook: "Buy Cheap Facebook Likes, Followers & Views",
    x: "Buy Cheap X (Twitter) Followers, Likes & Views",
    telegram: "Buy Cheap Telegram Members & Views",
    spotify: "Buy Cheap Spotify Plays & Followers",
    discord: "Buy Cheap Discord Members & Boosts",
  };

  const descMap: Record<string, string> = {
    instagram: "Buy affordable Instagram followers, likes, views, and more. Instant delivery, refill guarantee, crypto payments. Start growing your Instagram today.",
    tiktok: "Buy cheap TikTok views, likes, and followers. Fast delivery, high retention, refill protection. Boost your TikTok presence with our SMM services.",
    youtube: "Buy affordable YouTube subscribers, views, and likes. Real engagement, fast delivery, refill guarantee. Grow your YouTube channel instantly.",
    facebook: "Buy cheap Facebook page likes, followers, and post engagement. Instant delivery, affordable prices, refill protection for your Facebook growth.",
    x: "Buy affordable X (Twitter) followers, likes, and views. Fast delivery, real accounts, refill guarantee. Grow your X presence with cheap SMM services.",
    telegram: "Buy cheap Telegram channel members and post views. Instant delivery, affordable prices. Grow your Telegram community with our SMM panel.",
    spotify: "Buy affordable Spotify plays and followers. Real streams, fast delivery. Boost your Spotify presence with cheap music promotion services.",
    discord: "Buy cheap Discord server members and boosts. Instant delivery, affordable prices. Grow your Discord community with our SMM services.",
  };

  return {
    title: `${titleMap[platform] || `Buy Cheap ${p.name} Services`} | CheapFollower`,
    description: descMap[platform] || `Buy affordable ${p.name} services. ${p.tagline}. Instant delivery, crypto payments, refill guarantee.`,
    alternates: {
      canonical: `/services/${platform}`,
    },
    openGraph: {
      title: `${titleMap[platform] || `Cheap ${p.name} Services`} | CheapFollower`,
      description: descMap[platform] || `Affordable ${p.name} social media marketing services with instant delivery.`,
      url: `/services/${platform}`,
    },
  };
}

export default async function PlatformServicesPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const p = getPlatform(platform);
  if (!p) notFound();
  const list = await getLiveServicesByPlatform(platform);

  // Breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://cheapfollower.shop",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: "https://cheapfollower.shop/services",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: p.name,
        item: `https://cheapfollower.shop/services/${platform}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav className="mb-4 text-sm text-[#9aa3b5]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-white">Home</Link>
        {" / "}
        <Link href="/services" className="hover:text-white">Services</Link>
        {" / "}
        <span className="text-white">{p.name}</span>
      </nav>
      <p className="text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">Platform</p>
      <h1 className="mt-2 text-3xl font-semibold">Buy Cheap {p.name} Services</h1>
      <p className="muted mt-2">{p.tagline} — Instant delivery, affordable prices, refill guarantee</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Link key={s.id} href={`/services/${s.platform}/${s.slug}`} className="glass p-5 hover:border-white/20">
            <div className="flex justify-between">
              <h2 className="font-semibold">{s.category}</h2>
              <span className="text-sm text-[#9aa3b5]">{s.quality}</span>
            </div>
            <p className="mt-4 text-xl font-semibold">{money(s.ratePerThousand)} / 1K</p>
            <p className="muted mt-2 text-sm">
              Min {s.min.toLocaleString()} · Max {s.max.toLocaleString()}
            </p>
            {s.refill && (
              <span className="mt-2 inline-block rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-400">
                Refill Guarantee
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
