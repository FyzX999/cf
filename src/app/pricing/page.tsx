import { platforms } from "@/lib/catalog";
import { getLiveCatalog } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cheap SMM Services Pricing - Instagram, TikTok, YouTube & More | CheapFollower",
  description:
    "Compare prices for Instagram followers, TikTok views, YouTube subscribers & more SMM services. Transparent per-1K pricing, no hidden fees. Starting from $0.05/1K.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "SMM Services Pricing | CheapFollower",
    description: "Transparent pricing for all social media services. Compare rates for Instagram, TikTok, YouTube, and more.",
    url: "/pricing",
  },
};

export default async function PricingPage() {
  const services = await getLiveCatalog({ publicOnly: true });
  const featured = services.filter((s) => ["Followers", "Likes", "Views", "Video Views", "Subscribers"].includes(s.category)).slice(0, 20);
  
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Cheap SMM Services Pricing</h1>
      <p className="muted mt-2 max-w-2xl">
        Transparent per-1,000 pricing for Instagram followers, TikTok views, YouTube subscribers & more. Final checkout price updates with quantity and delivery speed. No hidden fees.
      </p>
      <div className="mt-8 overflow-hidden rounded-[14px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-[#9aa3b5]">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Price / 1K</th>
              <th className="px-4 py-3">Min Order</th>
              <th className="px-4 py-3">Refill</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {featured.map((s) => (
              <tr key={s.id} className="border-t border-white/8">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 capitalize">{s.platform}</td>
                <td className="px-4 py-3 text-green-400 font-semibold">{money(s.ratePerThousand)}</td>
                <td className="px-4 py-3">{s.min.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {s.refill ? (
                    <span className="text-green-400">✓ {s.refillDays}d</span>
                  ) : (
                    <span className="text-[#9aa3b5]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link className="text-[#6ea8ff] hover:underline" href={`/services/${s.platform}/${s.slug}`}>
                    Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="muted text-sm">{platforms.length} platforms · {services.length} live services</p>
        <Link href="/services" className="btn btn-ghost">
          Browse All Services
        </Link>
      </div>
      <div className="mt-10 space-y-6">
        <h2 className="text-2xl font-semibold">Pricing Information</h2>
        <div className="glass p-6 space-y-4 text-sm leading-6">
          <p><strong>How pricing works:</strong> All prices are displayed per 1,000 units (followers, views, likes, etc.). Your final price is calculated as: (Price per 1K × Quantity) ÷ 1,000 × Delivery Speed Multiplier.</p>
          <p><strong>Delivery speed options:</strong> Standard (1×), Fast (1.35×), Drip-feed (1.15×). Fast delivery starts immediately with higher resource priority. Drip-feed spreads delivery gradually for natural growth patterns.</p>
          <p><strong>Refill guarantee:</strong> Services marked with refill protection offer automatic replacement if counts drop during the guarantee period (typically 30 days). Request refills from your order page.</p>
          <p><strong>Reseller pricing:</strong> Create a free reseller account to access wholesale rates with customizable retail markups. Use our PerfectPanel-compatible API to integrate with your own SMM panel.</p>
        </div>
      </div>
    </div>
  );
}
