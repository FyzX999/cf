"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, SquaresFour, ListChecks, Wallet, User, SignIn, Question } from "@phosphor-icons/react";
import { clsx } from "@/lib/format";
import { useAuth } from "./AuthProvider";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (pathname.startsWith("/admin") || pathname.startsWith("/reseller")) return null;

  const items = user
    ? [
        { href: "/", label: "Home", icon: House },
        { href: "/services", label: "Services", icon: SquaresFour },
        { href: "/dashboard/orders", label: "Orders", icon: ListChecks },
        { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
        { href: "/dashboard", label: "Account", icon: User },
      ]
    : [
        { href: "/", label: "Home", icon: House },
        { href: "/services", label: "Services", icon: SquaresFour },
        { href: "/track", label: "Track", icon: ListChecks },
        { href: "/faq", label: "FAQ", icon: Question },
        { href: "/login", label: "Login", icon: SignIn },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07080c]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] cursor-pointer",
                active ? "text-white" : "text-[#9aa3b5]",
              )}
            >
              <Icon size={20} weight={active ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
