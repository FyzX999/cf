import { AdminShell } from "@/components/AdminShell";
import { createServiceSupabase } from "@/lib/supabase";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const db = createServiceSupabase();
  let users: Array<{
    display_name: string | null;
    email: string | null;
    role: string;
    balance: number;
    created_at: string;
  }> = [];
  if (db) {
    const { data } = await db
      .from("profiles")
      .select("display_name,email,role,balance,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    users = data ?? [];
  }

  return (
    <AdminShell title="Users">
      {!db && (
        <p className="muted mb-4 text-sm">
          Connect Supabase (service role key) to load real accounts. Until then this list stays empty — catalog pricing still works from the Services page.
        </p>
      )}
      {!users.length && db && <p className="muted text-sm">No profiles yet.</p>}
      <div className="space-y-3">
        {users.map((u) => (
          <article key={u.email ?? u.created_at} className="glass p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{u.display_name || "Unnamed"}</h2>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs capitalize">{u.role}</span>
            </div>
            <p className="muted mt-1 text-sm">{u.email}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="muted">Wallet</dt>
                <dd>{money(Number(u.balance))}</dd>
              </div>
              <div>
                <dt className="muted">Registered</dt>
                <dd>{new Date(u.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
