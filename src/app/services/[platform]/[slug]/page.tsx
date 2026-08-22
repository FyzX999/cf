import { OrderWidget } from "@/components/OrderWidget";
import { getPlatform } from "@/lib/catalog";
import { getLiveService } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import { notFound } from "next/navigation";
import { generateMetadata as generateSEO, generateStructuredData, StructuredData } from "@/components/SEO";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string; slug: string }>;
}): Promise<Metadata> {
  const { platform, slug } = await params;
  const service = await getLiveService(platform, slug);
  const p = getPlatform(platform);
  
  if (!service || !p) {
    return generateSEO({ noindex: true });
  }

  const title = `Buy ${service.name} - ${service.quality} - ${money(service.ratePerThousand)}/1K`;
  const description = `${service.description} Starting at ${money(service.ratePerThousand)} per 1,000. ${service.delivery} delivery. ${service.refill ? `${service.refillDays}-day refill guarantee.` : ''} Order now on cheapfollower.shop.`;
  
  return generateSEO({
    title,
    description,
    keywords: [
      `buy ${service.name.toLowerCase()}`,
      `cheap ${service.name.toLowerCase()}`,
      `${p.name.toLowerCase()} ${service.category.toLowerCase()}`,
      service.quality.toLowerCase(),
      "instant delivery",
      service.refill ? "refill guarantee" : "",
    ],
    ogType: "product",
    canonicalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cheapfollower.shop'}/services/${platform}/${slug}`,
  });
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ platform: string; slug: string }>;
}) {
  const { platform, slug } = await params;
  const service = await getLiveService(platform, slug);
  const p = getPlatform(platform);
  if (!service || !p) notFound();

  const productData = generateStructuredData("Product", {
    name: `${service.name} - ${service.quality}`,
    description: service.description,
    brand: { "@type": "Brand", name: p.name },
    price: service.ratePerThousand,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cheapfollower.shop'}/services/${platform}/${slug}`,
  });

  return (
    <>
      <StructuredData data={productData} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">{p.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{service.name} — {service.quality}</h1>
        <p className="mt-3 text-2xl font-semibold">{money(service.ratePerThousand)} / 1,000</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {[
            ["Quality", service.quality],
            ["Delivery", service.delivery],
            ["Refill", service.refill ? `Included (${service.refillDays}d)` : "Not included"],
            ["Minimum", service.min.toLocaleString()],
            ["Maximum", service.max.toLocaleString()],
            ["Password", service.passwordRequired ? "Required" : "Not required"],
          ].map(([k, v]) => (
            <div key={k} className="glass p-3">
              <dt className="muted text-xs">{k}</dt>
              <dd className="mt-1 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="prose-invert mt-8 space-y-3 text-sm leading-6 text-[#c5cddc]">
          <h2 className="text-lg font-semibold text-white">Service details</h2>
          <p>{service.description}</p>
          <p>Expected start: {service.startTime}. Delivery continues until the ordered quantity is reached or the order is marked partial.</p>
          <p>Drop protection applies only when refill is included. Target must be public. Do not order on private, banned, or newly created accounts.</p>
          <p>Counts can drop after delivery. We are not liable for drops, platform removals, or account penalties.</p>
          <p>Orders begin processing after payment. Cancellation is available only before the provider starts delivery.</p>
        </div>
      </div>
      <OrderWidget defaultPlatform={service.platform} lockedServiceId={service.id} />
    </div>
    </>
  );
}
