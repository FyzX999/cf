import { MetadataRoute } from "next";
import { catalog } from "@/lib/catalog";

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
  const servicePages = catalog.platforms.flatMap((platform) =>
    platform.categories.flatMap((category) => ({
      url: `${baseUrl}/services/${platform.id}/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    }))
  );

  // Platform pages
  const platformPages = catalog.platforms.map((platform) => ({
    url: `${baseUrl}/services/${platform.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...platformPages];
}
