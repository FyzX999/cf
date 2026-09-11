import crypto from 'crypto';
import type { PaymentRecord, PaymentKind } from '@/lib/types';
import { findPaymentByGatewayId, savePayment, settlePayment, readStore } from '@/lib/payments';

/**
 * Helper to format money values for PayPal API
 */
function moneyValue(num: number): string {
  return num.toFixed(2);
}

/**
 * Get current site URL for PayPal callbacks
 */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

/**
 * Fetch wrapper for PayPal API calls
 */
async function paypalFetch(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');

  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase();
  const base = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  // Get access token
  const authRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const authJson = (await authRes.json()) as { access_token?: string };
  const token = authJson.access_token;
  if (!token) throw new Error('Failed to get PayPal access token');

  // Make request
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

/**
 * Create PayPal checkout order
 */
export async function createPaypalCheckout(input: {
  kind: PaymentKind;
  amount: number;
  publicId?: string;
  userId?: string;
}) {
  const amount = Number(input.amount.toFixed(2));
  if (!(amount > 0)) throw new Error('Amount must be greater than zero');

  const reference = input.kind === 'order' ? String(input.publicId) : `WALLET-${input.userId}`;
  const returnPath =
    input.kind === 'order'
      ? `/payments/paypal/return?kind=order&publicId=${encodeURIComponent(String(input.publicId))}`
      : `/payments/paypal/return?kind=wallet`;
  const cancelPath = input.kind === 'order' ? `/track/${input.publicId}` : '/dashboard/wallet';

  const created = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference.slice(0, 256),
          custom_id: reference.slice(0, 127),
          description: 'Digital SMM service. Intangible good delivered electronically. All sales final.',
          amount: {
            currency_code: 'USD',
            value: moneyValue(amount),
            breakdown: { item_total: { currency_code: 'USD', value: moneyValue(amount) } },
          },
          items: [
            {
              name: input.kind === 'order' ? `Order ${input.publicId}` : 'Wallet deposit',
              description: 'Non-physical digital marketing service / account credit. No shipping.',
              quantity: '1',
              category: 'DIGITAL_GOODS',
              unit_amount: { currency_code: 'USD', value: moneyValue(amount) },
            },
          ],
        },
      ],
      application_context: {
        brand_name: 'cheapfollower.shop',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: `${siteUrl()}${returnPath}`,
        cancel_url: `${siteUrl()}${cancelPath}`,
      },
    }),
  });

  const gatewayId = String(created.id);
  const approve = (created.links as { rel: string; href: string }[] | undefined)?.find((l) => l.rel === 'approve');
  if (!approve?.href) throw new Error('PayPal did not return an approval URL');

  const record: PaymentRecord = {
    id: `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    provider: 'paypal',
    kind: input.kind,
    status: 'pending',
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

/**
 * Capture a PayPal order
 */
export async function capturePaypalOrder(paypalOrderId: string) {
  const existing = await findPaymentByGatewayId(paypalOrderId);
  if (existing?.status === 'completed') return existing;

  let captured: Record<string, unknown>;
  try {
    captured = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: 'POST' });
  } catch {
    captured = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}`);
  }
  const status = String(captured.status || '');
  if (status === 'APPROVED') {
    captured = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: 'POST' });
  }
  if (String(captured.status || '') !== 'COMPLETED') {
    throw new Error(`PayPal capture is ${captured.status || 'incomplete'}`);
  }

  const record =
    existing ??
    ({
      id: `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      provider: 'paypal' as const,
      kind: 'order' as PaymentKind,
      status: 'pending' as const,
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

/**
 * Verify PayPal webhook signature
 */
export async function verifyPaypalWebhook(headers: Headers, body: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return true;
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');
  const transmissionSig = headers.get('paypal-transmission-sig');
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

  const result = await paypalFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
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
  return String(result.verification_status) === 'SUCCESS';
}

/**
 * Handle PayPal webhook event
 */
export async function handlePaypalWebhookEvent(event: {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    custom_id?: string;
  };
}) {
  const type = String(event.event_type || '');
  if (type !== 'PAYMENT.CAPTURE.COMPLETED' && type !== 'CHECKOUT.ORDER.APPROVED') {
    return { ignored: true, type };
  }
  const paypalOrderId =
    event.resource?.supplementary_data?.related_ids?.order_id ||
    (type === 'CHECKOUT.ORDER.APPROVED' ? event.resource?.id : undefined);
  if (paypalOrderId) {
    const payment = await capturePaypalOrder(paypalOrderId);
    return { ok: true, payment };
  }

  const customId = event.resource?.custom_id;
  if (customId) {
    const store = await readStore();
    const pending = store.payments.find(
      (p) => p.provider === 'paypal' && p.status === 'pending' && (p.publicId === customId || p.gatewayId === customId),
    );
    if (pending) {
      const payment = await capturePaypalOrder(pending.gatewayId);
      return { ok: true, payment };
    }
  }
  return { ignored: true, type };
}
