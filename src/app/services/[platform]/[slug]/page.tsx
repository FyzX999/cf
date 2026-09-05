import { OrderWidget } from "@/components/OrderWidget";
import { getPlatform } from "@/lib/catalog";
import { getLiveService } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
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
    return {
      title: "Service Not Found",
    };
  }

  const title = `Buy Cheap ${service.name} - ${money(service.ratePerThousand)}/1K`;
  const description = `Buy affordable ${service.name.toLowerCase()} starting at ${money(service.ratePerThousand)} per 1,000. ${service.delivery} delivery, ${service.refill ? `${service.refillDays}-day refill guarantee` : 'instant start'}, no password required. Order ${p.name} ${service.category.toLowerCase()} now.`;

  return {
    title: `${title} | CheapFollower`,
    description,
    alternates: {
      canonical: `/services/${platform}/${slug}`,
    },
    openGraph: {
      title: `${title} | CheapFollower`,
      description,
      url: `/services/${platform}/${slug}`,
      type: "website",
    },
  };
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
      {
        "@type": "ListItem",
        position: 4,
        name: service.name,
        item: `https://cheapfollower.shop/services/${platform}/${slug}`,
      },
    ],
  };

  // Product structured data
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.name,
    description: service.description,
    brand: {
      "@type": "Brand",
      name: "CheapFollower",
    },
    offers: {
      "@type": "Offer",
      price: service.ratePerThousand,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://cheapfollower.shop/services/${platform}/${slug}`,
    },
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <div>
        <nav className="mb-4 text-sm text-[#9aa3b5]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white">Home</Link>
          {" / "}
          <Link href="/services" className="hover:text-white">Services</Link>
          {" / "}
          <Link href={`/services/${platform}`} className="hover:text-white">{p.name}</Link>
          {" / "}
          <span className="text-white">{service.category}</span>
        </nav>
        <p className="text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">{p.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{service.name} — {service.quality}</h1>
        <p className="mt-3 text-2xl font-semibold text-green-400">{money(service.ratePerThousand)} / 1,000</p>
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
          <h2 className="text-lg font-semibold text-white">About This Service</h2>
          <p>{service.description}</p>
          <p>Expected start time: <strong>{service.startTime}</strong>. Delivery continues until the ordered quantity is reached or the order is marked partial.</p>
          {service.refill && (
            <p>This service includes a <strong>{service.refillDays}-day refill guarantee</strong>. If your count drops below the purchased quantity during this period, request a refill from your order page.</p>
          )}
          <h3 className="text-base font-semibold text-white mt-6">Important Information</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Target must be public and active</li>
            <li>Do not order on private, banned, or newly created accounts</li>
            <li>No password required - only provide a public URL</li>
            <li>Counts can drop after delivery due to platform cleanup</li>
            <li>Orders begin processing immediately after payment</li>
            <li>Cancellation available only before provider starts delivery</li>
          </ul>
        </div>
      </div>
      <OrderWidget defaultPlatform={service.platform} lockedServiceId={service.id} />
    </div>
  );
}
