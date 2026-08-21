"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/reseller")) {
    return null;
  }
  return (
    <footer className="mt-20 border-t border-white/8">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="muted text-sm">
            Social growth from a single dashboard. Cheap pricing, transparent tracking, reseller-ready.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Marketplace</p>
          <div className="flex flex-col gap-2 text-sm text-[#9aa3b5]">
            <Link href="/services">Services</Link>
            <Link href="/platforms">Platforms</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/track">Track order</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Account</p>
          <div className="flex flex-col gap-2 text-sm text-[#9aa3b5]">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/support">Support</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Company</p>
          <div className="flex flex-col gap-2 text-sm text-[#9aa3b5]">
            <Link href="/faq">FAQ</Link>
            <Link href="/reseller">Reseller</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
