import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { generateMetadata as generateSEO, generateStructuredData, StructuredData } from "@/components/SEO";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = generateSEO({
  title: "Buy Cheap Instagram Followers, TikTok Views, YouTube Subscribers",
  description: "Cheapest SMM panel for Instagram followers, TikTok views, YouTube subscribers, and more. Instant delivery, 30-day refill guarantee, wallet system, and reseller API.",
  keywords: [
    "cheap instagram followers",
    "buy tiktok views",
    "youtube subscribers",
    "facebook likes",
    "twitter followers",
    "smm panel",
    "social media marketing",
    "cheapest smm services",
  ],
});

const organizationData = generateStructuredData("Organization", {
  name: "cheapfollower.shop",
  alternateName: "Cheap Follower Shop",
  description: "The most affordable SMM panel for social media growth services",
});

const websiteData = generateStructuredData("WebSite", {});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <StructuredData data={organizationData} />
        <StructuredData data={websiteData} />
      </head>
      <body className="flex min-h-full flex-col font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1 pb-16 lg:pb-0">{children}</main>
              <Footer />
              <MobileNav />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
