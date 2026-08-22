import { MetadataRoute } from "next";
import { platforms, services } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cheapfollower.shop";

  // Static pages
  const staticPages = [
    "",
    "/services",
    "/pricing",
    "/platforms",
    "/developers",
    "/faq",
    "/reseller",
    "/login",
    "/signup",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Service pages
  const servicePages = services.map((service) => ({
    url: `${baseUrl}/services/${service.platform}/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Platform pages
  const platformPages = platforms.map((platform) => ({
    url: `${baseUrl}/services/${platform.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...platformPages];
}
