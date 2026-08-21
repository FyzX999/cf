import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { listOrdersForUser } from "@/lib/orders";
import { getAuthUser } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/dashboard/orders");
  const orders = await listOrdersForUser(user.id);

  return (
    <DashboardShell title="My Orders">
      <p className="muted mb-4 text-sm">
        {orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"} on this account.` : "You have not placed any orders yet."}
      </p>
      {!orders.length && (
        <Link href="/dashboard/new-order" className="btn btn-primary">
          Place your first order
        </Link>
      )}
      <div className="space-y-3 lg:hidden">
        {orders.map((o) => (
          <Link key={o.publicId} href={`/track/${o.publicId}`} className="glass lift block p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm">#{o.publicId}</p>
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-2">{o.serviceName}</p>
            <p className="muted text-sm">
              {o.quantity.toLocaleString()} · {money(o.total)} · {new Date(o.startedAt).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
      <div className="glass hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="text-[#9aa3b5]">
            <tr>
              {["Order", "Service", "Qty", "Total", "Status", "Date"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.publicId} className="border-t border-white/8">
                <td className="px-4 py-3">
                  <Link href={`/track/${o.publicId}`} className="text-[#6ea8ff]">#{o.publicId}</Link>
                </td>
                <td className="px-4 py-3">{o.serviceName}</td>
                <td className="px-4 py-3">{o.quantity.toLocaleString()}</td>
                <td className="px-4 py-3">{money(o.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">{new Date(o.startedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
