import Link from "next/link";
import { platforms } from "@/lib/catalog";
import { getLiveServicesByPlatform } from "@/lib/live-catalog";

export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  const grouped = await Promise.all(platforms.map(async (p) => ({ p, list: await getLiveServicesByPlatform(p.slug) })));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Platforms</h1>
      <p className="muted mt-2">Each catalog is independent so we can add networks without redesigning the marketplace.</p>
      <div className="mt-8 space-y-8">
        {grouped.map(({ p, list }) => (
          <section key={p.slug} className="glass p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <Link href={`/services/${p.slug}`} className="text-sm text-[#6ea8ff]">
                Browse {p.name}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {list.map((s) => (
                <Link
                  key={s.id}
                  href={`/services/${s.platform}/${s.slug}`}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
                >
                  {s.category}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
