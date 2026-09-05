"use client";

import { useState, useEffect } from "react";

type PaymentMethod = "nowpayments" | "cashapp";

interface CashAppInstructions {
  cashappTag: string;
  amount: number;
  note: string;
}

export function PaymentButtons({
  kind,
  publicId,
  amount,
  disabled,
}: {
  kind: "order" | "wallet";
  publicId?: string;
  amount?: number;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashappInstructions, setCashappInstructions] = useState<CashAppInstructions | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{ crypto: boolean; cashapp: boolean } | null>(null);

  useEffect(() => {
    // Fetch available payment methods
    fetch("/api/payments/config")
      .then((res) => res.json())
      .then((config) => setPaymentConfig(config))
      .catch(() => setPaymentConfig({ crypto: false, cashapp: false }));
  }, []);

  async function startPayment(method: PaymentMethod) {
    setBusy(true);
    setError(null);
    setCashappInstructions(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, kind, publicId, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");

      if (method === "cashapp") {
        // Show CashApp instructions instead of redirecting
        if (!json.instructions) throw new Error("Payment instructions missing");
        setCashappInstructions(json.instructions);
        setBusy(false);
      } else {
        // Redirect to crypto invoice
        if (!json.url) throw new Error("Payment URL missing");
        window.location.href = json.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  async function checkCashAppPayment() {
    if (!cashappInstructions) return;
    setCheckingPayment(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/cashapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: cashappInstructions.note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check payment");

      if (json.status === "completed") {
        // Payment confirmed! Redirect to track page or dashboard
        if (kind === "order" && publicId) {
          window.location.href = `/track/${publicId}?paid=cashapp`;
        } else {
          window.location.href = "/dashboard/wallet?paid=cashapp";
        }
      } else {
        setError("Payment not yet received. Please wait a few moments after sending.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check payment");
    } finally {
      setCheckingPayment(false);
    }
  }

  if (cashappInstructions) {
    return (
      <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="font-semibold">Complete CashApp Payment</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="muted mb-1">1. Send exactly:</p>
            <p className="font-mono text-lg font-semibold text-green-400">
              ${cashappInstructions.amount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="muted mb-1">2. To CashApp:</p>
            <p className="font-mono text-lg font-semibold">{cashappInstructions.cashappTag}</p>
          </div>
          <div>
            <p className="muted mb-1">3. Include this note (required):</p>
            <p className="font-mono rounded bg-black/30 px-2 py-1 text-sm">{cashappInstructions.note}</p>
          </div>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={checkingPayment}
            onClick={checkCashAppPayment}
          >
            {checkingPayment ? "Checking payment…" : "I've sent the payment"}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => setCashappInstructions(null)}
          >
            Cancel
          </button>
        </div>
        <p className="muted text-xs">
          After sending, click the button above. Payment verification may take a few minutes.
        </p>
        {error && <p className="text-sm text-[#f07167]">{error}</p>}
      </div>
    );
  }

  if (!paymentConfig) {
    return (
      <div className="space-y-2">
        <button type="button" className="btn btn-primary w-full" disabled>
          Loading payment options…
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paymentConfig.crypto && (
        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={disabled || busy}
            onClick={() => startPayment("nowpayments")}
          >
            {busy ? "Opening invoice…" : kind === "wallet" ? "Deposit with crypto" : "Pay with crypto"}
          </button>
          <p className="muted text-xs leading-5">
            Choose BTC, ETH, USDT, or another coin on the invoice. Crypto is final. After the network
            confirms, this {kind === "wallet" ? "deposit" : "order"} starts automatically.
          </p>
        </div>
      )}

      {paymentConfig.cashapp && (
        <div className="space-y-2">
          <button
            type="button"
            className="btn w-full bg-[#00d54b] hover:bg-[#00b840] text-black font-semibold"
            disabled={disabled || busy}
            onClick={() => startPayment("cashapp")}
          >
            {busy ? "Preparing…" : kind === "wallet" ? "💵 Deposit with CashApp" : "💵 Pay with CashApp"}
          </button>
          <p className="muted text-xs leading-5">
            Send payment via CashApp. Include the order ID in the note. Payment verified within minutes.
          </p>
        </div>
      )}

      {!paymentConfig.crypto && !paymentConfig.cashapp && (
        <p className="muted text-sm">No payment methods configured. Contact support.</p>
      )}

      {error && <p className="text-sm text-[#f07167]">{error}</p>}
    </div>
  );
}
