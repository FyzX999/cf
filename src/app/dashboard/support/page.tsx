import { DashboardShell } from "@/components/DashboardShell";
import { readStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function DashboardSupportPage() {
  const store = await readStore();
  return (
    <DashboardShell title="Support">
      <a href="/support" className="btn btn-primary mb-6">New ticket</a>
      <div className="space-y-3">
        {!store.tickets.length && <p className="muted text-sm">No tickets yet.</p>}
        {store.tickets.map((t) => (
          <div key={t.id} className="glass p-4">
            <div className="flex justify-between gap-3">
              <p className="font-mono text-sm">Ticket #{t.id}</p>
              <span className="text-xs capitalize text-[#9aa3b5]">{t.status}</span>
            </div>
            <p className="mt-2">{t.subject}</p>
            <p className="muted mt-1 text-sm">{t.category} · {new Date(t.updatedAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
