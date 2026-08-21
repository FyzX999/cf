import { DashboardShell } from "@/components/DashboardShell";
import { demoTransactions } from "@/lib/demo-data";
import { money } from "@/lib/format";

export default function TransactionsPage() {
  return (
    <DashboardShell title="Transactions">
      <div className="glass overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[#9aa3b5]">
            <tr>
              {["ID", "Type", "Method", "Amount", "Date"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {demoTransactions.map((t) => (
              <tr key={t.id} className="border-t border-white/8">
                <td className="px-4 py-3 font-mono">{t.id}</td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3">{t.method}</td>
                <td className="px-4 py-3">{money(t.amount)}</td>
                <td className="px-4 py-3">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
