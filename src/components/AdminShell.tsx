"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartPie, GearSix, Gift, ListChecks, SquaresFour, Ticket, Users, ShieldCheck, Lightning } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { clsx } from "@/lib/format";

const items = [
  { href: "/admin", label: "Overview", icon: ChartPie },
  { href: "/admin/orders", label: "Orders", icon: ListChecks },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/services", label: "Services", icon: SquaresFour },
  { href: "/admin/commerce", label: "Promos", icon: Gift },
  { href: "/admin/flash-sales", label: "Flash Sales", icon: Lightning },
  { href: "/admin/complete-payment", label: "Complete Payment", icon: Gift },
  { href: "/admin/settings", label: "Settings", icon: GearSix },
  { href: "/admin/analytics", label: "Analytics", icon: ChartPie },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/audit", label: "Audit log", icon: ShieldCheck },
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px]">
      <aside className="hidden w-60 shrink-0 border-r border-white/8 p-4 lg:block">
        <Logo />
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">Admin</p>
        <nav className="mt-6 space-y-1">
          {items.map((item) => {
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
        <button type="button" className="btn btn-ghost mt-6 w-full" onClick={logout}>
          Log out
        </button>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}
