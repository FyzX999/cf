"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { PaymentButtons } from "@/components/PaymentButtons";
import { money } from "@/lib/format";
import type { WalletTxn } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/wallet", { cache: "no-store" });
    if (!res.ok) {
      setBalance(null);
      return;
    }
    const json = await res.json();
    setBalance(Number(json.balance ?? 0));
    setTransactions(json.transactions ?? []);
  }

  useEffect(() => {
    load().catch(() => undefined);
    const paid = new URLSearchParams(window.location.search).get("paid");
    if (paid) setNote("Deposit received. Balance updates automatically after confirmation.");
    const t = setInterval(() => load().catch(() => undefined), 4000);
    return () => clearInterval(t);
  }, []);

  async function redeem() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Redeem failed");
      setBalance(Number(json.balance));
      setNote(`Redeemed ${money(json.credited)}. Remaining on card: ${money(json.remaining)}`);
      setCode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redeem failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell title="Wallet">
      {balance === null ? (
        <p className="muted text-sm">
          <Link href="/login?next=/dashboard/wallet" className="text-[#6ea8ff]">
            Sign in
          </Link>{" "}
          to manage funds, gift cards, and API payments.
        </p>
      ) : (
        <>
          <div className="glass max-w-lg space-y-4 p-6">
            <p className="muted text-sm">Available balance</p>
            <p className="mt-2 text-4xl font-semibold">{money(balance)}</p>
            <label className="block text-sm">
              <span className="muted mb-1 block">Deposit amount (USD)</span>
              <input
                className="field"
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
            <PaymentButtons kind="wallet" amount={amount} />
            <Link href="/dashboard/transactions" className="btn btn-ghost">
              History
            </Link>
            {note && <p className="text-sm text-[#3ddc97]">{note}</p>}
          </div>

          <div className="glass mt-6 max-w-lg space-y-3 p-6">
            <p className="text-sm font-semibold">Redeem gift card</p>
            <div className="flex gap-2">
              <input
                className="field"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Gift card code"
              />
              <button type="button" className="btn btn-ghost shrink-0" disabled={busy || !code.trim()} onClick={redeem}>
                Redeem
              </button>
            </div>
            {error && <p className="text-sm text-[#f07167]">{error}</p>}
          </div>

          <div className="mt-6 max-w-lg space-y-2">
            {transactions.slice(0, 8).map((t) => (
              <div key={t.id} className="flex justify-between items-center rounded-xl border border-white/8 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${
                    t.type === "refund" ? "bg-[#3ddc97]/10 text-[#3ddc97] border-[#3ddc97]/20" :
                    t.type === "deposit" ? "bg-[#6ea8ff]/10 text-[#6ea8ff] border-[#6ea8ff]/20" :
                    t.type === "order" ? "bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/20" :
                    t.type === "giftcard" ? "bg-[#ffd93d]/10 text-[#ffd93d] border-[#ffd93d]/20" :
                    t.type === "promo" ? "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20" :
                    "bg-white/5 text-[#9aa3b5] border-white/8"
                  }`}>
                    {t.type}
                  </span>
                  <span className="font-mono text-[#9aa3b5]">{t.method}</span>
                </div>
                <span className={t.type === "order" ? "text-[#ff6b6b]" : "text-[#3ddc97]"}>
                  {t.type === "order" ? "-" : "+"}{money(Math.abs(t.amount))}
                </span>
              </div>
            ))}
            {!transactions.length && <p className="muted text-sm">No transactions yet.</p>}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
