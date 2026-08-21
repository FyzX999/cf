import { DashboardShell } from "@/components/DashboardShell";
import { OrderWidget } from "@/components/OrderWidget";

export default function NewOrderPage() {
  return (
    <DashboardShell title="New Order">
      <div className="max-w-xl">
        <ol className="muted mb-6 space-y-1 text-sm lg:hidden">
          <li>1. Choose platform</li>
          <li>2. Choose service</li>
          <li>3. Enter link</li>
          <li>4. Select quantity</li>
          <li>5. Review</li>
          <li>6. Pay</li>
          <li>7. Track</li>
        </ol>
        <OrderWidget />
      </div>
    </DashboardShell>
  );
}
