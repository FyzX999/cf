"use client";

import { useState } from "react";

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

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "nowpayments", kind, publicId, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (!json.url) throw new Error("Payment URL missing");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={disabled || busy}
        onClick={start}
      >
        {busy ? "Opening invoice…" : kind === "wallet" ? "Deposit with crypto" : "Pay invoice with crypto"}
      </button>
      <p className="muted text-xs leading-5">
        You will choose BTC, ETH, USDT, or another coin on the invoice. Crypto is final. After the network
        confirms, this {kind === "wallet" ? "deposit" : "order"} starts automatically.
      </p>
      {error && <p className="text-sm text-[#f07167]">{error}</p>}
    </div>
  );
}
