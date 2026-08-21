"use client";

import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import type { GiftCard, PromoCode } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AdminCommercePage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [gifts, setGifts] = useState<GiftCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", type: "percent" as "percent" | "fixed", value: 10, maxUses: 100 });
  const [giftAmount, setGiftAmount] = useState(25);
  const [giftCode, setGiftCode] = useState("");

  async function load() {
    const res = await fetch("/api/admin/commerce", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load");
    setPromos(json.promoCodes ?? []);
    setGifts(json.giftCards ?? []);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function createPromo() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "promo", promo: promoForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setNote(`Promo ${json.promo.code} saved`);
      setPromoForm({ code: "", type: "percent", value: 10, maxUses: 100 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function createGift() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "gift",
          gift: { amount: giftAmount, code: giftCode || undefined },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setNote(`Gift card ${json.gift.code} created for ${money(json.gift.amount)}`);
      setGiftCode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Promos & gift cards">
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {note && <p className="mb-4 text-sm text-[#3ddc97]">{note}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass space-y-3 p-5">
          <p className="font-semibold">New promo code</p>
          <input
            className="field"
            placeholder="Code"
            value={promoForm.code}
            onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="field cursor-pointer"
              value={promoForm.type}
              onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as "percent" | "fixed" })}
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed $ off</option>
            </select>
            <input
              className="field"
              type="number"
              value={promoForm.value}
              onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) })}
            />
          </div>
          <input
            className="field"
            type="number"
            value={promoForm.maxUses}
            onChange={(e) => setPromoForm({ ...promoForm, maxUses: Number(e.target.value) })}
            placeholder="Max uses"
          />
          <button type="button" className="btn btn-primary" disabled={busy || !promoForm.code.trim()} onClick={createPromo}>
            Save promo
          </button>
          <div className="space-y-2 pt-2">
            {promos.map((p) => (
              <div key={p.code} className="flex justify-between border-t border-white/8 py-2 text-sm">
                <span className="font-mono">{p.code}</span>
                <span className="muted">
                  {p.type === "percent" ? `${p.value}%` : money(p.value)} · {p.uses}/{p.maxUses}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass space-y-3 p-5">
          <p className="font-semibold">New gift card</p>
          <input
            className="field"
            placeholder="Code (optional)"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
          />
          <input
            className="field"
            type="number"
            min={1}
            value={giftAmount}
            onChange={(e) => setGiftAmount(Number(e.target.value))}
          />
          <button type="button" className="btn btn-primary" disabled={busy || giftAmount <= 0} onClick={createGift}>
            Create gift card
          </button>
          <div className="space-y-2 pt-2">
            {gifts.map((g) => (
              <div key={g.code} className="flex justify-between border-t border-white/8 py-2 text-sm">
                <span className="font-mono">{g.code}</span>
                <span className="muted">
                  {money(g.remaining)} / {money(g.amount)}
                </span>
              </div>
            ))}
            {!gifts.length && <p className="muted text-sm">No gift cards yet.</p>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
