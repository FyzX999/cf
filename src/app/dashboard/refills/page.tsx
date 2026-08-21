import { DashboardShell } from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { demoRefills } from "@/lib/demo-data";

export default function RefillsPage() {
  const r = demoRefills[0];
  return (
    <DashboardShell title="Refills">
      <div className="glass max-w-lg p-6">
        <p className="font-mono text-sm">Order #{r.orderId}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="muted">Original quantity</dt>
            <dd>{r.original.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="muted">Current quantity</dt>
            <dd>{r.current.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="muted">Protected quantity</dt>
            <dd>{r.protectedQty.toLocaleString()}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[#3ddc97]">Refill available</p>
        <div className="mt-6 rounded-xl border border-white/10 p-4">
          <p className="text-sm">Refill #{r.id}</p>
          <div className="mt-2">
            <StatusBadge status={r.status} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
