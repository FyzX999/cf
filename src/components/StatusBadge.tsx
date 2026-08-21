import type { OrderStatus } from "@/lib/types";
import { clsx, statusLabel } from "@/lib/format";

const tones: Record<OrderStatus, string> = {
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

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium">
      <span className={clsx("h-1.5 w-1.5 rounded-full", tones[status])} />
      {statusLabel(status)}
    </span>
  );
}
