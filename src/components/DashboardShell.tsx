"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Gear,
  House,
  Key,
  Lifebuoy,
  ListChecks,
  PlusCircle,
} from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { clsx } from "@/lib/format";
import { useAuth } from "./AuthProvider";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/dashboard/new-order", label: "New Order", icon: PlusCircle },
  { href: "/dashboard/orders", label: "Orders", icon: ListChecks, auth: true },
  { href: "/dashboard/wallet", label: "Wallet", icon: CreditCard },
  { href: "/dashboard/api", label: "API", icon: Key },
  { href: "/dashboard/support", label: "Support", icon: Lifebuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Gear },
];

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const nav = items.filter((item) => !item.auth || user);
  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px]">
      <aside className="hidden w-56 shrink-0 border-r border-white/8 p-4 lg:block">
        <Logo />
        <nav className="mt-8 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm cursor-pointer",
                  active ? "bg-white/8 text-white" : "text-[#9aa3b5] hover:bg-white/4 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 pb-24 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}
