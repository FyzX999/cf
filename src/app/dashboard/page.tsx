import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { listOrdersForUser } from "@/lib/orders";
import { getAuthUser } from "@/lib/supabase-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthUser();
  const orders = user ? await listOrdersForUser(user.id) : [];
  const spent = orders.reduce((sum, o) => sum + o.total, 0);
  const active = orders.filter((o) => !["completed", "canceled", "refunded"].includes(o.status)).length;

  return (
    <DashboardShell title="Dashboard">
      {!user && (
        <p className="muted mb-4 text-sm">
          <Link href="/login?next=/dashboard" className="text-[#6ea8ff]">
            Sign in
          </Link>{" "}
          to see your orders and wallet.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/dashboard/new-order" className="btn btn-primary">
          New order
        </Link>
        <Link href="/dashboard/wallet" className="btn btn-ghost">
          Wallet
        </Link>
        <Link href="/dashboard/api" className="btn btn-ghost">
          API key
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Spent", money(spent)],
          ["Orders", String(orders.length)],
          ["Active", String(active)],
        ].map(([k, v]) => (
          <div key={k} className="glass p-4">
            <p className="muted text-xs">{k}</p>
            <p className="mt-2 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="glass mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[#9aa3b5]">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {!orders.length && (
              <tr>
                <td className="px-4 py-6 text-[#9aa3b5]" colSpan={4}>
                  No orders yet.
                </td>
              </tr>
            )}
            {orders.slice(0, 8).map((o) => (
              <tr key={o.publicId} className="border-t border-white/8">
                <td className="px-4 py-3">
                  <Link className="text-[#6ea8ff]" href={`/track/${o.publicId}`}>
                    #{o.publicId}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.serviceName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
