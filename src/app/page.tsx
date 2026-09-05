import { FlashSaleBanner, LiveOrderCounter, ReviewsShowcase } from "@/components/marketing";
import { FeatureGrid } from "@/components/FeatureGrid";
import { OrderWidget } from "@/components/OrderWidget";
import { Reveal } from "@/components/Reveal";
import { platforms } from "@/lib/catalog";
import { readStore } from "@/lib/admin-store";
import { getAuthUser } from "@/lib/supabase-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ settings }, user] = await Promise.all([readStore(), getAuthUser()]);
  return (
    <div className="mx-auto max-w-6xl px-4">
      {settings.announcement && (
        <p className="mt-6 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-sm">{settings.announcement}</p>
      )}
      
      <FlashSaleBanner placement="homepage" className="mt-6" />
      
      <section className="grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="hero-copy">
          <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#9aa3b5]">
            Social media marketing marketplace
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {settings.tagline}
          </h1>
          <p className="muted mt-4 max-w-lg text-base leading-7">
            Purchase social-media marketing services across multiple platforms from a single dashboard. Instant pricing, live tracking, wallet, and reseller API.
          </p>
          
          <LiveOrderCounter className="mt-4" />
          
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/services" className="btn btn-primary">
              Browse Services
            </Link>
            <Link href="/track" className="btn btn-ghost">
              Track Existing Order
            </Link>
          </div>
        </div>
        <div className="hero-widget">
          <OrderWidget />
        </div>
      </section>

      <Reveal>
        <FeatureGrid />
      </Reveal>

      <Reveal delay={80}>
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Platform marketplace</h2>
            <p className="muted mt-1 text-sm">Services are grouped by platform - not dumped into one giant dropdown.</p>
          </div>
          <Link href="/platforms" className="btn btn-ghost">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((p) => (
            <Link key={p.slug} href={`/services/${p.slug}`} className="glass lift p-5 hover:border-white/20">
              <span className="mb-4 block h-2 w-10 rounded-full" style={{ background: p.accent }} />
              <h3 className="font-semibold">{p.name}</h3>
              <p className="muted mt-1 text-sm">{p.tagline}</p>
            </Link>
          ))}
        </div>
      </section>
      </Reveal>

      <Reveal delay={100}>
        <ReviewsShowcase />
      </Reveal>

      {!user && (
        <Reveal delay={120}>
          <section className="glass lift mt-16 p-8 text-center">
            <h2 className="text-2xl font-semibold">Ready when you are</h2>
            <p className="muted mx-auto mt-2 max-w-xl text-sm">
              Customers place an order in seconds. Agencies and resellers run thousands through the same infrastructure.
            </p>
            <Link href="/signup" className="btn btn-primary mt-6">
              Create a free account
            </Link>
          </section>
        </Reveal>
      )}
    </div>
  );
}