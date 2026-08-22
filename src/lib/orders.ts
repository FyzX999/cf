import { calcPrice } from "./catalog";
import { consumePromo, debitWallet, findPromo, previewPromo, redeemGiftCard } from "./commerce";
import { getLiveServiceById } from "./live-catalog";
import { readStore } from "./admin-store";
import { generatePublicId } from "./format";
import {
  addProviderOrder,
  cancelProviderOrders,
  createProviderRefill,
  getProviderOrderStatus,
  isProviderConfigured,
  mapProviderStatus,
} from "./provider";
import { resolveProviderServiceId } from "./provider-map";
import { createServiceSupabase } from "./supabase";
import type { DeliverySpeed, OrderStatus, PublicOrder } from "./types";

type StoredOrder = PublicOrder & {
  providerOrderId?: number;
  providerRefillId?: number;
  serviceId?: string;
  userId?: string;
};

const memory = new Map<string, StoredOrder>();

function simulateProgress(order: PublicOrder): PublicOrder {
  if (!order.paid || order.status === "pending") return order;
  if (["completed", "canceled", "refunded"].includes(order.status)) return order;
  const started = new Date(order.startedAt).getTime();
  const elapsedMin = (Date.now() - started) / 60000;
  const pct = Math.min(1, elapsedMin / 18);
  const delivered = Math.min(order.quantity, Math.floor(order.quantity * pct));
  let status = order.status;
  if (delivered <= 0) status = "processing";
  else if (delivered >= order.quantity) status = "completed";
  else status = "delivering";
  return {
    ...order,
    delivered,
    status,
    updatedAt: new Date().toISOString(),
    estimatedCompletion: status === "completed" ? "Completed" : "Updating...",
  };
}

function applyRemote(
  order: PublicOrder,
  remote: { remains: string; status: string },
): PublicOrder {
  const remains = Number(remote.remains);
  const delivered = Math.max(0, order.quantity - (Number.isFinite(remains) ? remains : 0));
  const status = mapProviderStatus(remote.status);
  return {
    ...order,
    delivered,
    status,
    updatedAt: new Date().toISOString(),
    estimatedCompletion: status === "completed" ? "Completed" : "Updating...",
  };
}

function toPublic(row: {
  public_id: string;
  service_name: string;
  platform: PublicOrder["platform"];
  quantity: number;
  delivered: number;
  status: OrderStatus;
  link: string;
  total: number;
  created_at: string;
  updated_at: string;
  delivery: DeliverySpeed;
  provider_order_id?: number | null;
  paid?: boolean | null;
  promo_code?: string | null;
}): PublicOrder {
  // Order is considered paid if:
  // 1. paid flag is explicitly true (highest priority - wallet/gateway payments), OR
  // 2. provider_order_id is set (means it was submitted to fulfillment), OR  
  // 3. status is beyond "pending" (processing, delivering, completed, etc.)
  const isPaid = 
    row.paid === true || 
    Boolean(row.provider_order_id) || 
    (row.status !== "pending" && row.status !== "canceled" && row.status !== "refunded");
    
  return {
    publicId: row.public_id,
    serviceName: row.service_name,
    platform: row.platform,
    quantity: row.quantity,
    delivered: isPaid ? row.delivered : 0,
    status: isPaid ? row.status : "pending",
    link: row.link,
    total: Number(row.total),
    startedAt: row.created_at,
    updatedAt: row.updated_at,
    estimatedCompletion: row.status === "completed" ? "Completed" : isPaid ? (row.provider_order_id ? "Updating..." : "Manual fulfillment") : "Waiting for payment",
    delivery: row.delivery,
    paid: isPaid,
    promoCode: row.promo_code ?? undefined,
  };
}

export async function createOrder(input: {
  serviceId: string;
  link: string;
  quantity: number;
  delivery: DeliverySpeed;
  userId?: string;
  userEmail?: string;
  promoCode?: string;
  payNow?: boolean;
}) {
  const [service, store] = await Promise.all([getLiveServiceById(input.serviceId), readStore()]);
  if (!service || !service.active) throw new Error("Service not found");
  if (store.settings.maintenanceMode) throw new Error("Checkout is temporarily paused");
  if (!store.settings.guestCheckout && !input.userId) throw new Error("Sign in is required to order");
  if (input.quantity < service.min || input.quantity > service.max) {
    throw new Error(`Quantity must be between ${service.min} and ${service.max}`);
  }
  if (!input.link.trim()) throw new Error("A target URL is required");
  
  // Block example usernames
  const cleanLink = input.link.trim().toLowerCase();
  const examplePatterns = [
    "example",
    "username", 
    "yourusername",
    "your_username",
    "user_name",
    "test",
    "demo",
    "sample",
  ];
  
  const hasExamplePattern = examplePatterns.some((pattern) => {
    const regex = new RegExp(`[/@]${pattern}(?:[^a-z0-9]|$)`, "i");
    return regex.test(cleanLink);
  });
  
  if (hasExamplePattern) {
    throw new Error("Please replace the example username with your actual profile link");
  }

  let total = calcPrice(
    service.ratePerThousand,
    input.quantity,
    input.delivery,
    store.settings.deliveryMultipliers,
  );
  const promoCode = input.promoCode?.trim();
  if (promoCode) {
    const promo = await findPromo(promoCode);
    if (!promo) throw new Error("Invalid promo code");
    total = previewPromo(total, promo);
  }
  if (total < store.settings.minOrderAmount) {
    throw new Error(`Minimum order amount is ${store.settings.minOrderAmount}`);
  }
  const publicId = generatePublicId();
  const now = new Date().toISOString();

  const order: StoredOrder = {
    publicId,
    serviceName: service.name,
    platform: service.platform,
    quantity: input.quantity,
    delivered: 0,
    status: "pending",
    link: input.link.trim(),
    total: Number(total.toFixed(2)),
    startedAt: now,
    updatedAt: now,
    estimatedCompletion: "Waiting for payment",
    delivery: input.delivery,
    paid: false,
    promoCode: promoCode ? promoCode.toUpperCase() : undefined,
  };

  memory.set(publicId, { ...order, serviceId: input.serviceId, userId: input.userId });

  const db = createServiceSupabase();
  if (db) {
    if (input.userId) {
      await db.from("profiles").upsert(
        { id: input.userId, email: input.userEmail ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      );
    }
    const { error } = await db.from("orders").insert({
      public_id: publicId,
      user_id: input.userId ?? null,
      service_id: service.id,
      service_name: service.name,
      platform: service.platform,
      quantity: input.quantity,
      delivered: 0,
      status: "pending",
      link: input.link.trim(),
      total: order.total,
      delivery: input.delivery,
      provider_order_id: null,
      paid: false,
      promo_code: order.promoCode ?? null,
    });
    if (error) {
      // Schema without paid/promo columns — retry minimal insert
      const retry = await db.from("orders").insert({
        public_id: publicId,
        user_id: input.userId ?? null,
        service_id: service.id,
        service_name: service.name,
        platform: service.platform,
        quantity: input.quantity,
        delivered: 0,
        status: "pending",
        link: input.link.trim(),
        total: order.total,
        delivery: input.delivery,
        provider_order_id: null,
      });
      if (retry.error) throw new Error(retry.error.message);
    }
  }

  if (promoCode) await consumePromo(promoCode);

  if (input.payNow) {
    if (!input.userId) throw new Error("Sign in to pay from wallet");
    return payOrder({ publicId, userId: input.userId, serviceId: input.serviceId, allowWallet: true });
  }

  return getOrder(publicId) ?? order;
}

async function attachProvider(serviceId: string, link: string, quantity: number, delivery: DeliverySpeed) {
  if (!isProviderConfigured()) return undefined;
  const service = await getLiveServiceById(serviceId);
  if (!service) throw new Error("Service not found");
  
  // Skip provider submission for manual services (e.g., Discord)
  if (service.manual) {
    return undefined;
  }
  
  const providerServiceId = await resolveProviderServiceId(service);
  if (!providerServiceId) {
    throw new Error(
      `No provider service mapped for ${service.name}. Set PROVIDER_SERVICE_MAP or map it in admin.`,
    );
  }
  const added = await addProviderOrder({
    service: providerServiceId,
    link,
    quantity,
    ...(delivery === "drip" ? { runs: 10, interval: 30 } : {}),
  });
  return added.order;
}

export async function payOrder(input: {
  publicId: string;
  userId?: string;
  giftCardCode?: string;
  serviceId?: string;
  paidViaGateway?: boolean;
  allowWallet?: boolean;
}) {
  const publicId = input.publicId.toUpperCase();
  const existing = await getRawOrder(publicId);
  if (!existing) throw new Error("Order not found");
  if (existing.paid) return existing;

  let remaining = existing.total;
  if (input.paidViaGateway) {
    remaining = 0;
  } else {
    const gift = input.giftCardCode?.trim();
    if (gift) {
      const redeemed = await redeemGiftCard(gift, undefined, remaining);
      remaining = Number((remaining - redeemed.credited).toFixed(2));
    }
    if (remaining > 0) {
      if (!input.allowWallet) {
        throw new Error("This order must be paid with crypto or a gift card that covers the full total.");
      }
      if (!input.userId) {
        throw new Error("Sign in and add wallet funds before paying from wallet.");
      }
      await debitWallet(input.userId, remaining, "Wallet", publicId);
    }
  }

  const serviceId = input.serviceId || (await storedServiceId(publicId));
  let providerOrderId: number | undefined;
  try {
    providerOrderId = await attachProvider(serviceId, existing.link, existing.quantity, existing.delivery);
  } catch (error) {
    if (input.paidViaGateway) {
      // Money already captured; keep the order paid and retry fulfillment later.
      console.error(`Provider attach failed after gateway payment for ${publicId}`, error);
    } else {
      if (input.userId && remaining > 0) {
        const { creditWallet } = await import("./commerce");
        await creditWallet(input.userId, remaining, "Refund", `Provider failed for ${publicId}`, "refund");
      }
      throw error;
    }
  }

  const now = new Date().toISOString();
  const next: StoredOrder = {
    ...existing,
    paid: true,
    status: providerOrderId ? "processing" : "pending",
    estimatedCompletion: providerOrderId ? "Updating..." : "Manual fulfillment",
    updatedAt: now,
    providerOrderId,
  };
  memory.set(publicId, next);

  const db = createServiceSupabase();
  if (db) {
    const patch = {
      status: (providerOrderId ? "processing" : "pending") as const,
      provider_order_id: providerOrderId ?? null,
      updated_at: now,
      paid: true,
    };
    const { error } = await db.from("orders").update(patch).eq("public_id", publicId);
    if (error) {
      // If paid column doesn't exist, still mark with provider_order_id
      // The toPublic function will infer paid=true from status or provider_order_id
      const retry = await db
        .from("orders")
        .update({
          status: (providerOrderId ? "processing" : "pending") as const,
          provider_order_id: providerOrderId ?? null,
          updated_at: now,
        })
        .eq("public_id", publicId);
      if (retry.error) {
        console.error("Failed to update order status:", retry.error);
      }
    }
  }

  return next;
}

async function storedServiceId(publicId: string) {
  const local = memory.get(publicId) as (StoredOrder & { serviceId?: string }) | undefined;
  if (local?.serviceId) return local.serviceId;
  const db = createServiceSupabase();
  if (!db) throw new Error("Service mapping missing for this order");
  const { data } = await db.from("orders").select("service_id").eq("public_id", publicId).maybeSingle();
  if (!data?.service_id) throw new Error("Service mapping missing for this order");
  return String(data.service_id);
}

async function getRawOrder(publicId: string): Promise<StoredOrder | null> {
  const local = memory.get(publicId);
  const db = createServiceSupabase();
  if (db) {
    const { data } = await db.from("orders").select("*").eq("public_id", publicId).maybeSingle();
    if (data) {
      const mapped = toPublic(data);
      return {
        ...mapped,
        providerOrderId: data.provider_order_id ? Number(data.provider_order_id) : local?.providerOrderId,
        serviceId: data.service_id,
      } as StoredOrder & { serviceId?: string };
    }
  }
  return local ?? null;
}

export async function getOrder(publicId: string) {
  const db = createServiceSupabase();
  if (db) {
    const { data } = await db.from("orders").select("*").eq("public_id", publicId).maybeSingle();
    if (data) {
      const mapped = toPublic(data);
      if (!mapped.paid) return mapped;
      if (data.provider_order_id && isProviderConfigured()) {
        try {
          const remote = await getProviderOrderStatus(data.provider_order_id);
          const next = applyRemote(mapped, remote);
          await db
            .from("orders")
            .update({
              delivered: next.delivered,
              status: next.status,
              updated_at: next.updatedAt,
            })
            .eq("public_id", publicId);
          return next;
        } catch {
          return mapped;
        }
      }
      return simulateProgress(mapped);
    }
  }

  const local = memory.get(publicId);
  if (local) {
    if (!local.paid) return local;
    if (local.providerOrderId && isProviderConfigured()) {
      try {
        const remote = await getProviderOrderStatus(local.providerOrderId);
        const next = { ...applyRemote(local, remote), providerOrderId: local.providerOrderId, paid: true };
        memory.set(publicId, next);
        return next;
      } catch {
        return local;
      }
    }
    const next = simulateProgress(local);
    memory.set(publicId, next);
    return next;
  }
  return null;
}

export async function listOrders() {
  const db = createServiceSupabase();
  if (db) {
    const { data } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    return (data ?? []).map(toPublic);
  }
  return Array.from(memory.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function listOrdersForUser(userId: string) {
  const db = createServiceSupabase();
  if (!db) {
    return Array.from(memory.values()).filter((o) => (o as StoredOrder & { userId?: string }).userId === userId);
  }
  const page = 1000;
  const rows: Parameters<typeof toPublic>[0][] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows.map(toPublic);
}

export async function claimGuestOrders(userId: string, publicIds: string[]) {
  const ids = publicIds.map((id) => id.trim().toUpperCase()).filter(Boolean).slice(0, 50);
  if (!ids.length) return 0;
  const db = createServiceSupabase();
  if (!db) return 0;
  await db.from("profiles").upsert({ id: userId, email: null }, { onConflict: "id", ignoreDuplicates: true });
  const { data } = await db
    .from("orders")
    .update({ user_id: userId })
    .in("public_id", ids)
    .is("user_id", null)
    .select("public_id");
  return data?.length ?? 0;
}

async function storedProviderId(publicId: string) {
  const local = memory.get(publicId);
  if (local?.providerOrderId) return local.providerOrderId;
  const db = createServiceSupabase();
  if (!db) return null;
  const { data } = await db.from("orders").select("provider_order_id").eq("public_id", publicId).maybeSingle();
  return data?.provider_order_id ? Number(data.provider_order_id) : null;
}

export async function refillOrder(publicId: string) {
  const order = await getOrder(publicId);
  if (!order?.paid) throw new Error("Pay the order before requesting a refill");
  const providerOrderId = await storedProviderId(publicId);
  if (!providerOrderId) throw new Error("Order has no provider ID to refill");
  const result = await createProviderRefill(providerOrderId);
  const local = memory.get(publicId);
  if (local) {
    memory.set(publicId, {
      ...local,
      status: "refilling",
      providerRefillId: Number(result.refill),
      updatedAt: new Date().toISOString(),
    });
  }
  return result;
}

export async function cancelOrder(publicId: string) {
  // Get the order to check if it's paid
  const order = await getOrder(publicId);
  
  const providerOrderId = await storedProviderId(publicId);
  if (!providerOrderId) {
    const db = createServiceSupabase();
    const now = new Date().toISOString();
    memory.set(publicId, {
      ...(memory.get(publicId) as StoredOrder),
      status: "canceled",
      updatedAt: now,
    });
    if (db) {
      await db.from("orders").update({ status: "canceled", updated_at: now }).eq("public_id", publicId);
    }
    
    // Process refund if order is paid
    if (order?.paid) {
      const userId = await storedUserId(publicId);
      if (userId) {
        const { processRefund } = await import("./refunds");
        const refundResult = await processRefund({
          orderId: publicId,
          userId,
          reason: "canceled",
        });
        
        // Log refund result for audit trail (Requirements: 10.3)
        console.log(`[REFUND AUDIT] Order ${publicId} canceled - User: ${userId}, Success: ${refundResult.success}, Amount: ${refundResult.refundAmount}, Error: ${refundResult.error ?? 'none'}`);
      }
    }
    
    return { cancel: 1 };
  }
  const result = await cancelProviderOrders([providerOrderId]);
  const local = memory.get(publicId);
  if (local) {
    memory.set(publicId, {
      ...local,
      status: "canceled",
      updatedAt: new Date().toISOString(),
    });
  }
  
  // Process refund if order is paid
  if (order?.paid) {
    const userId = await storedUserId(publicId);
    if (userId) {
      const { processRefund } = await import("./refunds");
      const refundResult = await processRefund({
        orderId: publicId,
        userId,
        reason: "canceled",
      });
      
      // Log refund result for audit trail (Requirements: 10.3)
      console.log(`[REFUND AUDIT] Order ${publicId} canceled - User: ${userId}, Success: ${refundResult.success}, Amount: ${refundResult.refundAmount}, Error: ${refundResult.error ?? 'none'}`);
    }
  }
  
  return result;
}

/**
 * Mark an order as partial and process refund for undelivered quantity.
 * 
 * Requirements addressed:
 * - 16.1: Handle partial order refunds when delivered < quantity
 * - 16.2: Calculate proportional refund using formula
 * - 16.3: Prevent duplicate refunds
 * 
 * @param publicId - Order public ID
 * @param userId - User ID (for authorization and refund)
 * @returns RefundResult with success status and refund details
 */
export async function markOrderPartial(publicId: string, userId?: string): Promise<import("./types").RefundResult> {
  const order = await getOrder(publicId);
  
  // Validate order exists
  if (!order) {
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "Order not found",
    };
  }
  
  // Validate order is paid
  if (!order.paid) {
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "Cannot mark unpaid order as partial",
    };
  }
  
  // Validate order has not been fully refunded
  if (order.status === "refunded") {
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "Already refunded",
    };
  }
  
  // Validate there's actually a partial delivery (delivered < quantity)
  if (order.delivered >= order.quantity) {
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "Order is fully delivered, no refund due",
    };
  }
  
  if (order.delivered === 0) {
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "Use cancelOrder for orders with zero delivery",
    };
  }
  
  // Get userId from order if not provided
  const refundUserId = userId || (await storedUserId(publicId));
  if (!refundUserId) {
    return {
      success: false,
      refundAmount: 0,
      newWalletBalance: 0,
      transactionId: "",
      error: "User ID required for refund",
    };
  }
  
  // Update order status to 'partial' before processing refund
  const now = new Date().toISOString();
  const db = createServiceSupabase();
  
  if (db) {
    const { error } = await db
      .from("orders")
      .update({
        status: "partial" as const,
        updated_at: now,
      })
      .eq("public_id", publicId);
    
    if (error) {
      console.error("Failed to update order status to partial:", error);
    }
  }
  
  // Update in-memory cache
  const local = memory.get(publicId);
  if (local) {
    memory.set(publicId, {
      ...local,
      status: "partial",
      updatedAt: now,
    });
  }
  
  // Process refund for undelivered quantity
  const { processRefund } = await import("./refunds");
  const refundResult = await processRefund({
    orderId: publicId,
    userId: refundUserId,
    reason: "partial",
    adminNote: "Automatic partial refund",
  });
  
  return refundResult;
}

async function storedUserId(publicId: string): Promise<string | null> {
  const local = memory.get(publicId) as (StoredOrder & { userId?: string }) | undefined;
  if (local?.userId) return local.userId;
  const db = createServiceSupabase();
  if (!db) return null;
  const { data } = await db.from("orders").select("user_id").eq("public_id", publicId).maybeSingle();
  return data?.user_id ?? null;
}

export { getLiveServiceById as getService };
