"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PaypalReturnInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const kind = params.get("kind");
    const publicId = params.get("publicId");
    if (!token) {
      setError("Missing PayPal token");
      return;
    }
    fetch("/api/payments/paypal/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "PayPal capture failed");
        if (kind === "wallet") router.replace("/dashboard/wallet?paid=paypal");
        else router.replace(`/track/${publicId || ""}?paid=paypal`);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "PayPal capture failed"));
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">Payment not confirmed</h1>
        <p className="muted mt-3 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold">Confirming PayPal payment…</h1>
      <p className="muted mt-3 text-sm">Do not close this page. Your order will start automatically when capture completes.</p>
    </div>
  );
}

export default function PaypalReturnPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 muted">Confirming payment…</div>}>
      <PaypalReturnInner />
    </Suspense>
  );
}
