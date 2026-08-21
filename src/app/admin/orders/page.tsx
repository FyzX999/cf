"use client";

import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import type { PublicOrder } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PublicOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    const json = await res.json();
    setRows(json.orders ?? []);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function act(id: string, action: "cancel" | "refill") {
    if (!confirm(`Confirm ${action} for ${id}?`)) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || `${action} failed`);
      return;
    }
    await load();
  }

  const filtered = rows.filter((o) =>
    `${o.publicId} ${o.serviceName} ${o.link}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AdminShell title="Order management">
      <input
        className="field mb-4 max-w-md"
        placeholder="Search order ID, service, or target URL"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {!filtered.length && <p className="muted text-sm">No live orders yet. Place one from checkout to see it here.</p>}
      <div className="space-y-4">
        {filtered.map((o) => (
          <article key={o.publicId} className="glass p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono">#{o.publicId}</h2>
              <StatusBadge status={o.status} />
            </div>
            <p className="muted mt-2 text-sm">Created → Paid → Provider → Processing → Delivery → Completed</p>
            <p className="mt-2 text-sm">{o.serviceName} · {o.link}</p>
            <p className="muted mt-1 text-sm">
              {o.delivered.toLocaleString()} / {o.quantity.toLocaleString()} delivered
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-ghost" onClick={() => act(o.publicId, "refill")}>Add refill</button>
              <button className="btn btn-ghost" onClick={() => act(o.publicId, "cancel")}>Cancel</button>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
