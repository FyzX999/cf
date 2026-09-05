import { createHmac, timingSafeEqual } from "crypto";
import { creditWallet } from "./commerce";
import { payOrder } from "./orders";
import { readStore, writeStore } from "./admin-store";
import type { PaymentKind, PaymentProvider, PaymentRecord } from "./types";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://cheapfollower.shop").replace(/\/$/, "");
}

function ipnSiteUrl() {
  const url = siteUrl();
  if (/localhost|127\.0\.0\.1/i.test(url)) return "https://cheapfollower.shop";
  return url;
}

function paypalBase() {
  const mode = (process.env.PAYPAL_MODE || "live").toLowerCase();
  return mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

function nowpaymentsBase() {
  const mode = (process.env.NOWPAYMENTS_MODE || "live").toLowerCase();
  return mode === "sandbox" ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
}

export function paymentConfig() {
  return {
    paypal: false,
    crypto: Boolean(process.env.NOWPAYMENTS_API_KEY),
    cashapp: Boolean(
      process.env.CASHAPP_TAG &&
      process.env.CASHAPP_EMAIL &&
      process.env.CASHAPP_EMAIL_PASSWORD
    ),
  };
}

let paypalToken: { value: string; exp: number } | null = null;

async function paypalAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  if (paypalToken && paypalToken.exp > Date.now() + 15_000) return paypalToken.value;
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || "PayPal authentication failed");
  }
  paypalToken = { value: json.access_token, exp: Date.now() + (json.expires_in ?? 300) * 1000 };
  return json.access_token;
}

async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const message =
      (json.message as string) ||
      (Array.isArray(json.details) ? JSON.stringify(json.details) : "") ||
      `PayPal request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

function moneyValue(amount: number) {
  return amount.toFixed(2);
}

async function savePayment(record: PaymentRecord) {
  await writeStore((store) => {
    const rest = store.payments.filter((p) => p.id !== record.id && p.gatewayId !== record.gatewayId);
    return { ...store, payments: [record, ...rest].slice(0, 500) };
  });
}

export async function findPaymentByGatewayId(gatewayId: string) {
  const store = await readStore();
  return store.payments.find((p) => p.gatewayId === gatewayId) ?? null;
}

export async function settlePayment(record: PaymentRecord) {
  const outcome: { claimed?: PaymentRecord; already?: PaymentRecord } = {};
  await writeStore((store) => {
    const current = store.payments.find((p) => p.id === record.id || p.gatewayId === record.gatewayId);
    if (current?.status === "completed") {
      outcome.already = current;
      return store;
    }
    const claimed: PaymentRecord = {
      ...(current ?? record),
      status: "completed",
      completedAt: new Date().toISOString(),
    };
    outcome.claimed = claimed;
    const rest = store.payments.filter((p) => p.id !== claimed.id && p.gatewayId !== claimed.gatewayId);
    return { ...store, payments: [claimed, ...rest].slice(0, 500) };
  });
  if (outcome.already) {
    if (outcome.already.kind === "order" && outcome.already.publicId) {
      await payOrder({
        publicId: outcome.already.publicId,
        userId: outcome.already.userId,
        paidViaGateway: true,
      });
    }
    return outcome.already;
  }
  const done = outcome.claimed;
  if (!done) throw new Error("Could not record payment");

  if (done.kind === "wallet") {
    if (!done.userId) throw new Error("Wallet deposit is missing a user");
    await creditWallet(done.userId, done.amount, done.provider === "paypal" ? "PayPal" : "Crypto", done.gatewayId);
    return done;
  }

  if (!done.publicId) throw new Error("Order payment is missing an order ID");
  await payOrder({
    publicId: done.publicId,
    userId: done.userId,
    paidViaGateway: true,
  });
  return done;
}

export async function createPaypalCheckout(input: {
  kind: PaymentKind;
  amount: number;
  publicId?: string;
  userId?: string;
}) {
  if (!paymentConfig().paypal) throw new Error("PayPal is not configured");
  const amount = Number(input.amount.toFixed(2));
  if (!(amount > 0)) throw new Error("Amount must be greater than zero");

  const reference = input.kind === "order" ? String(input.publicId) : `WALLET-${input.userId}`;
  const returnPath =
    input.kind === "order"
      ? `/payments/paypal/return?kind=order&publicId=${encodeURIComponent(String(input.publicId))}`
      : `/payments/paypal/return?kind=wallet`;
  const cancelPath = input.kind === "order" ? `/track/${input.publicId}` : "/dashboard/wallet";

  const created = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: reference.slice(0, 256),
          custom_id: reference.slice(0, 127),
          description: "Digital SMM service. Intangible good delivered electronically. All sales final.",
          amount: {
            currency_code: "USD",
            value: moneyValue(amount),
            breakdown: { item_total: { currency_code: "USD", value: moneyValue(amount) } },
          },
          items: [
            {
              name: input.kind === "order" ? `Order ${input.publicId}` : "Wallet deposit",
              description: "Non-physical digital marketing service / account credit. No shipping.",
              quantity: "1",
              category: "DIGITAL_GOODS",
              unit_amount: { currency_code: "USD", value: moneyValue(amount) },
            },
          ],
        },
      ],
      application_context: {
        brand_name: "cheapfollower.shop",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${siteUrl()}${returnPath}`,
        cancel_url: `${siteUrl()}${cancelPath}`,
      },
    }),
  });

  const gatewayId = String(created.id);
  const approve = (created.links as { rel: string; href: string }[] | undefined)?.find((l) => l.rel === "approve");
  if (!approve?.href) throw new Error("PayPal did not return an approval URL");

  const record: PaymentRecord = {
    id: `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    provider: "paypal",
    kind: input.kind,
    status: "pending",
    amount,
    publicId: input.publicId,
    userId: input.userId,
    gatewayId,
    invoiceUrl: approve.href,
    createdAt: new Date().toISOString(),
  };
  await savePayment(record);
  return { url: approve.href, payment: record };
}

export async function capturePaypalOrder(paypalOrderId: string) {
  const existing = await findPaymentByGatewayId(paypalOrderId);
  if (existing?.status === "completed") return existing;

  let captured: Record<string, unknown>;
  try {
    captured = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST" });
  } catch {
    captured = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}`);
  }
  const status = String(captured.status || "");
  if (status === "APPROVED") {
    captured = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST" });
  }
  if (String(captured.status || "") !== "COMPLETED") {
    throw new Error(`PayPal capture is ${captured.status || "incomplete"}`);
  }

  const record =
    existing ??
    ({
      id: `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      provider: "paypal" as const,
      kind: "order" as PaymentKind,
      status: "pending" as const,
      amount: Number(
        (
          captured.purchase_units as {
            payments?: { captures?: { amount?: { value?: string } }[] };
          }[]
        )?.[0]?.payments?.captures?.[0]?.amount?.value ?? 0,
      ),
      gatewayId: paypalOrderId,
      createdAt: new Date().toISOString(),
    } satisfies PaymentRecord);

  return settlePayment(record);
}

export async function createCryptoInvoice(input: {
  kind: PaymentKind;
  amount: number;
  publicId?: string;
  userId?: string;
}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error("Crypto payments are not configured. Set NOWPAYMENTS_API_KEY.");
  const amount = Number(input.amount.toFixed(2));
  if (!(amount > 0)) throw new Error("Amount must be greater than zero");

  // Fetch minimum amount from NowPayments before creating invoice
  const mode = (process.env.NOWPAYMENTS_MODE || "live").toLowerCase();
  const base = mode === "sandbox" ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
  
  let minAmount = 1.0;
  try {
    const minRes = await fetch(`${base}/v1/min-amount?currency_from=eth&currency_to=trx`, {
      headers: { "x-api-key": apiKey },
    });
    if (minRes.ok) {
      const minJson = (await minRes.json()) as { min_amount?: number };
      minAmount = Number(minJson.min_amount ?? 1.0);
    }
  } catch {
    // Fallback to $1 minimum if API fails
    minAmount = 1.0;
  }

  if (amount < minAmount) {
    throw new Error(
      `This payment amount ($${amount.toFixed(2)}) is below the crypto payment minimum of $${minAmount.toFixed(2)}. Please use wallet or gift card payment.`
    );
  }

  const orderId =
    input.kind === "order"
      ? `order:${String(input.publicId)}:${crypto.randomUUID().slice(0, 8)}`
      : `wallet:${input.userId}:${crypto.randomUUID().slice(0, 8)}`;

  const successUrl =
    input.kind === "order" ? `${siteUrl()}/track/${input.publicId}?paid=crypto` : `${siteUrl()}/dashboard/wallet?paid=crypto`;
  const cancelUrl = input.kind === "order" ? `${siteUrl()}/track/${input.publicId}` : `${siteUrl()}/dashboard/wallet`;

  const res = await fetch(`${nowpaymentsBase()}/v1/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: "usd",
      order_id: orderId,
      order_description: input.kind === "order" ? `Order ${input.publicId}` : "Wallet deposit",
      ipn_callback_url: `${ipnSiteUrl()}/api/payments/nowpayments/ipn`,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });
  const json = (await res.json()) as { id?: string | number; invoice_url?: string; message?: string };
  if (!res.ok || !json.id || !json.invoice_url) {
    throw new Error(json.message || "Could not create crypto invoice");
  }

  const gatewayId = String(json.id);
  const record: PaymentRecord = {
    id: `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    provider: "nowpayments",
    kind: input.kind,
    status: "pending",
    amount,
    publicId: input.publicId,
    userId: input.userId,
    gatewayId,
    invoiceUrl: json.invoice_url,
    createdAt: new Date().toISOString(),
  };
  await savePayment(record);
  return { url: json.invoice_url, payment: record };
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      }, {});
  }
  return value;
}

export function verifyNowpaymentsSignature(rawBody: string, signature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) throw new Error("NOWPAYMENTS_IPN_SECRET is not set");
  if (!signature) return false;
  const payload = JSON.parse(rawBody) as unknown;
  const hmac = createHmac("sha512", secret).update(JSON.stringify(sortKeys(payload))).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const PAID_CRYPTO_STATUSES = new Set(["confirmed", "sending", "finished"]);

export async function handleNowpaymentsIpn(payload: {
  payment_status?: string;
  invoice_id?: string | number;
  order_id?: string;
  price_amount?: number | string;
  actually_paid?: number | string;
  pay_amount?: number | string;
}) {
  const status = String(payload.payment_status || "").toLowerCase();
  if (!PAID_CRYPTO_STATUSES.has(status)) return { ignored: true, status };

  const gatewayId = String(payload.invoice_id || "");
  let record = gatewayId ? await findPaymentByGatewayId(gatewayId) : null;
  if (!record && payload.order_id) {
    const store = await readStore();
    const orderId = String(payload.order_id);
    record =
      store.payments.find((p) => p.provider === "nowpayments" && p.status === "pending" && orderId.includes(p.publicId ?? p.userId ?? "")) ??
      null;
  }
  if (!record) throw new Error("Unknown crypto invoice");
  if (record.status === "completed") return { ok: true, duplicate: true };

  return { ok: true, payment: await settlePayment(record) };
}

export async function verifyPaypalWebhook(headers: Headers, body: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return true;
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

  const result = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: body,
    }),
  });
  return String(result.verification_status) === "SUCCESS";
}

export async function handlePaypalWebhookEvent(event: {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    custom_id?: string;
  };
}) {
  const type = String(event.event_type || "");
  if (type !== "PAYMENT.CAPTURE.COMPLETED" && type !== "CHECKOUT.ORDER.APPROVED") {
    return { ignored: true, type };
  }
  const paypalOrderId =
    event.resource?.supplementary_data?.related_ids?.order_id ||
    (type === "CHECKOUT.ORDER.APPROVED" ? event.resource?.id : undefined);
  if (paypalOrderId) {
    const payment = await capturePaypalOrder(paypalOrderId);
    return { ok: true, payment };
  }

  const customId = event.resource?.custom_id;
  if (customId) {
    const store = await readStore();
    const pending = store.payments.find(
      (p) => p.provider === "paypal" && p.status === "pending" && (p.publicId === customId || p.gatewayId === customId),
    );
    if (pending) {
      const payment = await capturePaypalOrder(pending.gatewayId);
      return { ok: true, payment };
    }
  }
  return { ignored: true, type };
}

export async function createCashAppInvoice(input: {
  kind: PaymentKind;
  amount: number;
  publicId?: string;
  userId?: string;
}) {
  const cashappTag = process.env.CASHAPP_TAG;
  if (!cashappTag) throw new Error("CashApp is not configured. Set CASHAPP_TAG.");
  const amount = Number(input.amount.toFixed(2));
  if (!(amount > 0)) throw new Error("Amount must be greater than zero");

  // For CashApp, we create a "pending" payment record and return instructions
  // The actual payment verification happens via email monitoring
  const record: PaymentRecord = {
    id: `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    provider: "cashapp",
    kind: input.kind,
    status: "pending",
    amount,
    publicId: input.publicId,
    userId: input.userId,
    gatewayId: input.publicId || `wallet-${input.userId}`, // Use order ID as gateway ID
    createdAt: new Date().toISOString(),
  };
  await savePayment(record);

  // Return instructions instead of redirect URL
  return {
    payment: record,
    instructions: {
      cashappTag,
      amount,
      note: input.publicId || `WALLET-${input.userId}`, // Customer must include this in payment note
    },
  };
}

export type CheckoutMethod = PaymentProvider;

export async function startCheckout(input: {
  method: CheckoutMethod;
  kind: PaymentKind;
  amount: number;
  publicId?: string;
  userId?: string;
}) {
  if (input.method === "paypal") return createPaypalCheckout(input);
  if (input.method === "cashapp") return createCashAppInvoice(input);
  return createCryptoInvoice(input);
}
