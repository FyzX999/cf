"use client";

import { DashboardShell } from "@/components/DashboardShell";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardApiPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState("https://cheapfollower.shop/api/v2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  async function load() {
    const res = await fetch("/api/wallet", { cache: "no-store" });
    if (!res.ok) {
      setApiKey(null);
      return;
    }
    const json = await res.json();
    setApiKey(json.apiKey ?? null);
    if (json.apiUrl) setApiUrl(json.apiUrl);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function rotate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate-key" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not rotate key");
      setApiKey(json.apiKey);
      setShow(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rotate key");
    } finally {
      setBusy(false);
    }
  }

  const masked = apiKey ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : null;

  return (
    <DashboardShell title="API">
      {!apiKey ? (
        <p className="muted text-sm">
          <Link href="/login?next=/dashboard/api" className="text-[#6ea8ff]">
            Sign in
          </Link>{" "}
          to get a live API key. Orders placed via API debit your wallet and only fulfill after payment.
        </p>
      ) : (
        <div className="glass max-w-2xl space-y-4 p-5">
          <div>
            <p className="muted text-xs">API URL</p>
            <p className="mt-1 break-all font-mono text-sm">{apiUrl}</p>
          </div>
          <div>
            <p className="muted text-xs">API key</p>
            <p className="mt-1 break-all font-mono text-sm">{show ? apiKey : masked}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setShow((v) => !v)}>
              {show ? "Hide" : "Reveal"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={rotate}>
              Rotate key
            </button>
            <Link href="/developers" className="btn btn-primary">
              Docs
            </Link>
          </div>
          {error && <p className="text-sm text-[#f07167]">{error}</p>}
          <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-[#c5cddc]">{`curl -X POST ${apiUrl} \\
  -d "key=${show ? apiKey : "YOUR_KEY"}" \\
  -d "action=balance"`}</pre>
        </div>
      )}
    </DashboardShell>
  );
}
