import { DashboardShell } from "@/components/DashboardShell";
import { getLiveCatalog } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardServicesPage() {
  const services = await getLiveCatalog({ publicOnly: true });
  return (
    <DashboardShell title="Services">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {services.slice(0, 18).map((s) => (
          <Link key={s.id} href={`/services/${s.platform}/${s.slug}`} className="glass p-4">
            <p className="text-xs uppercase text-[#9aa3b5]">{s.platform}</p>
            <p className="mt-1 font-medium">{s.name}</p>
            <p className="mt-2">{money(s.ratePerThousand)} / 1K</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
