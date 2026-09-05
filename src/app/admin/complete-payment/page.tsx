"use client";

import { AdminShell } from "@/components/AdminShell";
import { useState } from "react";

export default function CompletePaymentPage() {
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function completePayment() {
    if (!orderId.trim()) {
      setError("Please enter an order ID");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId.trim().toUpperCase()}/complete`, {
        method: "POST",
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to complete payment");
      }

      setSuccess(`Payment for order ${orderId.toUpperCase()} has been marked as completed!`);
      setOrderId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Manual Payment Completion">
      <div className="glass max-w-lg p-6">
        <h2 className="mb-4 text-lg font-semibold">Complete CashApp Payment Manually</h2>
        <p className="mb-4 text-sm text-gray-400">
          Use this to manually mark a CashApp payment as completed when auto-detection fails.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm">Order ID</label>
            <input
              type="text"
              className="field w-full"
              placeholder="CF391933"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              disabled={busy}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={completePayment}
            disabled={busy || !orderId.trim()}
          >
            {busy ? "Completing..." : "Mark as Paid"}
          </button>

          {error && (
            <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
              {success}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
