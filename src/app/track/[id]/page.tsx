"use client";

import { StatusBadge } from "@/components/StatusBadge";
import { compact, money } from "@/lib/format";
import type { PublicOrder } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TrackDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Payment state
  const [giftCardCode, setGiftCardCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cryptoBusy, setCryptoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Wallet confirmation step
  const [confirmWallet, setConfirmWallet] = useState(false);

  async function load() {
    const id = String(params.id || "").toUpperCase();
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setOrder(json.order);
      setMissing(false);
      return;
    }
    setMissing(true);
    setOrder(null);
  }

  async function loadWallet() {
    const res = await fetch("/api/wallet", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setWalletBalance(Number(json.balance ?? 0));
      setIsAuthenticated(true);
    } else {
      setWalletBalance(null);
      setIsAuthenticated(false);
    }
  }

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive) return;
      await load();
    }
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Load wallet balance once on mount (best-effort; no auth = ignore)
  useEffect(() => {
    loadWallet().catch(() => undefined);
    const paid = new URLSearchParams(window.location.search).get("paid");
    if (paid) setNote("Payment received. Delivery starts automatically once the network confirms.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function payCrypto() {
    if (!order) return;
    setCryptoBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "nowpayments", kind: "order", publicId: order.publicId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (!json.url) throw new Error("Payment URL missing");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setCryptoBusy(false);
    }
  }

  async function payWithWallet() {
    if (!order) return;
    setBusy(true);
    setError(null);
    setNote(null);
    setConfirmWallet(false);
    try {
      const res = await fetch(`/api/orders/${order.publicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", method: "wallet" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment failed");
      setOrder(json.order);
      setNote("Paid from wallet. Delivery is starting.");
      setWalletBalance(null); // refresh on next poll
      loadWallet().catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyGiftCard() {
    if (!order || !giftCardCode.trim()) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/orders/${order.publicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", giftCardCode: giftCardCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gift card could not cover this invoice");
      setOrder(json.order);
      setNote("Gift card applied. Delivery is starting.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gift card failed");
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return <div className="mx-auto max-w-lg px-4 py-16">Order not found.</div>;
  }
  if (!order) {
    return <div className="mx-auto max-w-lg px-4 py-16 muted">Loading invoice…</div>;
  }

  const pct = order.paid ? Math.round((order.delivered / order.quantity) * 100) : 0;
  const walletCoversOrder = walletBalance !== null && walletBalance >= order.total;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="font-mono text-sm text-[#9aa3b5]">Order #{order.publicId}</p>
      <h1 className="mt-2 text-3xl font-semibold">{order.serviceName}</h1>
      <p className="muted mt-1">{compact(order.quantity)} units</p>
      <div className="mt-4">
        <StatusBadge status={order.status} />
      </div>

      {!order.paid && (
        <div className="glass mt-8 space-y-5 p-6">
          {/* Wallet balance display */}
          {isAuthenticated && walletBalance !== null && (
            <div className="rounded-lg border border-[#3ddc97]/20 bg-[#3ddc97]/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#9aa3b5]">Your wallet balance</span>
                <span className="text-lg font-semibold text-[#3ddc97]">{money(walletBalance)}</span>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold">Payment required</p>
            <p className="muted mt-1 text-sm">
              Followers will not start until this order is paid ({money(order.total)}). Crypto confirms automatically after the network payment.
            </p>
          </div>

          {/* Crypto */}
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={cryptoBusy || busy}
            onClick={payCrypto}
          >
            {cryptoBusy ? "Opening invoice…" : "Pay with crypto"}
          </button>
          <p className="muted text-xs leading-5">
            Crypto payments are final and cannot be reversed. After the network confirms, this order starts automatically. Counts can drop after delivery and we are not liable for drops or platform removals.
          </p>

          {/* Gift card */}
          <div className="border-t border-white/8 pt-4">
            <p className="muted mb-2 text-sm">Gift card code</p>
            <input
              className="field w-full"
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value)}
              placeholder="Optional — covers part or all of the total"
            />
          </div>

          {/* Wallet + Add funds */}
          <div className="flex gap-3 pt-1">
            {/* Wallet confirm flow */}
            {!confirmWallet ? (
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={busy || cryptoBusy}
                onClick={() => {
                  setError(null);
                  setConfirmWallet(true);
                }}
              >
                Pay with wallet
              </button>
            ) : (
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-[#f0c060]">
                  This will deduct {money(order.total)} from your wallet
                  {walletBalance !== null ? ` (balance: ${money(walletBalance)})` : ""}.
                  This cannot be reversed.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    disabled={busy}
                    onClick={payWithWallet}
                  >
                    {busy ? "Processing…" : "Confirm payment"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => setConfirmWallet(false)}
                  >
                    Cancel
                  </button>
                </div>
                {!walletCoversOrder && walletBalance !== null && (
                  <p className="text-xs text-[#f07167]">
                    Insufficient balance. You need {money(order.total - walletBalance)} more.
                  </p>
                )}
              </div>
            )}

            {!confirmWallet && (
              <Link
                href="/dashboard/wallet"
                className="btn btn-ghost"
              >
                Add wallet funds
              </Link>
            )}
          </div>

          {/* Gift card apply button (shown when code is entered) */}
          {giftCardCode.trim() && (
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={busy || !giftCardCode.trim()}
              onClick={applyGiftCard}
            >
              {busy ? "Applying…" : "Apply gift card"}
            </button>
          )}

          {error && <p className="text-sm text-[#f07167]">{error}</p>}
          {note && <p className="text-sm text-[#3ddc97]">{note}</p>}
        </div>
      )}

      {order.paid && note && <p className="mt-6 text-sm text-[#3ddc97]">{note}</p>}

      <div className="glass mt-8 p-6">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {compact(order.delivered)} / {compact(order.quantity)}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[#3ddc97] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="muted">Started</dt>
            <dd>{new Date(order.startedAt).toLocaleTimeString()}</dd>
          </div>
          <div>
            <dt className="muted">Last update</dt>
            <dd>{new Date(order.updatedAt).toLocaleTimeString()}</dd>
          </div>
          <div>
            <dt className="muted">Current quantity</dt>
            <dd>{compact(order.delivered)}</dd>
          </div>
          <div>
            <dt className="muted">Target</dt>
            <dd>{compact(order.quantity)}</dd>
          </div>
          <div>
            <dt className="muted">Estimated completion</dt>
            <dd>{order.estimatedCompletion}</dd>
          </div>
          <div>
            <dt className="muted">Total</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
