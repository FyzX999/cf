import { AdminShell } from "@/components/AdminShell";
import { readStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const store = await readStore();
  return (
    <AdminShell title="Audit log">
      <p className="muted mb-4 text-sm">Catalog and settings changes are recorded here.</p>
      <div className="glass overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[#9aa3b5]">
            <tr>
              {["Time", "Actor", "Action", "Target"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {store.audit.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-[#9aa3b5]" colSpan={4}>No admin actions yet.</td>
              </tr>
            )}
            {store.audit.map((l) => (
              <tr key={l.id} className="border-t border-white/8">
                <td className="px-4 py-3 font-mono">{new Date(l.time).toLocaleString()}</td>
                <td className="px-4 py-3">{l.actor}</td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3">{l.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
