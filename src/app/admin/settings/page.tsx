"use client";

import { AdminShell } from "@/components/AdminShell";
import type { SiteSettings } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => setSettings(json.settings))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSettings(json.settings);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <AdminShell title="Store settings">
        <p className="muted text-sm">{error ?? "Loading..."}</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Store settings">
      <p className="muted mb-6 text-sm">
        These controls apply site-wide. Per-item prices and multipliers still live on the Services page.
      </p>
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {saved && <p className="mb-4 text-sm text-[#3ddc97]">Settings saved.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm">
          <span className="muted mb-1 block">Site name</span>
          <input className="field" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Support email</span>
          <input className="field" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="muted mb-1 block">Homepage tagline</span>
          <input className="field" value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="muted mb-1 block">Announcement banner</span>
          <input className="field" value={settings.announcement} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })} placeholder="Optional message shown at the top of the storefront" />
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Default profit multiplier</span>
          <input
            className="field"
            type="number"
            min={1}
            step={0.05}
            value={settings.defaultMarkupMultiplier}
            onChange={(e) => setSettings({ ...settings, defaultMarkupMultiplier: Number(e.target.value) })}
          />
          <p className="muted mt-1 text-xs">Used for new items and bulk apply. 1.8x means 80% profit on cost.</p>
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Reseller discount %</span>
          <input
            className="field"
            type="number"
            min={0}
            max={90}
            value={settings.resellerDiscountPercent}
            onChange={(e) => setSettings({ ...settings, resellerDiscountPercent: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Minimum order amount ($)</span>
          <input
            className="field"
            type="number"
            min={0}
            step={0.01}
            value={settings.minOrderAmount}
            onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Currency</span>
          <input className="field" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Base order count</span>
          <input
            className="field"
            type="number"
            min={0}
            value={settings.baseOrderCount || 0}
            onChange={(e) => setSettings({ ...settings, baseOrderCount: Number(e.target.value) })}
          />
          <p className="muted mt-1 text-xs">Starting number for order counter display (social proof)</p>
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Fast delivery multiplier</span>
          <input
            className="field"
            type="number"
            min={1}
            step={0.05}
            value={settings.deliveryMultipliers.fast}
            onChange={(e) =>
              setSettings({
                ...settings,
                deliveryMultipliers: { ...settings.deliveryMultipliers, fast: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="text-sm">
          <span className="muted mb-1 block">Drip-feed multiplier</span>
          <input
            className="field"
            type="number"
            min={1}
            step={0.05}
            value={settings.deliveryMultipliers.drip}
            onChange={(e) =>
              setSettings({
                ...settings,
                deliveryMultipliers: { ...settings.deliveryMultipliers, drip: Number(e.target.value) },
              })
            }
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <label className="btn btn-ghost">
          <input
            type="checkbox"
            checked={settings.guestCheckout}
            onChange={(e) => setSettings({ ...settings, guestCheckout: e.target.checked })}
          />
          Guest checkout
        </label>
        <label className="btn btn-ghost">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
          />
          Pause checkout
        </label>
        <label className="btn btn-ghost">
          <input
            type="checkbox"
            checked={settings.autoSyncProviderCost}
            onChange={(e) => setSettings({ ...settings, autoSyncProviderCost: e.target.checked })}
          />
          Auto-sync provider cost
        </label>
      </div>

      <button className="btn btn-primary mt-8" disabled={busy} onClick={save}>
        {busy ? "Saving..." : "Save settings"}
      </button>
    </AdminShell>
  );
}
