"use client";

import { AdminShell } from "@/components/AdminShell";
import type { StoredTicket } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<StoredTicket[]>([]);
  const [active, setActive] = useState<StoredTicket | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/tickets", { cache: "no-store" });
    const json = await res.json();
    const list = (json.tickets ?? []) as StoredTicket[];
    setTickets(list);
    setActive((prev) => list.find((t) => t.id === prev?.id) ?? list[0] ?? null);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function send(status?: StoredTicket["status"]) {
    if (!active) return;
    const res = await fetch("/api/tickets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, body: reply || "Status updated", status }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Update failed");
      return;
    }
    setReply("");
    await load();
  }

  return (
    <AdminShell title="Support tickets">
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {!tickets.length && <p className="muted text-sm">No tickets yet. New ones from /support appear here.</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {tickets.map((t) => (
            <article
              key={t.id}
              className={`glass cursor-pointer p-4 ${active?.id === t.id ? "border-white/30" : ""}`}
              onClick={() => setActive(t)}
            >
              <p className="font-mono text-sm">Ticket #{t.id}</p>
              <p className="mt-1">{t.subject}</p>
              <p className="muted text-sm capitalize">
                {t.category} · {t.status}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                {t.messages.map((m, i) => (
                  <div key={i} className={m.role === "agent" ? "rounded-xl border border-white/10 p-3" : "rounded-xl bg-white/5 p-3"}>
                    {m.role}: {m.body}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className="glass h-fit p-4 text-sm">
          <p className="font-semibold">Reply</p>
          {active ? (
            <>
              <p className="muted mt-2">Order: {active.orderId || "none"}</p>
              <textarea className="field mt-3 min-h-24" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Agent reply" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => send(active.status)}>Send</button>
                <button className="btn btn-ghost" onClick={() => send("waiting")}>Waiting</button>
                <button className="btn btn-ghost" onClick={() => send("closed")}>Close</button>
              </div>
            </>
          ) : (
            <p className="muted mt-2">Select a ticket.</p>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
