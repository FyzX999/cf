import { DashboardShell } from "@/components/DashboardShell";
import { money } from "@/lib/format";
import { readStore } from "@/lib/admin-store";
import { getLiveCatalog } from "@/lib/live-catalog";

export const dynamic = "force-dynamic";

export default async function ResellerPage() {
  const [store, catalog] = await Promise.all([readStore(), getLiveCatalog({ publicOnly: true })]);
  const sample = catalog.find((s) => s.category === "Followers") ?? catalog[0];
  const cost = sample?.costPerThousand ?? 0;
  const retail = sample?.ratePerThousand ?? 0;
  const resellerPrice = Number((retail * (1 - store.settings.resellerDiscountPercent / 100)).toFixed(4));
  return (
    <DashboardShell title="Reseller">
      <p className="muted mb-6 text-sm">
        Reseller discount is {store.settings.resellerDiscountPercent}% off retail, configured in admin settings.
      </p>
      <div className="glass mt-6 max-w-lg p-5">
        <h2 className="font-semibold">Pricing example{sample ? ` · ${sample.name}` : ""}</h2>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div><dt className="muted">Your cost</dt><dd>{money(resellerPrice)}</dd></div>
          <div><dt className="muted">Retail</dt><dd>{money(retail)}</dd></div>
          <div><dt className="muted">Your profit / 1K</dt><dd>{money(retail - resellerPrice)}</dd></div>
        </dl>
        <p className="muted mt-4 text-xs">Provider cost is {money(cost)} / 1K at the current catalog multiplier.</p>
      </div>
    </DashboardShell>
  );
}
