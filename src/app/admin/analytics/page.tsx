import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import { listOrders } from "@/lib/orders";
import { getLiveCatalog } from "@/lib/live-catalog";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const [orders, catalog] = await Promise.all([listOrders(), getLiveCatalog()]);
  const byPlatform = new Map<string, number>();
  for (const order of orders) {
    byPlatform.set(order.platform, (byPlatform.get(order.platform) ?? 0) + order.total);
  }
  const total = Array.from(byPlatform.values()).reduce((a, b) => a + b, 0) || 1;
  const mix = Array.from(byPlatform.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, pct: Math.round((amount / total) * 100), amount }));
  const avg = orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0;
  const popular = [...orders.reduce((map, o) => map.set(o.serviceName, (map.get(o.serviceName) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0];
  const mostProfit = catalog.slice().sort((a, b) => b.ratePerThousand - b.costPerThousand - (a.ratePerThousand - a.costPerThousand))[0];

  return (
    <AdminShell title="Analytics">
      <p className="muted mb-6 text-sm">Built from live orders and the current catalog, not placeholder numbers.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="glass p-5">
          <h2 className="font-semibold">Revenue by platform</h2>
          <div className="mt-4 space-y-3">
            {mix.length === 0 && <p className="muted text-sm">No orders yet.</p>}
            {mix.map((m) => (
              <div key={m.name}>
                <div className="mb-1 flex justify-between text-sm capitalize">
                  <span>{m.name}</span>
                  <span>{m.pct}% · {money(m.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-[#6ea8ff]" style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass grid grid-cols-2 gap-4 p-5 text-sm">
          <div>
            <p className="muted">Avg order value</p>
            <p className="mt-1 text-xl font-semibold">{money(avg)}</p>
          </div>
          <div>
            <p className="muted">Orders tracked</p>
            <p className="mt-1 text-xl font-semibold">{orders.length}</p>
          </div>
          <div>
            <p className="muted">Most ordered</p>
            <p className="mt-1 text-xl font-semibold">{popular?.[0] ?? "—"}</p>
          </div>
          <div>
            <p className="muted">Highest profit / 1K</p>
            <p className="mt-1 text-xl font-semibold">{mostProfit?.name ?? "—"}</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
