import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import { getProviderBalance, isProviderConfigured } from "@/lib/provider";
import { listOrders } from "@/lib/orders";
import { readStore } from "@/lib/admin-store";
import { getLiveCatalog } from "@/lib/live-catalog";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [orders, store, catalog] = await Promise.all([listOrders(), readStore(), getLiveCatalog()]);
  const today = new Date().toISOString().slice(0, 10);
  const todays = orders.filter((o) => o.startedAt.slice(0, 10) === today);
  const revenueToday = todays.reduce((sum, o) => sum + o.total, 0);
  const allRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const active = orders.filter((o) => !["completed", "canceled", "refunded"].includes(o.status)).length;
  const failed = orders.filter((o) => ["canceled", "refunded", "partial"].includes(o.status)).length;
  const avgMarkup =
    catalog.length === 0 ? 0 : catalog.reduce((sum, s) => sum + s.markupMultiplier, 0) / catalog.length;
  const estimatedProfit = orders.reduce((sum, order) => {
    const service = catalog.find((s) => s.name === order.serviceName);
    if (!service || service.ratePerThousand <= 0) return sum;
    const costShare = service.costPerThousand / service.ratePerThousand;
    return sum + order.total * (1 - costShare);
  }, 0);

  let providerLabel = "Not configured";
  if (isProviderConfigured()) {
    try {
      const balance = await getProviderBalance();
      providerLabel = `${balance.balance} ${balance.currency}`;
    } catch (error) {
      providerLabel = error instanceof Error ? error.message : "Provider error";
    }
  }

  const cards = [
    ["Provider balance", providerLabel],
    ["Revenue today", money(revenueToday)],
    ["Orders today", todays.length],
    ["Active orders", active],
    ["All-time revenue", money(allRevenue)],
    ["Est. profit", money(estimatedProfit)],
    ["Failed / partial", failed],
    ["Open tickets", store.tickets.filter((t) => t.status !== "closed").length],
    ["Avg profit ×", `${avgMarkup.toFixed(2)}×`],
    ["Live services", catalog.filter((s) => s.visible && s.active).length],
  ];

  return (
    <AdminShell title="Control center">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([k, v]) => (
          <div key={String(k)} className="glass p-4">
            <p className="muted text-xs">{k}</p>
            <p className="mt-2 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="glass mt-8 p-5">
        <h2 className="font-semibold">Live activity</h2>
        {orders.length === 0 ? (
          <p className="muted mt-4 text-sm">No orders yet. Placed checkouts will show up here.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {orders.slice(0, 12).map((o) => (
              <li key={o.publicId} className="flex justify-between gap-4 border-b border-white/8 pb-3 last:border-0">
                <span>
                  #{o.publicId} · {o.serviceName} · {money(o.total)}
                </span>
                <span className="muted capitalize">{o.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
