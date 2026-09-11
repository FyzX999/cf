"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

type PaymentMethod = "nowpayments" | "cashapp";

interface CashAppInstructions {
  cashappTag: string;
  amount: number;
  note: string;
}

export function PaymentButtonsAnimated({
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
  const [autoCheckAttempts, setAutoCheckAttempts] = useState(0);

  useEffect(() => {
    fetch("/api/payments/config")
      .then((res) => res.json())
      .then((config) => setPaymentConfig(config))
      .catch(() => setPaymentConfig({ crypto: false, cashapp: false }));
  }, []);

  useEffect(() => {
    if (!cashappInstructions || autoCheckAttempts >= 120) return;
    
    const timer = setTimeout(() => {
      setAutoCheckAttempts(prev => prev + 1);
      checkCashAppPayment();
    }, 30000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashappInstructions, autoCheckAttempts]);

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
        if (!json.instructions) throw new Error("Payment instructions missing");
        setCashappInstructions(json.instructions);
        setBusy(false);
      } else {
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
        body: JSON.stringify({ 
          orderId: cashappInstructions.note
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check payment");

      if (json.status === "completed") {
        if (kind === "order" && publicId) {
          window.location.href = `/track/${publicId}?paid=cashapp`;
        } else {
          window.location.href = "/dashboard/wallet?success=true";
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment check failed");
    } finally {
      setCheckingPayment(false);
    }
  }

  if (!paymentConfig) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-2"
      >
        <div className="h-10 w-32 animate-pulse rounded-lg bg-white/10" />
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!cashappInstructions ? (
          <motion.div
            key="payment-methods"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {paymentConfig.cashapp && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startPayment("cashapp")}
                disabled={busy || disabled}
                className="group relative flex items-center justify-center overflow-hidden rounded-lg border border-[#3ddc97]/30 bg-gradient-to-br from-[#3ddc97]/10 to-[#3ddc97]/5 px-4 py-3 text-sm font-semibold text-[#3ddc97] transition-all hover:border-[#3ddc97]/50 hover:shadow-lg hover:shadow-[#3ddc97]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.span
                  className="relative z-10"
                  animate={busy ? { scale: [1, 0.95, 1] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  {busy ? "Processing..." : "Pay with CashApp"}
                </motion.span>
              </motion.button>
            )}

            {paymentConfig.crypto && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startPayment("nowpayments")}
                disabled={busy || disabled}
                className="group relative flex items-center justify-center overflow-hidden rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 px-4 py-3 text-sm font-semibold text-blue-400 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.5 }}
                />
                <motion.span className="relative z-10">
                  {busy ? "Processing..." : "Pay with Crypto"}
                </motion.span>
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="cashapp-instructions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <motion.div
              className="rounded-lg border border-[#3ddc97]/30 bg-gradient-to-br from-[#3ddc97]/10 to-[#3ddc97]/5 p-4"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.p className="mb-3 text-sm font-semibold text-[#3ddc97]">
                Send CashApp payment to:
              </motion.p>
              
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  className="rounded-lg bg-white/5 p-3"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <p className="text-xs text-white/60">CashApp Tag</p>
                  <motion.p
                    className="text-lg font-bold text-white"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {cashappInstructions.cashappTag}
                  </motion.p>
                </motion.div>

                <motion.div
                  className="rounded-lg bg-white/5 p-3"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <p className="text-xs text-white/60">Amount</p>
                  <motion.p
                    className="text-lg font-bold text-white"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.05 }}
                  >
                    ${cashappInstructions.amount}
                  </motion.p>
                </motion.div>

                <motion.div
                  className="rounded-lg bg-white/5 p-3"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <p className="text-xs text-white/60">Payment Note</p>
                  <motion.p
                    className="font-mono text-sm text-[#3ddc97]"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {cashappInstructions.note}
                  </motion.p>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={checkCashAppPayment}
                disabled={checkingPayment}
                className="w-full rounded-lg border border-[#3ddc97]/50 bg-[#3ddc97]/20 px-4 py-2 text-sm font-semibold text-[#3ddc97] transition-all hover:bg-[#3ddc97]/30 disabled:opacity-50"
              >
                {checkingPayment ? (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Checking payment...
                  </motion.span>
                ) : (
                  "Check Payment"
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCashappInstructions(null);
                  setAutoCheckAttempts(0);
                  setError(null);
                }}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 transition-all hover:text-white hover:bg-white/10"
              >
                Use Different Payment
              </motion.button>
            </motion.div>

            <motion.p
              className="text-center text-xs text-white/40"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Auto-checking in {Math.ceil((120 - autoCheckAttempts) * 0.5)} minutes
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
