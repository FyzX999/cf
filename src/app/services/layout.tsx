import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buy Cheap Social Media Services - Instagram, TikTok, YouTube | CheapFollower",
  description:
    "Browse 100+ affordable SMM services. Buy cheap Instagram followers, TikTok views, YouTube subscribers, likes, and more. Instant delivery with refill guarantee.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Cheap Social Media Marketing Services | CheapFollower",
    description:
      "100+ SMM services: Instagram followers, TikTok views, YouTube subscribers. Instant delivery, affordable prices.",
    url: "/services",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
