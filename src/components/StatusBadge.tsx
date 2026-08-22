import type { OrderStatus, TicketStatus } from "@/lib/types";
import { clsx, statusLabel } from "@/lib/format";

const orderTones: Record<OrderStatus, string> = {
  pending: "bg-[#f5b942]",
  processing: "bg-[#6ea8ff]",
  in_progress: "bg-[#6ea8ff]",
  delivering: "bg-[#3ddc97]",
  completed: "bg-[#3ddc97]",
  partial: "bg-[#f5b942]",
  canceled: "bg-[#f07167]",
  refunded: "bg-[#f07167]",
  refilling: "bg-[#8b7dff]",
};

const ticketTones: Record<TicketStatus, string> = {
  open: "bg-[#3ddc97]",
  in_progress: "bg-[#6ea8ff]",
  waiting_customer: "bg-[#f5b942]",
  resolved: "bg-[#8b7dff]",
  closed: "bg-[#9aa3b5]",
};

function formatTicketStatus(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    waiting_customer: "Waiting",
    resolved: "Resolved",
    closed: "Closed",
  };
  return labels[status] || status;
}

export function StatusBadge({ status }: { status: OrderStatus | TicketStatus }) {
  // Determine if it's a ticket status or order status
  const isTicketStatus = ["open", "in_progress", "waiting_customer", "resolved", "closed"].includes(status);
  const tone = isTicketStatus ? ticketTones[status as TicketStatus] : orderTones[status as OrderStatus];
  const label = isTicketStatus ? formatTicketStatus(status as TicketStatus) : statusLabel(status as OrderStatus);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium">
      <span className={clsx("h-1.5 w-1.5 rounded-full", tone)} />
      {label}
    </span>
  );
}
