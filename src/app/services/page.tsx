"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { platforms as seedPlatforms } from "@/lib/catalog";
import { money } from "@/lib/format";
import type { Platform, Service } from "@/lib/types";

export default function ServicesPage() {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");
  const [refill, setRefill] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(seedPlatforms);

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((json) => {
        setServices(json.services ?? []);
        if (json.platforms?.length) setPlatforms(json.platforms);
      })
      .catch(() => undefined);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return services.filter((s) => {
      if (platform !== "all" && s.platform !== platform) return false;
      if (refill && !s.refill) return false;
      if (needle && !`${s.name} ${s.category} ${s.platform} ${s.quality}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, platform, refill, services]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Services</h1>
      <p className="muted mt-2">Filter by platform, refill, quality, or search.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_200px_auto]">
        <input
          className="field"
          placeholder="Search Instagram followers"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field cursor-pointer" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {platforms.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="btn btn-ghost cursor-pointer">
          <input type="checkbox" checked={refill} onChange={(e) => setRefill(e.target.checked)} />
          Refill available
        </label>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((s) => (
          <Link key={s.id} href={`/services/${s.platform}/${s.slug}`} className="glass lift p-5 hover:border-white/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9aa3b5]">{s.platform}</p>
                <h2 className="mt-1 font-semibold">{s.name}</h2>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">{s.quality}</span>
            </div>
            <p className="mt-4 text-lg font-semibold">{money(s.ratePerThousand)} / 1K</p>
            <div className="muted mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/5 px-2 py-1">{s.delivery} start</span>
              {s.refill && <span className="rounded-full bg-white/5 px-2 py-1">Refill</span>}
              <span className="rounded-full bg-white/5 px-2 py-1">No password</span>
            </div>
            <span className="btn btn-primary mt-4 w-full">Order</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
