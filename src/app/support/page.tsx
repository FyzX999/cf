"use client";

import { useState } from "react";

const categories = [
  "Order Issue",
  "Payment Issue",
  "Refill Request",
  "Account Issue",
  "API Issue",
  "Service Question",
  "Other",
];

export default function SupportPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Support center</h1>
      <p className="muted mt-2 text-sm">Tickets are threaded like a conversation. Agents see your orders, payments, and history.</p>
      {sent ? (
        <div className="glass mt-6 p-5">Ticket #{sent} opened. We&apos;ll reply in your dashboard inbox.</div>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const form = e.currentTarget;
            const data = new FormData(form);
            try {
              const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  category: String(data.get("category") || "Other"),
                  subject: String(data.get("subject") || ""),
                  orderId: String(data.get("orderId") || ""),
                  body: String(data.get("body") || ""),
                }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || "Could not open ticket");
              setSent(json.ticket.id);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not open ticket");
            } finally {
              setBusy(false);
            }
          }}
        >
          <select className="field cursor-pointer" name="category" defaultValue={categories[0]}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input className="field" name="subject" placeholder="Subject" required />
          <input className="field" name="orderId" placeholder="Order number (optional)" />
          <textarea className="field min-h-32" name="body" placeholder="Describe the issue" required />
          {error && <p className="text-sm text-[#f07167]">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Opening…" : "Open ticket"}
          </button>
        </form>
      )}
    </div>
  );
}
