import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = 'https://cheapfollower.shop'
const siteName = 'CheapFollower'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cheap Followers & Social Media Marketing Services | CheapFollower",
    template: "%s | CheapFollower",
  },
  description:
    "Buy cheap Instagram followers, TikTok views, YouTube subscribers & more. Instant delivery, affordable SMM services, crypto payments, and reseller API access.",
  keywords: [
    "cheap followers",
    "buy instagram followers",
    "cheap instagram followers",
    "tiktok views",
    "youtube subscribers",
    "smm panel",
    "social media marketing",
    "buy tiktok followers",
    "cheap tiktok likes",
    "instagram likes",
    "smm services",
    "social media growth",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName,
    title: "Cheap Followers & Social Media Marketing Services | CheapFollower",
    description: "Buy affordable Instagram followers, TikTok views, YouTube subscribers. Instant SMM services with crypto payments and reseller API.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CheapFollower - Affordable Social Media Marketing Services',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Cheap Followers & Social Media Marketing | CheapFollower",
    description: "Affordable Instagram followers, TikTok views, YouTube subscribers. Instant delivery. Crypto payments accepted.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add when available: google: 'your-verification-code',
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-16 lg:pb-0">{children}</main>
          <Footer />
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}

