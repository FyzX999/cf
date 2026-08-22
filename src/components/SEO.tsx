import { Metadata } from "next";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: object;
}

const SITE_NAME = "cheapfollower.shop";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cheapfollower.shop";
const DEFAULT_DESCRIPTION = "Buy cheap Instagram followers, TikTok views, YouTube subscribers, and more. Instant delivery, wallet system, and reseller API. The best SMM panel for social media growth.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  canonicalUrl,
  noindex = false,
}: SEOProps = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Social Media Growth Without the Complicated Price Tag`;
  
  const defaultKeywords = [
    "cheap followers",
    "buy instagram followers",
    "tiktok views",
    "youtube subscribers",
    "smm panel",
    "social media marketing",
    "instagram likes",
    "cheap social media services",
  ];

  const allKeywords = [...new Set([...defaultKeywords, ...keywords])];

  return {
    title: fullTitle,
    description,
    keywords: allKeywords.join(", "),
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: noindex ? "noindex,nofollow" : "index,follow",
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: canonicalUrl || SITE_URL,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
      creator: "@cheapfollower",
    },
    other: {
      "theme-color": "#6ea8ff",
    },
  };
}

/**
 * Generate JSON-LD structured data
 */
export function generateStructuredData(type: "Organization" | "Product" | "WebSite" | "BreadcrumbList", data: any) {
  const baseData = {
    "@context": "https://schema.org",
    "@type": type,
  };

  switch (type) {
    case "Organization":
      return JSON.stringify({
        ...baseData,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: DEFAULT_DESCRIPTION,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Customer Service",
          email: "support@cheapfollower.shop",
        },
        sameAs: [
          // Add social media profiles here
        ],
        ...data,
      });

    case "Product":
      return JSON.stringify({
        ...baseData,
        name: data.name,
        description: data.description,
        image: data.image || DEFAULT_IMAGE,
        brand: {
          "@type": "Brand",
          name: SITE_NAME,
        },
        offers: {
          "@type": "Offer",
          price: data.price,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: data.url,
        },
        ...data,
      });

    case "WebSite":
      return JSON.stringify({
        ...baseData,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/services?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        ...data,
      });

    case "BreadcrumbList":
      return JSON.stringify({
        ...baseData,
        itemListElement: data.items.map((item: any, index: number) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      });

    default:
      return JSON.stringify({ ...baseData, ...data });
  }
}

/**
 * Structured Data Script Component
 */
export function StructuredData({ data }: { data: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
}
