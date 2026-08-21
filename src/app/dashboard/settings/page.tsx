import { DashboardShell } from "@/components/DashboardShell";

export default function SettingsPage() {
  return (
    <DashboardShell title="Settings">
      <form className="glass max-w-lg space-y-3 p-5">
        <label className="block text-sm">
          Display name
          <input className="field mt-1" defaultValue="FyzX" />
        </label>
        <label className="block text-sm">
          Email
          <input className="field mt-1" defaultValue="you@studio.com" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Email order updates
        </label>
        <button className="btn btn-primary" type="button">Save</button>
      </form>
    </DashboardShell>
  );
}
