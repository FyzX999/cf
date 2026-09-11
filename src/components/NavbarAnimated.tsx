"use client";

import { motion, AnimatePresence } from "motion/react";
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

export function NavbarAnimated() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hidden = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/reseller");

  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      return;
    }

    fetch("/api/wallet", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json) setWalletBalance(Number(json.balance ?? 0));
      })
      .catch(() => setWalletBalance(null));

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (hidden) return null;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={clsx(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#07080c]/90 backdrop-blur-xl"
          : "border-b border-white/8 bg-[#07080c]/70 backdrop-blur-xl"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Logo />
        </motion.div>

        {/* Desktop Navigation */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="hidden items-center gap-5 text-sm text-[#9aa3b5] lg:flex"
        >
          {links.map((l, i) => (
            <motion.div
              key={l.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <Link
                href={l.href}
                className={clsx(
                  "nav-link relative cursor-pointer transition-colors",
                  pathname === l.href ? "text-white" : "hover:text-white"
                )}
              >
                {l.label}
                {pathname === l.href && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#3ddc97] to-[#3ddc97]/50"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}

          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                href="/dashboard/orders"
                className={clsx(
                  "nav-link relative cursor-pointer transition-colors",
                  pathname.startsWith("/dashboard/orders") ? "text-white" : "hover:text-white"
                )}
              >
                Orders
              </Link>
            </motion.div>
          )}
        </motion.nav>

        {/* Mobile Menu Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2"
        >
          <motion.svg
            animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </motion.svg>
        </motion.button>

        {/* Auth Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2"
        >
          {!loading && user ? (
            <AnimatePresence mode="popLayout">
              {walletBalance !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link
                    href="/dashboard/wallet"
                    className="hidden rounded-lg border border-[#3ddc97]/20 bg-[#3ddc97]/5 px-3 py-1.5 text-sm font-semibold text-[#3ddc97] transition-all hover:border-[#3ddc97]/40 hover:bg-[#3ddc97]/10 sm:inline-flex"
                    title="Wallet balance"
                  >
                    {money(walletBalance)}
                  </Link>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <Link href="/dashboard/orders" className="btn btn-ghost hidden sm:inline-flex">
                  My orders
                </Link>
              </motion.div>

              <motion.button
                className="btn btn-ghost"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
              >
                Sign out
              </motion.button>
            </AnimatePresence>
          ) : loading ? (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-8 w-24 rounded-lg bg-white/10"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden border-t border-white/10 bg-[#07080c]/95 backdrop-blur-xl"
          >
            <nav className="space-y-1 px-4 py-4">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={l.href}
                    className={clsx(
                      "block px-3 py-2 rounded-lg transition-colors",
                      pathname === l.href
                        ? "text-white bg-[#3ddc97]/10 border-l-2 border-[#3ddc97]"
                        : "text-white/60 hover:text-white"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
