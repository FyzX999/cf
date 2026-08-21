/**
 * GodofPanel uses PerfectPanel API v2.
 * POST https://godofpanel.com/api/v2  (application/x-www-form-urlencoded)
 */

export type GopService = {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean;
  cancel?: boolean;
};

export type GopOrderStatus = {
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
};

export type GopRefillResult = {
  order: number;
  refill: number | string | { error: string };
};

export type GopRefillStatus = {
  refill: number;
  status: string | { error: string };
};

export type GopCancelResult = {
  order: number;
  cancel: number | { error: string };
};

type GopError = { error: string };

const DEFAULT_URL = "https://godofpanel.com/api/v2";

let servicesCache: { at: number; data: GopService[] } | null = null;
const SERVICES_TTL_MS = 10 * 60 * 1000;

function config() {
  const key = process.env.GODOFPANEL_API_KEY?.trim();
  const url = process.env.GODOFPANEL_API_URL?.trim() || DEFAULT_URL;
  return { key, url, configured: Boolean(key) };
}

export function isGodofPanelConfigured() {
  return config().configured;
}

function isTopLevelError(json: unknown): json is GopError {
  return Boolean(
    json &&
      typeof json === "object" &&
      !Array.isArray(json) &&
      "error" in json &&
      Object.keys(json as object).length <= 2,
  );
}

async function gopRequest<T>(body: Record<string, string | number>): Promise<T> {
  const { key, url, configured } = config();
  if (!configured) {
    throw new Error("GODOFPANEL_API_KEY is not set");
  }

  const payload = new URLSearchParams();
  payload.set("key", key!);
  for (const [k, v] of Object.entries(body)) {
    payload.set(k, String(v));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as T | GopError;
  } catch {
    throw new Error(
      res.ok
        ? "GodofPanel returned a non-JSON response"
        : `GodofPanel HTTP ${res.status}`,
    );
  }

  if (!res.ok) {
    const message = isTopLevelError(json) ? json.error : `GodofPanel HTTP ${res.status}`;
    throw new Error(message);
  }

  if (isTopLevelError(json)) {
    throw new Error(json.error);
  }

  return json as T;
}

export function listProviderServices() {
  return gopRequest<GopService[]>({ action: "services" });
}

export async function listProviderServicesCached() {
  if (servicesCache && Date.now() - servicesCache.at < SERVICES_TTL_MS) {
    return servicesCache.data;
  }
  const data = await listProviderServices();
  servicesCache = { at: Date.now(), data };
  return data;
}

export function addProviderOrder(input: {
  service: number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
}) {
  const body: Record<string, string | number> = {
    action: "add",
    service: input.service,
    link: input.link,
    quantity: input.quantity,
  };
  if (input.runs) body.runs = input.runs;
  if (input.interval) body.interval = input.interval;
  return gopRequest<{ order: number }>(body);
}

export function getProviderOrderStatus(orderId: number) {
  return gopRequest<GopOrderStatus>({ action: "status", order: orderId });
}

export function getProviderOrdersStatus(orderIds: number[]) {
  return gopRequest<Record<string, GopOrderStatus | GopError>>({
    action: "status",
    orders: orderIds.join(","),
  });
}

export function createProviderRefill(orderId: number) {
  return gopRequest<{ refill: string | number }>({ action: "refill", order: orderId });
}

export function createProviderRefills(orderIds: number[]) {
  return gopRequest<GopRefillResult[]>({
    action: "refill",
    orders: orderIds.join(","),
  });
}

export function getProviderRefillStatus(refillId: number) {
  return gopRequest<{ status: string }>({ action: "refill_status", refill: refillId });
}

export function getProviderRefillsStatus(refillIds: number[]) {
  return gopRequest<GopRefillStatus[]>({
    action: "refill_status",
    refills: refillIds.join(","),
  });
}

export function cancelProviderOrders(orderIds: number[]) {
  return gopRequest<GopCancelResult[]>({
    action: "cancel",
    orders: orderIds.join(","),
  });
}

export function getProviderBalance() {
  return gopRequest<{ balance: string; currency: string }>({ action: "balance" });
}

export function mapProviderStatus(status: string) {
  const s = status.toLowerCase();
  if (s.includes("complete")) return "completed" as const;
  if (s.includes("partial")) return "partial" as const;
  if (s.includes("cancel")) return "canceled" as const;
  if (s.includes("refund")) return "refunded" as const;
  if (s.includes("pending")) return "pending" as const;
  if (s.includes("progress") || s.includes("in progress")) return "in_progress" as const;
  if (s.includes("process")) return "processing" as const;
  if (s.includes("refill")) return "refilling" as const;
  return "delivering" as const;
}
