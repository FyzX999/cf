import type { OrderStatus } from "./types";

export function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function statusLabel(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: "Awaiting payment",
    processing: "Processing",
    in_progress: "In Progress",
    delivering: "Delivering",
    completed: "Completed",
    partial: "Partial",
    canceled: "Canceled",
    refunded: "Refunded",
    refilling: "Refilling",
  };
  return map[status];
}

export function generatePublicId() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `CF${n}`;
}

export function generateTxnId() {
  return `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
