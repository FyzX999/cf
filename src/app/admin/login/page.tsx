"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <div className="glass w-full p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">Staff only</p>
        <h1 className="mt-2 text-2xl font-semibold">Admin login</h1>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || "Login failed");
              router.push(next);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            className="field"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[#f07167]">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Enter admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
