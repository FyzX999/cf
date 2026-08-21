import { DashboardShell } from "@/components/DashboardShell";
import { getLiveCatalog } from "@/lib/live-catalog";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const services = await getLiveCatalog({ publicOnly: true });
  return (
    <DashboardShell title="Favorites">
      <div className="grid gap-3 sm:grid-cols-2">
        {services.filter((s) => s.refill).slice(0, 6).map((s) => (
          <Link key={s.id} href={`/services/${s.platform}/${s.slug}`} className="glass p-4">
            {s.name}
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
