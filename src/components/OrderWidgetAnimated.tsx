"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calcPrice, platforms as seedPlatforms } from "@/lib/catalog";
import { money } from "@/lib/format";
import type { DeliverySpeed, Platform, PlatformSlug, Service, SiteSettings } from "@/lib/types";

type CatalogPayload = {
  services: Service[];
  platforms: Platform[];
  settings: Pick<SiteSettings, "deliveryMultipliers" | "guestCheckout" | "maintenanceMode" | "minOrderAmount">;
};

export function OrderWidgetAnimated({
  defaultPlatform,
  lockedServiceId,
}: {
  defaultPlatform?: PlatformSlug;
  lockedServiceId?: string;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [platform, setPlatform] = useState<PlatformSlug>(defaultPlatform ?? "instagram");
  const [serviceId, setServiceId] = useState(lockedServiceId ?? "");
  const [quantity, setQuantity] = useState(1000);
  const [link, setLink] = useState("");
  const [delivery, setDelivery] = useState<DeliverySpeed>("standard");
  const [promoCode, setPromoCode] = useState("");
  const [promoNote, setPromoNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedLink = localStorage.getItem("cf_last_link");
    if (savedLink) {
      setLink(savedLink);
    } else {
      setLink("https://instagram.com/example");
    }
  }, []);

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((json: CatalogPayload) => {
        setPayload(json);
        const first =
          json.services.find((s) => s.id === lockedServiceId) ??
          json.services.find((s) => s.platform === (defaultPlatform ?? "instagram")) ??
          json.services[0];
        if (first) {
          setPlatform(first.platform);
          setServiceId(first.id);
          setQuantity(Math.max(first.min, Math.min(1000, first.max)));
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load catalog"));
  }, [defaultPlatform, lockedServiceId]);

  const services = payload?.services ?? [];
  const platforms = payload?.platforms?.length ? payload.platforms : seedPlatforms;
  const platformServices = useMemo(
    () => services.filter((s) => s.platform === platform),
    [services, platform],
  );
  const service = services.find((s) => s.id === serviceId) ?? platformServices[0];
  const qty = quantity;
  const baseTotal = service
    ? calcPrice(service.ratePerThousand, qty, delivery, payload?.settings.deliveryMultipliers)
    : 0;
  const [displayTotal, setDisplayTotal] = useState(baseTotal);

  useEffect(() => {
    setDisplayTotal(baseTotal);
    setPromoNote(null);
  }, [baseTotal]);

  async function submitOrder() {
    if (!link) {
      setError("Please enter a valid link");
      return;
    }
    if (!service) {
      setError("Please select a service");
      return;
    }
    if (qty < service.min || qty > service.max) {
      setError(`Quantity must be between ${service.min} and ${service.max}`);
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const result = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          quantity: qty,
          link,
          delivery,
          promoCode: promoCode || undefined,
        }),
      });

      const json = await result.json();
      if (!result.ok) throw new Error(json.error || "Order failed");

      localStorage.setItem("cf_last_link", link);
      router.push(`/payments/${json.publicId}?amount=${displayTotal}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-xl space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 p-6 backdrop-blur-xl"
    >
      {/* Platform Selection */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="mb-3 block text-sm font-semibold text-white/80">Platform</label>
        <motion.div
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5"
          layout
        >
          {platforms.map((p) => (
            <motion.button
              key={p.slug}
              onClick={() => setPlatform(p.slug)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all ${
                platform === p.slug
                  ? "border-[#3ddc97]/50 bg-[#3ddc97]/20 text-[#3ddc97] shadow-lg shadow-[#3ddc97]/20"
                  : "border-white/20 bg-white/5 text-white/60 hover:border-white/40 hover:text-white/80"
              }`}
            >
              <AnimatePresence>
                {platform === p.slug && (
                  <motion.div
                    layoutId="platformIndicator"
                    className="absolute inset-0 rounded-lg border border-[#3ddc97]/50 bg-[#3ddc97]/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
              <span className="relative z-10">{p.name}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Service Selection */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="mb-3 block text-sm font-semibold text-white/80">Service</label>
        <motion.select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white outline-none transition-all placeholder:text-white/40 focus:border-[#3ddc97]/50 focus:shadow-lg focus:shadow-[#3ddc97]/10"
          whileFocus={{ scale: 1.01 }}
        >
          {platformServices.map((s) => (
            <option key={s.id} value={s.id} className="bg-gray-900">
              {s.name} - {money(s.ratePerThousand / 1000)}/1k
            </option>
          ))}
        </motion.select>
      </motion.div>

      {/* Quantity Input with Animation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="mb-3 block text-sm font-semibold text-white/80">
          Quantity
          {service && <span className="ml-2 text-xs text-white/40">({service.min}-{service.max})</span>}
        </label>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setQuantity(Math.max(service?.min ?? 0, qty - 100))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-white/40"
          >
            −
          </motion.button>
          <motion.input
            type="number"
            value={qty}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white outline-none transition-all placeholder:text-white/40 focus:border-[#3ddc97]/50 focus:shadow-lg focus:shadow-[#3ddc97]/10"
            whileFocus={{ scale: 1.01 }}
          />
          <motion.button
            onClick={() => setQuantity(Math.min(service?.max ?? Infinity, qty + 100))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-white/40"
          >
            +
          </motion.button>
        </div>
      </motion.div>

      {/* Link Input */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="mb-3 block text-sm font-semibold text-white/80">Link</label>
        <motion.input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://instagram.com/..."
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white outline-none transition-all placeholder:text-white/40 focus:border-[#3ddc97]/50 focus:shadow-lg focus:shadow-[#3ddc97]/10"
          whileFocus={{ scale: 1.01 }}
        />
      </motion.div>

      {/* Delivery Speed */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="mb-3 block text-sm font-semibold text-white/80">Delivery Speed</label>
        <div className="grid grid-cols-3 gap-2">
          {(["standard", "fast", "express"] as const).map((d) => (
            <motion.button
              key={d}
              onClick={() => setDelivery(d)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all capitalize ${
                delivery === d
                  ? "border-[#3ddc97]/50 bg-[#3ddc97]/20 text-[#3ddc97] shadow-lg shadow-[#3ddc97]/20"
                  : "border-white/20 bg-white/5 text-white/60 hover:border-white/40"
              }`}
            >
              {d}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Promo Code */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.35 }}
      >
        <label className="mb-3 block text-sm font-semibold text-white/80">Promo Code (Optional)</label>
        <motion.input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Enter code..."
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white outline-none transition-all placeholder:text-white/40 focus:border-[#3ddc97]/50 focus:shadow-lg focus:shadow-[#3ddc97]/10"
          whileFocus={{ scale: 1.01 }}
        />
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
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

      {/* Price Display with Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-[#3ddc97]/30 bg-gradient-to-br from-[#3ddc97]/10 to-[#3ddc97]/5 p-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">Total Price</span>
          <motion.span
            key={displayTotal}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-[#3ddc97]"
          >
            ${displayTotal.toFixed(2)}
          </motion.span>
        </div>
        {promoNote && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-xs text-[#3ddc97]/80"
          >
            {promoNote}
          </motion.p>
        )}
      </motion.div>

      {/* Submit Button */}
      <motion.button
        onClick={submitOrder}
        disabled={busy || !service || !link}
        whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(61, 220, 151, 0.3)" }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full overflow-hidden rounded-lg border border-[#3ddc97]/50 bg-gradient-to-r from-[#3ddc97]/20 to-[#3ddc97]/10 px-6 py-3 text-lg font-bold text-[#3ddc97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          className="relative z-10"
          animate={busy ? { scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          {busy ? "Processing..." : "Place Order"}
        </motion.span>
      </motion.button>
    </motion.div>
  );
}
