import { getPlatform } from "@/lib/catalog";
import { getLiveServicesByPlatform } from "@/lib/live-catalog";
import { money } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlatformServicesPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const p = getPlatform(platform);
  if (!p) notFound();
  const list = await getLiveServicesByPlatform(platform);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">Platform</p>
      <h1 className="mt-2 text-3xl font-semibold">{p.name}</h1>
      <p className="muted mt-2">{p.tagline}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Link key={s.id} href={`/services/${s.platform}/${s.slug}`} className="glass p-5 hover:border-white/20">
            <div className="flex justify-between">
              <h2 className="font-semibold">{s.category}</h2>
              <span className="text-sm text-[#9aa3b5]">{s.quality}</span>
            </div>
            <p className="mt-4 text-xl font-semibold">{money(s.ratePerThousand)} / 1K</p>
            <p className="muted mt-2 text-sm">
              Min {s.min.toLocaleString()} · Max {s.max.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
