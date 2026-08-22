"use client";

import { StatusBadge } from "@/components/StatusBadge";
import { compact, money } from "@/lib/format";
import type { PublicOrder, Ticket } from "@/lib/types";
import { useRateLimitFeedback, formatCountdownMessage } from "@/lib/useRateLimitFeedback";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TrackDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Payment state
  const [giftCardCode, setGiftCardCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cryptoBusy, setCryptoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Wallet confirmation step
  const [confirmWallet, setConfirmWallet] = useState(false);

  // Refund state
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState<{
    amount: number;
    newBalance: number;
  } | null>(null);
  const [refundError, setRefundError] = useState<unknown | null>(null);
  const [refundResponse, setRefundResponse] = useState<Response | undefined>(undefined);

  // Rate limit feedback for refund (Requirements 8.1, 8.2, 8.3, 8.4, 8.5)
  const refundRateLimit = useRateLimitFeedback(refundError, refundResponse);

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

  async function loadTickets() {
    if (!order) return;
    try {
      const res = await fetch(`/api/tickets/by-order/${order.publicId}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setTickets(json.tickets || []);
      }
    } catch (error) {
      console.error("Failed to load tickets:", error);
      setTickets([]);
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

  // Load tickets when order is available
  useEffect(() => {
    if (order) {
      loadTickets().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.publicId]);

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

  async function requestRefund() {
    if (!order) return;
    setRefundBusy(true);
    setError(null);
    setNote(null);
    setRefundSuccess(null);
    setRefundError(null);
    setRefundResponse(undefined);
    try {
      const res = await fetch(`/api/orders/${order.publicId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      // Store response for rate limit parsing
      setRefundResponse(res);
      
      const json = await res.json();
      if (!res.ok) throw json; // Throw the full JSON object for rate limit parsing
      
      // Update order status to refunded
      setOrder({ ...order, status: "refunded" });
      setRefundSuccess({
        amount: json.refundAmount,
        newBalance: json.newWalletBalance,
      });
      setWalletBalance(json.newWalletBalance);
    } catch (e) {
      setRefundError(e);
      setError(e instanceof Error ? e.message : "Refund request failed");
    } finally {
      setRefundBusy(false);
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

  // Check if order is eligible for refund
  // Eligible if: paid AND not already refunded AND (canceled OR partial)
  const isRefundEligible = 
    order.paid && 
    order.status !== "refunded" && 
    (order.status === "canceled" || order.status === "partial");

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

      {/* Refund button for eligible orders */}
      {isRefundEligible && (
        <div className="glass mt-8 space-y-4 p-6">
          <div>
            <p className="text-sm font-semibold">Request Refund</p>
            <p className="muted mt-1 text-sm">
              {order.status === "canceled" 
                ? "This order was canceled. You can request a full refund to your wallet."
                : "This order was partially completed. You can request a proportional refund for the undelivered portion."}
            </p>
          </div>
          
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={refundBusy}
            onClick={requestRefund}
          >
            {refundBusy ? "Processing refund…" : "Request Refund"}
          </button>

          {refundSuccess && (
            <div className="rounded-lg border border-[#3ddc97]/20 bg-[#3ddc97]/5 px-4 py-3">
              <p className="text-sm font-semibold text-[#3ddc97]">Refund Successful!</p>
              <p className="muted mt-1 text-sm">
                Refund amount: {money(refundSuccess.amount)}
              </p>
              <p className="muted text-sm">
                New wallet balance: {money(refundSuccess.newBalance)}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-[#f07167]">{error}</p>}
        </div>
      )}

      {/* Show refunded status for already refunded orders */}
      {order.paid && order.status === "refunded" && (
        <div className="glass mt-8 p-6">
          <div className="rounded-lg border border-[#9aa3b5]/20 bg-[#9aa3b5]/5 px-4 py-3">
            <p className="text-sm font-semibold text-[#9aa3b5]">Order Refunded</p>
            <p className="muted mt-1 text-sm">
              This order has been refunded. The amount has been credited to your wallet.
            </p>
          </div>
        </div>
      )}

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

      {/* Related Support Tickets */}
      <div className="glass mt-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Support Tickets</h2>
          <Link
            href={`/dashboard/tickets/new?orderId=${order.publicId}`}
            className="btn btn-ghost btn-sm"
          >
            Create ticket
          </Link>
        </div>

        {tickets.length === 0 ? (
          <p className="muted mt-4 text-sm">
            No support tickets for this order. Create one if you need assistance.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.publicId}`}
                className="block rounded-lg border border-white/8 bg-white/5 p-4 transition-colors hover:border-white/12 hover:bg-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#9aa3b5]">
                        {ticket.publicId}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="mt-1 font-medium">{ticket.subject}</p>
                    <p className="muted mt-1 text-xs">
                      Created {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#3ddc97]/10 px-2 py-1 text-xs capitalize text-[#3ddc97]">
                    {ticket.category}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
