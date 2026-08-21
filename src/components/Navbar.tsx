"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { clsx, money } from "@/lib/format";
import { useAuth } from "./AuthProvider";
import { useEffect, useState } from "react";

const links = [
  { href: "/services", label: "Services" },
  { href: "/platforms", label: "Platforms" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/track", label: "Track Order" },
  { href: "/developers", label: "API" },
  { href: "/support", label: "Support" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  
  const hidden = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/reseller");

  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      return;
    }
    
    // Fetch wallet balance
    fetch("/api/wallet", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json) setWalletBalance(Number(json.balance ?? 0));
      })
      .catch(() => setWalletBalance(null));
      
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetch("/api/wallet", { cache: "no-store" })
        .then((res) => res.ok ? res.json() : null)
        .then((json) => {
          if (json) setWalletBalance(Number(json.balance ?? 0));
        })
        .catch(() => undefined);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [user]);

  if (hidden) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07080c]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm text-[#9aa3b5] lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "nav-link cursor-pointer hover:text-white",
                pathname === l.href && "text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/dashboard/orders"
              className={clsx("nav-link cursor-pointer hover:text-white", pathname.startsWith("/dashboard/orders") && "text-white")}
            >
              Orders
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              {walletBalance !== null && (
                <Link 
                  href="/dashboard/wallet" 
                  className="hidden rounded-lg border border-[#3ddc97]/20 bg-[#3ddc97]/5 px-3 py-1.5 text-sm font-semibold text-[#3ddc97] transition-colors hover:bg-[#3ddc97]/10 sm:inline-flex"
                  title="Wallet balance"
                >
                  {money(walletBalance)}
                </Link>
              )}
              <Link href="/dashboard/orders" className="btn btn-ghost hidden sm:inline-flex">
                My orders
              </Link>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                  router.refresh();
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
