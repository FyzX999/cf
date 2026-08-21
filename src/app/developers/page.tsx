const apiUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://cheapfollower.shop"}/api/v2`;

const endpoints = [
  ["services", "GET service catalog"],
  ["add", "Create + pay order from wallet"],
  ["status", "Order status"],
  ["status (orders)", "Multiple orders"],
  ["balance", "Account balance"],
  ["refill", "Create refill"],
  ["cancel", "Cancel eligible orders"],
];

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold">SMM API</h1>
      <p className="muted mt-2">
        Compatible with typical panel integrations. Authenticate with your dashboard API key. `add` debits wallet and only sends to the provider after payment.
      </p>
      <div className="glass mt-6 grid gap-3 p-5 sm:grid-cols-2">
        <div>
          <p className="muted text-xs">API URL</p>
          <p className="font-mono text-sm">{apiUrl}</p>
        </div>
        <div>
          <p className="muted text-xs">Auth</p>
          <p className="text-sm">POST form fields: key + action</p>
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-[14px] border border-white/8">
        <table className="w-full text-left text-sm">
          <tbody>
            {endpoints.map(([k, v]) => (
              <tr key={k} className="border-t border-white/8 first:border-0">
                <td className="px-4 py-3 font-mono">{k}</td>
                <td className="px-4 py-3 text-[#9aa3b5]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <pre className="glass mt-8 overflow-x-auto p-4 text-xs leading-6 text-[#c5cddc]">{`curl -X POST ${apiUrl} \\
  -d "key=YOUR_KEY" \\
  -d "action=add" \\
  -d "service=101" \\
  -d "link=https://instagram.com/username" \\
  -d "quantity=10000"`}</pre>
    </div>
  );
}
