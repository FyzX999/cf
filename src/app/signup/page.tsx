"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">Get started</h1>
      <p className="muted mt-2 text-sm">Create an account to keep a full history of every order you place.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setMessage(null);
          try {
            const supabase = createBrowserSupabase();
            if (!supabase) throw new Error("Supabase is not configured");
            
            // Check for duplicate username (display_name)
            const { data: existingUsers, error: checkError } = await supabase
              .from('profiles')
              .select('id')
              .or(`display_name.eq.${name},email.eq.${email}`)
              .limit(1);
            
            if (checkError && checkError.code !== 'PGRST116') {
              // PGRST116 = table doesn't exist, ignore that error
              console.warn('Profile check error:', checkError);
            }
            
            if (existingUsers && existingUsers.length > 0) {
              throw new Error("Username or email already exists");
            }
            
            const { data, error: authError } = await supabase.auth.signUp({
              email,
              password,
              options: { data: { display_name: name } },
            });
            if (authError) {
              // Handle Supabase auth duplicate email error
              if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
                throw new Error("Email already exists");
              }
              throw authError;
            }
            if (!data.session) {
              setMessage("Check your email to confirm the account, then log in.");
              return;
            }
            const saved = JSON.parse(localStorage.getItem("cf_orders") || "[]") as { publicId?: string }[];
            const ids = saved.map((o) => o.publicId).filter(Boolean) as string[];
            if (ids.length) {
              await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ claimIds: ids }),
              });
            }
            router.push("/dashboard/orders");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input className="field" placeholder="Display name" required value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" type="email" placeholder="Email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" placeholder="Password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-[#f07167]">{error}</p>}
        {message && <p className="text-sm text-[#3ddc97]">{message}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="muted mt-4 text-sm">
        Already have an account? <Link href="/login" className="text-white">Login</Link>
      </p>
    </div>
  );
}
