"use client";

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

export function OrderWidget({
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

  // Load last used link from localStorage
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
  // Don't auto-clamp quantity - let users type freely and validate on submit
  const qty = quantity;
  const baseTotal = service
    ? calcPrice(service.ratePerThousand, qty, delivery, payload?.settings.deliveryMultipliers)
    : 0;
  const [displayTotal, setDisplayTotal] = useState(baseTotal);

  useEffect(() => {
    setDisplayTotal(baseTotal);
    setPromoNote(null);
  }, [baseTotal]);

  async function applyPromo() {
    if (!promoCode.trim() || !service) return;
    setError(null);
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode,
          serviceId: service.id,
          quantity: qty,
          delivery,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invalid promo");
      if (typeof json.total === "number") {
        setDisplayTotal(json.total);
        setPromoNote(
          json.type === "percent" ? `${json.value}% off applied` : `$${json.value} off applied`,
        );
      }
    } catch (e) {
      setPromoNote(null);
      setDisplayTotal(baseTotal);
      setError(e instanceof Error ? e.message : "Promo failed");
    }
  }

  async function placeOrder() {
    if (!service) return;
    if (payload?.settings.maintenanceMode) {
      setError("Checkout is temporarily paused");
      return;
    }
    
    // Validate quantity range
    if (quantity < service.min) {
      setError(`Minimum quantity is ${service.min.toLocaleString()}`);
      return;
    }
    if (quantity > service.max) {
      setError(`Maximum quantity is ${service.max.toLocaleString()}`);
      return;
    }
    
    // Validate link is not empty or example
    const cleanLink = link.trim().toLowerCase();
    if (!cleanLink) {
      setError("Please enter a valid link");
      return;
    }
    
    // Block common example patterns
    const examplePatterns = [
      "example",
      "username",
      "yourusername",
      "your_username",
      "user_name",
      "test",
      "demo",
      "sample",
    ];
    
    const hasExamplePattern = examplePatterns.some((pattern) => {
      // Check if the link contains the pattern as a standalone word
      const regex = new RegExp(`[/@]${pattern}(?:[^a-z0-9]|$)`, "i");
      return regex.test(cleanLink);
    });
    
    if (hasExamplePattern) {
      setError("Please replace the example username with your actual profile link");
      return;
    }
    
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          quantity: qty,
          link,
          delivery,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not place order");
      
      // Save the link for next time (only on success)
      localStorage.setItem("cf_last_link", link);
      
      const saved = JSON.parse(localStorage.getItem("cf_orders") || "[]");
      localStorage.setItem("cf_orders", JSON.stringify([json.order, ...saved].slice(0, 20)));
      router.push(`/track/${json.order.publicId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass lift p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Instant order</p>
          <p className="muted text-sm">Pay with crypto on the next page. Orders stay pending until payment confirms.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {!lockedServiceId && (
          <label className="text-sm">
            <span className="muted mb-1 block">Platform</span>
            <select
              className="field cursor-pointer"
              value={platform}
              onChange={(e) => {
                const next = e.target.value as PlatformSlug;
                setPlatform(next);
                const first = services.find((s) => s.platform === next);
                setServiceId(first?.id ?? "");
                if (first) setQuantity(Math.max(first.min, Math.min(1000, first.max)));
              }}
            >
              {platforms.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="muted mb-1 block">Service</span>
          <select
            className="field cursor-pointer"
            value={service?.id ?? ""}
            disabled={Boolean(lockedServiceId)}
            onChange={(e) => {
              setServiceId(e.target.value);
              const next = services.find((s) => s.id === e.target.value);
              if (next) setQuantity(Math.max(next.min, Math.min(10000, next.max)));
            }}
          >
            {platformServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="muted mb-1 block">Link</span>
          <input className="field" value={link} onChange={(e) => setLink(e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="muted mb-1 flex justify-between">
            Quantity
            <span>{qty.toLocaleString()}</span>
          </span>
          <input
            type="range"
            min={service?.min ?? 0}
            max={service?.max ?? 100000}
            step={1}
            value={qty}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              className="field flex-1"
              min={0}
              max={service?.max ?? 1000000}
              value={qty}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0) setQuantity(val);
              }}
              placeholder="Enter custom amount"
            />
            {service && (
              <span className="flex items-center text-xs text-[#9aa3b5]">
                {service.min.toLocaleString()} - {service.max.toLocaleString()}
              </span>
            )}
          </div>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="muted mb-2 text-sm">Delivery</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["standard", "fast", "drip"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDelivery(d)}
                className={`btn min-h-11 capitalize ${delivery === d ? "btn-primary" : "btn-ghost"}`}
              >
                {d === "drip" ? "Drip Feed" : d}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <span className="muted mb-1 block text-sm">Promo code</span>
          <div className="flex gap-2">
            <input
              className="field"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="WELCOME10"
            />
            <button type="button" className="btn btn-ghost shrink-0" onClick={applyPromo}>
              Apply
            </button>
          </div>
          {promoNote && <p className="mt-1 text-sm text-[#3ddc97]">{promoNote}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <div>
          <p className="muted text-xs">Total</p>
          <p className="text-2xl font-semibold">{money(displayTotal)}</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || !service} onClick={placeOrder}>
          {busy ? "Placing…" : "Place Order"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-[#f07167]">{error}</p>}
    </div>
  );
}
