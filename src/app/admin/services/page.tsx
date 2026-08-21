"use client";

import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import type { PriceMode, Service, SiteSettings } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type Row = Service & {
  profitPerThousand: number;
  providerName: string | null;
  providerRate: string | null;
  liveCost: number | null;
  suggestedProviderId: number | null;
};

type Draft = {
  name: string;
  priceMode: PriceMode;
  markupMultiplier: number;
  ratePerThousand: number;
  costPerThousand: number;
  min: number;
  max: number;
  refill: boolean;
  refillDays: number;
  visible: boolean;
  active: boolean;
  providerServiceId: string;
  description: string;
};

function toDraft(row: Row): Draft {
  return {
    name: row.name,
    priceMode: row.priceMode,
    markupMultiplier: row.markupMultiplier,
    ratePerThousand: row.ratePerThousand,
    costPerThousand: row.costPerThousand,
    min: row.min,
    max: row.max,
    refill: row.refill,
    refillDays: row.refillDays,
    visible: row.visible,
    active: row.active,
    providerServiceId: row.providerServiceId ? String(row.providerServiceId) : "",
    description: row.description,
  };
}

export default function AdminServicesPage() {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [bulkMultiplier, setBulkMultiplier] = useState(1.8);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/catalog", { cache: "no-store" });
    const json = await res.json();
    if (json.error) setError(json.error);
    const list = (json.services ?? []) as Row[];
    setRows(list);
    setSettings(json.settings ?? null);
    setDrafts(Object.fromEntries(list.map((row) => [row.id, toDraft(row)])));
    if (json.settings?.defaultMarkupMultiplier) {
      setBulkMultiplier(json.settings.defaultMarkupMultiplier);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (platform !== "all" && row.platform !== platform) return false;
      if (!needle) return true;
      return `${row.id} ${row.name} ${row.category} ${row.platform}`.toLowerCase().includes(needle);
    });
  }, [rows, q, platform]);

  function patch(id: string, next: Partial<Draft>) {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const merged = { ...current, ...next };
      if (next.priceMode === "multiplier" || next.markupMultiplier !== undefined || next.costPerThousand !== undefined) {
        if (merged.priceMode === "multiplier") {
          merged.ratePerThousand = Number((merged.costPerThousand * merged.markupMultiplier).toFixed(4));
        }
      }
      if (next.ratePerThousand !== undefined && merged.priceMode === "fixed" && merged.costPerThousand > 0) {
        merged.markupMultiplier = Number((merged.ratePerThousand / merged.costPerThousand).toFixed(4));
      }
      return { ...prev, [id]: merged };
    });
  }

  async function save(ids: string[]) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const services = Object.fromEntries(
        ids.map((id) => {
          const draft = drafts[id];
          return [
            id,
            {
              name: draft.name,
              priceMode: draft.priceMode,
              markupMultiplier: Number(draft.markupMultiplier),
              ratePerThousand: Number(draft.ratePerThousand),
              costPerThousand: Number(draft.costPerThousand),
              min: Number(draft.min),
              max: Number(draft.max),
              refill: draft.refill,
              refillDays: Number(draft.refillDays),
              visible: draft.visible,
              active: draft.active,
              providerServiceId: draft.providerServiceId.trim() ? Number(draft.providerServiceId) : null,
              description: draft.description,
            },
          ];
        }),
      );
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaved(`Saved ${ids.length} service${ids.length === 1 ? "" : "s"}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyBulkMultiplier() {
    const next = Object.fromEntries(
      filtered.map((row) => {
        const draft = drafts[row.id];
        return [
          row.id,
          {
            ...draft,
            priceMode: "multiplier" as const,
            markupMultiplier: Number(bulkMultiplier),
            ratePerThousand: Number((draft.costPerThousand * Number(bulkMultiplier)).toFixed(4)),
          },
        ];
      }),
    );
    setDrafts((prev) => ({ ...prev, ...next }));
    await save(filtered.map((row) => row.id));
  }

  const platforms = Array.from(new Set(rows.map((r) => r.platform)));

  return (
    <AdminShell title="Service management">
      <p className="muted mb-4 text-sm">
        Retail price is either cost × profit multiplier, or a fixed per-1K rate you set. Changes apply to checkout, service pages, and the reseller API immediately.
      </p>
      {settings && (
        <p className="muted mb-4 text-sm">
          Global default multiplier is <strong className="text-white">{settings.defaultMarkupMultiplier}×</strong>. Change it in Settings, then apply below to existing items.
        </p>
      )}
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {saved && <p className="mb-4 text-sm text-[#3ddc97]">{saved}</p>}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <input className="field w-full max-w-xs" placeholder="Search services" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field w-full max-w-[160px] cursor-pointer" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p} className="capitalize">
              {p}
            </option>
          ))}
        </select>
        <label className="text-sm">
          <span className="muted mb-1 block">Apply multiplier</span>
          <input
            className="field w-28"
            type="number"
            min={1}
            step={0.05}
            value={bulkMultiplier}
            onChange={(e) => setBulkMultiplier(Number(e.target.value))}
          />
        </label>
        <button className="btn btn-ghost w-full sm:w-auto" disabled={busy} onClick={applyBulkMultiplier}>
          Apply to filtered
        </button>
        <button className="btn btn-primary w-full sm:w-auto" disabled={busy} onClick={() => save(Object.keys(drafts))}>
          {busy ? "Saving…" : "Save all"}
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((row) => {
          const draft = drafts[row.id];
          if (!draft) return null;
          const retail =
            draft.priceMode === "multiplier"
              ? draft.costPerThousand * draft.markupMultiplier
              : draft.ratePerThousand;
          const profit = retail - draft.costPerThousand;
          const isOpen = expanded === row.id;
          return (
            <article key={row.id} className="glass p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#9aa3b5]">
                    {row.platform} · #{row.id}
                  </p>
                  <input
                    className="field mt-1 max-w-md"
                    value={draft.name}
                    onChange={(e) => patch(row.id, { name: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="btn btn-ghost min-h-9 px-3">
                    <input type="checkbox" checked={draft.visible} onChange={(e) => patch(row.id, { visible: e.target.checked })} />
                    Visible
                  </label>
                  <label className="btn btn-ghost min-h-9 px-3">
                    <input type="checkbox" checked={draft.active} onChange={(e) => patch(row.id, { active: e.target.checked })} />
                    Active
                  </label>
                  <button className="btn btn-ghost min-h-9" onClick={() => setExpanded(isOpen ? null : row.id)}>
                    {isOpen ? "Hide" : "Edit"}
                  </button>
                  <button className="btn btn-primary min-h-9" disabled={busy} onClick={() => save([row.id])}>
                    Save
                  </button>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <dt className="muted">Cost / 1K</dt>
                  <dd>
                    <input
                      className="field mt-1"
                      type="number"
                      step={0.0001}
                      value={draft.costPerThousand}
                      onChange={(e) => patch(row.id, { costPerThousand: Number(e.target.value) })}
                    />
                    {row.liveCost != null && (
                      <p className="muted mt-1 text-xs">Provider now {money(row.liveCost)}</p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="muted">Profit multiplier</dt>
                  <dd>
                    <input
                      className="field mt-1"
                      type="number"
                      min={1}
                      step={0.05}
                      value={draft.markupMultiplier}
                      onChange={(e) => patch(row.id, { markupMultiplier: Number(e.target.value), priceMode: "multiplier" })}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="muted">Retail / 1K</dt>
                  <dd>
                    <input
                      className="field mt-1"
                      type="number"
                      step={0.0001}
                      value={Number(retail.toFixed(4))}
                      onChange={(e) =>
                        patch(row.id, { ratePerThousand: Number(e.target.value), priceMode: "fixed" })
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="muted">Your profit / 1K</dt>
                  <dd className="mt-2 font-semibold text-[#3ddc97]">{money(profit)}</dd>
                </div>
                <div>
                  <dt className="muted">Price mode</dt>
                  <dd>
                    <select
                      className="field mt-1 cursor-pointer"
                      value={draft.priceMode}
                      onChange={(e) => patch(row.id, { priceMode: e.target.value as PriceMode })}
                    >
                      <option value="multiplier">Multiplier</option>
                      <option value="fixed">Fixed rate</option>
                    </select>
                  </dd>
                </div>
              </dl>
              {isOpen && (
                <div className="mt-4 grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    <span className="muted mb-1 block">Min qty</span>
                    <input className="field" type="number" value={draft.min} onChange={(e) => patch(row.id, { min: Number(e.target.value) })} />
                  </label>
                  <label className="text-sm">
                    <span className="muted mb-1 block">Max qty</span>
                    <input className="field" type="number" value={draft.max} onChange={(e) => patch(row.id, { max: Number(e.target.value) })} />
                  </label>
                  <label className="text-sm">
                    <span className="muted mb-1 block">Provider service ID</span>
                    <input
                      className="field font-mono"
                      value={draft.providerServiceId}
                      placeholder={row.suggestedProviderId ? String(row.suggestedProviderId) : "unmapped"}
                      onChange={(e) => patch(row.id, { providerServiceId: e.target.value })}
                    />
                    {row.providerName && <p className="muted mt-1 text-xs">{row.providerName}</p>}
                  </label>
                  <label className="text-sm">
                    <span className="muted mb-1 block">Refill days</span>
                    <input className="field" type="number" value={draft.refillDays} onChange={(e) => patch(row.id, { refillDays: Number(e.target.value), refill: Number(e.target.value) > 0 })} />
                  </label>
                  <label className="btn btn-ghost sm:col-span-2">
                    <input type="checkbox" checked={draft.refill} onChange={(e) => patch(row.id, { refill: e.target.checked, refillDays: e.target.checked ? Math.max(draft.refillDays, 30) : 0 })} />
                    Refill included
                  </label>
                  <label className="text-sm sm:col-span-2 lg:col-span-4">
                    <span className="muted mb-1 block">Description</span>
                    <textarea className="field min-h-20" value={draft.description} onChange={(e) => patch(row.id, { description: e.target.value })} />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
