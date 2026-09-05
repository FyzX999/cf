"use client";

import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import type { GiftCard, PromoCode } from "@/lib/types";
import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";

export default function AdminCommercePage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [gifts, setGifts] = useState<GiftCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promoForm, setPromoForm] = useState({ 
    code: "", 
    type: "percent" as "percent" | "fixed", 
    value: 10, 
    maxUses: 100,
    minOrder: 0,
    newUsersOnly: false,
    firstOrderOnly: false,
    expiresAt: ""
  });
  const [giftAmount, setGiftAmount] = useState(25);
  const [giftCode, setGiftCode] = useState("");
  const [giftCount, setGiftCount] = useState(1);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugBusy, setDebugBusy] = useState(false);

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
      setPromoForm({ 
        code: "", 
        type: "percent", 
        value: 10, 
        maxUses: 100, 
        minOrder: 0,
        newUsersOnly: false,
        firstOrderOnly: false,
        expiresAt: ""
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePromo(code: string) {
    if (!confirm(`Delete promo code ${code}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/commerce", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "promo", code }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete");
      }
      setNote(`Promo ${code} deleted`);
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
          count: giftCount
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      
      if (giftCount > 1) {
        setNote(`Created ${giftCount} gift cards for ${money(giftAmount)} each`);
      } else {
        setNote(`Gift card ${json.gift.code} created for ${money(json.gift.amount)}`);
      }
      
      setGiftCode("");
      setGiftCount(1);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function debugCashApp() {
    setDebugBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cashapp-debug");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Debug failed");
      setDebugData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debug failed");
    } finally {
      setDebugBusy(false);
    }
  }

  return (
    <AdminShell title="Promos & gift cards">
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {note && <p className="mb-4 text-sm text-[#3ddc97]">{note}</p>}

      {/* CashApp Debug Section */}
      <div className="glass mb-6 p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">CashApp Payment Debug</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={debugBusy}
            onClick={debugCashApp}
          >
            {debugBusy ? "Checking..." : "Check Recent Emails"}
          </button>
        </div>
        {debugData && (
          <div className="mt-4 space-y-3">
            <div className="text-sm">
              <p className="muted mb-2">{debugData.message}</p>
              <div className="rounded bg-black/30 p-3 font-mono text-xs">
                <p>Email: {debugData.config?.email}</p>
                <p>IMAP: {debugData.config?.imapHost}:{debugData.config?.imapPort}</p>
                <p>CashApp Tag: {debugData.config?.cashappTag}</p>
              </div>
            </div>
            {debugData.emails && debugData.emails.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Recent Emails ({debugData.emails.length}):</p>
                {debugData.emails.map((email: any, idx: number) => (
                  <div key={idx} className="rounded border border-white/10 bg-black/20 p-3 text-xs">
                    <div className="mb-2 flex justify-between">
                      <span className="font-semibold">{email.subject}</span>
                      <span className="muted">{new Date(email.date).toLocaleString()}</span>
                    </div>
                    <div className="space-y-1 font-mono">
                      <p className="text-green-400">
                        Amount: {email.parsed?.amount ? `$${email.parsed.amount}` : '❌ Not found'}
                      </p>
                      <p className="text-blue-400">
                        Note: {email.parsed?.note || '❌ Not found'}
                      </p>
                    </div>
                    {email.textPreview && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-gray-400">Show text preview</summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500">
                          {email.textPreview}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
          <div className="grid grid-cols-2 gap-2">
            <input
              className="field"
              type="number"
              value={promoForm.maxUses}
              onChange={(e) => setPromoForm({ ...promoForm, maxUses: Number(e.target.value) })}
              placeholder="Max uses"
            />
            <input
              className="field"
              type="number"
              value={promoForm.minOrder}
              onChange={(e) => setPromoForm({ ...promoForm, minOrder: Number(e.target.value) })}
              placeholder="Min order $"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-xs text-[#9aa3b5]">Expires at (optional)</label>
            <input
              className="field"
              type="datetime-local"
              value={promoForm.expiresAt}
              onChange={(e) => setPromoForm({ ...promoForm, expiresAt: e.target.value })}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/5">
            <input
              type="checkbox"
              checked={promoForm.newUsersOnly}
              onChange={(e) => setPromoForm({ ...promoForm, newUsersOnly: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            <span>New users only</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/5">
            <input
              type="checkbox"
              checked={promoForm.firstOrderOnly}
              onChange={(e) => setPromoForm({ ...promoForm, firstOrderOnly: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            <span>First order only</span>
          </label>

          <button type="button" className="btn btn-primary" disabled={busy || !promoForm.code.trim()} onClick={createPromo}>
            Save promo
          </button>
          <div className="space-y-2 pt-2">
            {promos.map((p) => (
              <div key={p.code} className="flex items-center justify-between border-t border-white/8 py-2 text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{p.code}</span>
                    {p.newUsersOnly && (
                      <span className="text-xs text-blue-400">New Users</span>
                    )}
                    {p.firstOrderOnly && (
                      <span className="text-xs text-purple-400">First Order</span>
                    )}
                  </div>
                  <span className="muted text-xs">
                    {p.type === "percent" ? `${p.value}%` : money(p.value)} off
                    {p.minOrder > 0 && ` · Min $${p.minOrder}`}
                    {' '} · {p.uses}/{p.maxUses} uses
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deletePromo(p.code)}
                  className="text-red-400 hover:text-red-300"
                  disabled={busy}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass space-y-3 p-5">
          <p className="font-semibold">New gift card</p>
          <input
            className="field"
            placeholder="Code (optional, auto-generated if empty)"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Amount</label>
              <input
                className="field"
                type="number"
                min={1}
                value={giftAmount}
                onChange={(e) => setGiftAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Quantity</label>
              <input
                className="field"
                type="number"
                min={1}
                max={100}
                value={giftCount}
                onChange={(e) => setGiftCount(Number(e.target.value))}
              />
            </div>
          </div>
          <button type="button" className="btn btn-primary" disabled={busy || giftAmount <= 0} onClick={createGift}>
            {giftCount > 1 ? `Create ${giftCount} gift cards` : 'Create gift card'}
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