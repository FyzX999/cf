"use client";

import { AdminShell } from "@/components/AdminShell";
import { useState } from "react";

export default function CompletePaymentPage() {
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);

  async function lookupOrder() {
    if (!orderId.trim()) {
      setError("Please enter an order ID");
      return;
    }

    setLookupBusy(true);
    setError(null);
    setOrderInfo(null);

    try {
      const res = await fetch(`/api/orders/${orderId.trim().toUpperCase()}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Order not found");
      }

      setOrderInfo(json.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to lookup order");
    } finally {
      setLookupBusy(false);
    }
  }

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
      setOrderInfo(null);
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
              disabled={busy || lookupBusy}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={lookupOrder}
              disabled={busy || lookupBusy || !orderId.trim()}
            >
              {lookupBusy ? "Looking up..." : "Lookup Order"}
            </button>

            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={completePayment}
              disabled={busy || lookupBusy || !orderId.trim()}
            >
              {busy ? "Completing..." : "Mark as Paid"}
            </button>
          </div>

          {orderInfo && (
            <div className="rounded border border-blue-500/20 bg-blue-500/10 p-4 text-sm">
              <h3 className="font-semibold text-blue-400 mb-2">Order Details</h3>
              <dl className="space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Service:</dt>
                  <dd className="text-white">{orderInfo.serviceName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Quantity:</dt>
                  <dd className="text-white">{orderInfo.quantity.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Amount:</dt>
                  <dd className="text-white font-semibold">${orderInfo.total.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Status:</dt>
                  <dd className="text-white">{orderInfo.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Paid:</dt>
                  <dd className={orderInfo.paid ? "text-green-400" : "text-red-400"}>
                    {orderInfo.paid ? "Yes" : "No"}
                  </dd>
                </div>
                {orderInfo.link && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Link:</dt>
                    <dd className="text-white truncate max-w-[200px]">{orderInfo.link}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

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
