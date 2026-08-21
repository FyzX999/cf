"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard/orders";

  async function claimLocalOrders() {
    const saved = JSON.parse(localStorage.getItem("cf_orders") || "[]") as { publicId?: string }[];
    const ids = saved.map((o) => o.publicId).filter(Boolean) as string[];
    if (!ids.length) return;
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimIds: ids }),
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">Login</h1>
      <p className="muted mt-2 text-sm">Sign in to view every order on your account.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const supabase = createBrowserSupabase();
            if (!supabase) throw new Error("Supabase is not configured");
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
            await claimLocalOrders();
            router.push(next);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input className="field" type="email" required placeholder="you@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" required placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-[#f07167]">{error}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>
      <p className="muted mt-4 text-sm">
        No account? <Link href="/signup" className="text-white">Get started</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
