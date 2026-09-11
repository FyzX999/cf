import crypto from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';
import type { PaymentRecord, PaymentKind } from '@/lib/types';
import { findPaymentByGatewayId, savePayment, settlePayment, readStore } from '@/lib/payments';

/**
 * Helper to format money values for NOWPayments API
 */
function moneyValue(num: number): string {
  return num.toFixed(2);
}

/**
 * Get current site URL for crypto payment callbacks
 */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

/**
 * Get IPN site URL (may be different for Vercel environments)
 */
function ipnSiteUrl(): string {
  return process.env.NEXT_PUBLIC_IPN_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

/**
 * Get NOWPayments API base URL
 */
function nowpaymentsBase(): string {
  const mode = (process.env.NOWPAYMENTS_MODE || 'live').toLowerCase();
  return mode === 'sandbox' ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
}

/**
 * Sort object keys recursively for signature verification
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
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

/**
 * Create crypto payment invoice via NOWPayments
 */
export async function createCryptoInvoice(input: {
  kind: PaymentKind;
  amount: number;
  publicId?: string;
  userId?: string;
}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error('Crypto payments are not configured. Set NOWPAYMENTS_API_KEY.');
  const amount = Number(input.amount.toFixed(2));
  if (!(amount > 0)) throw new Error('Amount must be greater than zero');

  // Fetch minimum amount from NowPayments before creating invoice
  const mode = (process.env.NOWPAYMENTS_MODE || 'live').toLowerCase();
  const base = mode === 'sandbox' ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';

  let minAmount = 1.0;
  try {
    const minRes = await fetch(`${base}/v1/min-amount?currency_from=eth&currency_to=trx`, {
      headers: { 'x-api-key': apiKey },
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
      `This payment amount ($${amount.toFixed(2)}) is below the crypto payment minimum of $${minAmount.toFixed(2)}. Please use wallet or gift card payment.`,
    );
  }

  const orderId =
    input.kind === 'order'
      ? `order:${String(input.publicId)}:${crypto.randomUUID().slice(0, 8)}`
      : `wallet:${input.userId}:${crypto.randomUUID().slice(0, 8)}`;

  const successUrl =
    input.kind === 'order' ? `${siteUrl()}/track/${input.publicId}?paid=crypto` : `${siteUrl()}/dashboard/wallet?paid=crypto`;
  const cancelUrl = input.kind === 'order' ? `${siteUrl()}/track/${input.publicId}` : `${siteUrl()}/dashboard/wallet`;

  const res = await fetch(`${nowpaymentsBase()}/v1/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: 'usd',
      order_id: orderId,
      order_description: input.kind === 'order' ? `Order ${input.publicId}` : 'Wallet deposit',
      ipn_callback_url: `${ipnSiteUrl()}/api/payments/nowpayments/ipn`,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });
  const json = (await res.json()) as { id?: string | number; invoice_url?: string; message?: string };
  if (!res.ok || !json.id || !json.invoice_url) {
    throw new Error(json.message || 'Could not create crypto invoice');
  }

  const gatewayId = String(json.id);
  const record: PaymentRecord = {
    id: `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    provider: 'nowpayments',
    kind: input.kind,
    status: 'pending',
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

/**
 * Verify NOWPayments IPN signature
 */
export function verifyNowpaymentsSignature(rawBody: string, signature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) throw new Error('NOWPAYMENTS_IPN_SECRET is not set');
  if (!signature) return false;
  const payload = JSON.parse(rawBody) as unknown;
  const hmac = createHmac('sha512', secret).update(JSON.stringify(sortKeys(payload))).digest('hex');
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Statuses that indicate payment completed
 */
const PAID_CRYPTO_STATUSES = new Set(['confirmed', 'sending', 'finished']);

/**
 * Handle NOWPayments IPN callback
 */
export async function handleNowpaymentsIpn(payload: {
  payment_status?: string;
  invoice_id?: string | number;
  order_id?: string;
  price_amount?: number | string;
  actually_paid?: number | string;
  pay_amount?: number | string;
}) {
  const status = String(payload.payment_status || '').toLowerCase();
  if (!PAID_CRYPTO_STATUSES.has(status)) return { ignored: true, status };

  const gatewayId = String(payload.invoice_id || '');
  let record = gatewayId ? await findPaymentByGatewayId(gatewayId) : null;
  if (!record && payload.order_id) {
    const store = await readStore();
    const orderId = String(payload.order_id);
    record =
      store.payments.find(
        (p) =>
          p.provider === 'nowpayments' &&
          p.status === 'pending' &&
          orderId.includes(p.publicId ?? p.userId ?? ''),
      ) ?? null;
  }
  if (!record) throw new Error('Unknown crypto invoice');
  if (record.status === 'completed') return { ok: true, duplicate: true };

  return { ok: true, payment: await settlePayment(record) };
}
