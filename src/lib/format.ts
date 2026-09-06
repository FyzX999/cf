import type { OrderStatus } from "./types";
import { randomInt } from "crypto";

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
  // SECURITY: Use cryptographically secure random number generation
  // This prevents attackers from predicting order IDs
  const n = randomInt(100000, 1000000); // 100000-999999
  const id = `CF${n}`;
  
  // Validate it's actually numeric
  if (!/^CF\d{6}$/.test(id)) {
    console.error(`[CRITICAL] Invalid order ID generated: ${id}`);
    throw new Error("Failed to generate valid order ID");
  }
  
  return id;
}

export function generateTxnId() {
  // SECURITY: Use cryptographically secure random for transaction IDs
  return `TXN-${randomInt(10000000, 100000000)}`;
}

export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
