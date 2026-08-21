import { platforms } from "@/lib/catalog";
import { getLiveCatalog } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const services = await getLiveCatalog({ publicOnly: true });
  const featured = services.filter((s) => ["Followers", "Likes", "Views", "Video Views", "Subscribers"].includes(s.category)).slice(0, 12);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <p className="muted mt-2 max-w-2xl">
        Retail rates are shown per 1,000 units. Final checkout price updates with quantity and delivery speed. Reseller markups are configured in the reseller dashboard.
      </p>
      <div className="mt-8 overflow-hidden rounded-[14px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-[#9aa3b5]">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Per 1K</th>
              <th className="px-4 py-3">Min</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {featured.map((s) => (
              <tr key={s.id} className="border-t border-white/8">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 capitalize">{s.platform}</td>
                <td className="px-4 py-3">{money(s.ratePerThousand)}</td>
                <td className="px-4 py-3">{s.min.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link className="text-[#6ea8ff]" href={`/services/${s.platform}/${s.slug}`}>
                    Order
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted mt-6 text-sm">{platforms.length} platforms · {services.length} live services</p>
    </div>
  );
}
