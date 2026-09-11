# Payment Methods

Organized payment processor integration for cheapfollower.shop. Each payment method (CashApp, PayPal, Crypto) has its own folder with isolated business logic, while shared utilities handle common concerns.

## Folder Structure

```
src/lib/payment-methods/
├── cashapp/                 # CashApp email-based payments
│   └── index.ts            # Email parsing, IMAP connection, payment verification
├── paypal/                 # PayPal REST API integration
│   └── index.ts            # Checkout creation, order capture, webhook handling
├── crypto/                 # NOWPayments crypto integration
│   └── index.ts            # Invoice creation, webhook verification, IPN handling
├── shared/                 # Shared utilities for all payment methods
│   ├── payment-constants.ts    # Regex patterns, configuration, thresholds
│   ├── payment-errors.ts       # Error types and validation helpers
│   ├── payment-matching.ts     # Fuzzy matching (Levenshtein), amount conversion
│   ├── payment-retry.ts        # Retry logic, deduplication, backoff
│   └── payment-review-queue.ts # Manual review queue for unmatched payments
├── index.ts                # Unified export layer (re-exports all payment APIs)
└── README.md               # This file
```

## Import Patterns

### Modern (Recommended)
Use the new organized structure:

```typescript
// Specific payment method
import { checkCashAppPayment, parseCashAppEmail } from '@/lib/payment-methods/cashapp';
import { createPaypalCheckout, capturePaypalOrder } from '@/lib/payment-methods/paypal';
import { createCryptoInvoice, handleNowpaymentsIpn } from '@/lib/payment-methods/crypto';

// Shared utilities
import { dollarsToCents, matchPayment } from '@/lib/payment-methods/shared/payment-matching';
import { PaymentError, PaymentErrorCode } from '@/lib/payment-methods/shared/payment-errors';
```

### Legacy (Backward Compatible)
Old imports still work through re-export files in `src/lib/`:

```typescript
// These are maintained for backward compatibility
import { checkCashAppPayment } from '@/lib/cashapp';
import { dollarsToCents } from '@/lib/payment-matching';
import { PaymentError } from '@/lib/payment-errors';
```

**Note:** Legacy imports will be removed in a future release. Please migrate to the new structure.

## Payment Method APIs

### CashApp (`src/lib/payment-methods/cashapp/index.ts`)

Email-based payment verification using Gmail IMAP.

```typescript
import { checkCashAppPayment, getCashAppConfig, parseCashAppEmail } from '@/lib/payment-methods/cashapp';

// Check if a payment has arrived
const payment = await checkCashAppPayment(orderId, expectedAmount, config);

// Parse email manually
const parsed = await parseCashAppEmail(htmlContent, plainText);

// Get configuration from environment
const config = getCashAppConfig();
```

**Configuration (Environment Variables):**
```
CASHAPP_TAG=\$followermarket
CASHAPP_EMAIL=your-email@gmail.com
CASHAPP_EMAIL_PASSWORD=your-app-password
CASHAPP_IMAP_HOST=imap.gmail.com
CASHAPP_IMAP_PORT=993
```

### PayPal (`src/lib/payment-methods/paypal/index.ts`)

PayPal REST API integration.

```typescript
import { createPaypalCheckout, capturePaypalOrder, handlePaypalWebhookEvent } from '@/lib/payment-methods/paypal';

// Create a checkout order
const { url, payment } = await createPaypalCheckout({ kind: 'order', amount: 50, publicId: 'CF123456' });

// Capture a completed order
const settled = await capturePaypalOrder(paypalOrderId);

// Handle webhook
const result = await handlePaypalWebhookEvent(webhookBody);
```

**Configuration (Environment Variables):**
```
PAYPAL_MODE=live|sandbox
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id
```

### Crypto / NOWPayments (`src/lib/payment-methods/crypto/index.ts`)

Cryptocurrency payment processing via NOWPayments.

```typescript
import { createCryptoInvoice, handleNowpaymentsIpn, verifyNowpaymentsSignature } from '@/lib/payment-methods/crypto';

// Create invoice
const { url, payment } = await createCryptoInvoice({ kind: 'order', amount: 50, publicId: 'CF123456' });

// Handle IPN callback
const result = await handleNowpaymentsIpn(webhookPayload);

// Verify webhook signature
const isValid = verifyNowpaymentsSignature(rawBody, signature);
```

**Configuration (Environment Variables):**
```
NOWPAYMENTS_MODE=live|sandbox
NOWPAYMENTS_API_KEY=your-api-key
NOWPAYMENTS_PUBLIC_KEY=your-public-key
NOWPAYMENTS_IPN_SECRET=your-secret
```

## Shared Utilities

### Payment Matching (`payment-matching.ts`)

Fuzzy matching and financial calculations:

```typescript
import { 
  matchPayment,              // Full payment match with details
  dollarsToCents,           // "$50.00" → 5000
  centsToDollars,           // 5000 → "$50.00"
  fuzzyMatchOrderId,        // Levenshtein distance matching
  levenshteinDistance,      // String similarity
  normalizeOrderId          // Normalize for comparison
} from '@/lib/payment-methods/shared/payment-matching';

// Match with fuzzy tolerance
const result = matchPayment({
  extractedOrderId: 'CF123456',
  expectedOrderId: 'CF123456',
  extractedAmount: '$50.00',
  expectedAmount: 50,
  extractedRecipient: '$myTag',
  expectedRecipient: '$myTag',
  orderIdMaxDistance: 2,    // Allow 2 char typo
  amountToleranceCents: 1,  // Allow 1¢ difference
  requireRecipientMatch: false
});

if (result.matched) {
  console.log(result.details);
}
```

### Payment Errors (`payment-errors.ts`)

Standardized error handling:

```typescript
import { PaymentError, PaymentErrorCode, validateOrderId } from '@/lib/payment-methods/shared/payment-errors';

// Throw with context
throw new PaymentError(
  PaymentErrorCode.NOT_FOUND,
  'Payment not found',
  404
);

// Validate formats
if (!validateOrderId(orderId)) {
  throw new Error('Invalid order ID format');
}
```

### Retry Logic (`payment-retry.ts`)

Retry with exponential backoff and deduplication:

```typescript
import { retryWithBackoff, withDeduplication, sleep } from '@/lib/payment-methods/shared/payment-retry';

// Retry with backoff
const result = await retryWithBackoff(
  async () => checkCashAppPayment(orderId, amount, config),
  { maxAttempts: 3, initialDelayMs: 1000 }
);

// Deduplicate concurrent requests
const dedupKey = `payment-check-${orderId}`;
const result = await withDeduplication(dedupKey, async () => {
  return checkCashAppPayment(orderId, amount, config);
});
```

### Review Queue (`payment-review-queue.ts`)

Manual review for unmatched payments:

```typescript
import { 
  queueUnmatchedPayment,    // Add to review queue
  getUnmatchedPayments,     // Get pending reviews
  markPaymentAsReviewed,    // Resolve a review
  getUnmatchedPaymentStats  // Stats dashboard
} from '@/lib/payment-methods/shared/payment-review-queue';

// Queue an email that couldn't be parsed
await queueUnmatchedPayment({
  subject: 'Payment received',
  from: 'cash@square.com',
  date: new Date(),
  htmlSnippet: emailHtml.substring(0, 2000),
  extractedData: { amount: 50 },
  reason: 'CF code extraction failed'
});

// Review later
const pending = await getUnmatchedPayments();
for (const payment of pending) {
  await markPaymentAsReviewed(payment.id, 'manual_approved', 'admin');
}
```

### Constants (`payment-constants.ts`)

Configuration and regex patterns:

```typescript
export const CASHAPP_PATTERNS = {
  RECEIVED_PHRASE: 'You were sent',
  AMOUNT_REGEX: /You were sent \$(\d+(?:\.\d{1,2})?)/i,
  CF_PATTERNS: [
    /\b(CF\d{6})\b/i,
    /For:?\s*(CF\d{6})\b/i,
    /Note:?\s*(CF\d{6})\b/i,
  ]
};

export const IMAP_CONFIG = {
  SEARCH_TIMEOUT_MS: 60000,
  CHECK_SEARCH_DAYS: 30,
  // ...
};
```

## API Routes

### CashApp Payment Check
**POST /api/payments/cashapp**

Request:
```json
{ "orderId": "CF123456" }
```

Response (pending):
```json
{ "status": "pending", "message": "Payment not found yet" }
```

Response (completed):
```json
{ "status": "completed", "message": "Payment processed successfully", "orderId": "CF123456" }
```

### PayPal Return
**GET /api/payments/paypal/return**

Handles return from PayPal approval page.

### PayPal Webhook
**POST /api/payments/paypal/webhook**

Receives PayPal webhook events and verifies signatures.

### NOWPayments IPN
**POST /api/payments/nowpayments/ipn**

Receives crypto payment notifications and verifies HMAC signatures.

## Debugging

### Enable Verbose Logging

All payment modules log to console with prefixes:

```
[CashApp]
[CashApp Parser]
[CashApp Batch]
[Payment Matching]
[Payment Review Queue]
```

To debug payment issues:

1. **Check Vercel Function Logs**: All console.log calls appear in Vercel dashboard under Deployments → Logs
2. **Local Development**: Run `npm run dev` and check terminal output
3. **Unmatched Payment Queue**: Query `getUnmatchedPayments()` to see failed emails

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Payment not found yet" | Email not detected by IMAP | Check `.found` property removed, verify IMAP credentials |
| Amount mismatch | "$1" vs "1.00" string comparison | Using `dollarsToCents()` for normalization |
| Recipient mismatch | CashApp shows display name, not cashtag | Set `requireRecipientMatch: false` |
| Settlement blocked | `.found` property check in route | Fixed in route.ts line 60 |

## Migration Guide

### From Old to New Structure

**Old:**
```typescript
import { checkCashAppPayment } from '@/lib/cashapp';
import { dollarsToCents } from '@/lib/payment-matching';
import { PaymentError } from '@/lib/payment-errors';
```

**New:**
```typescript
import { checkCashAppPayment } from '@/lib/payment-methods/cashapp';
import { dollarsToCents } from '@/lib/payment-methods/shared/payment-matching';
import { PaymentError } from '@/lib/payment-methods/shared/payment-errors';
```

Or use the unified export:
```typescript
import { 
  checkCashAppPayment, 
  dollarsToCents, 
  PaymentError 
} from '@/lib/payment-methods';
```

## Contributing

When adding new payment methods:

1. Create folder: `src/lib/payment-methods/<provider>/index.ts`
2. Implement provider API in the folder
3. Re-export from `src/lib/payment-methods/index.ts`
4. Create backward-compat file in `src/lib/<provider>.ts` if needed
5. Document in this README
6. Add environment variables to `.env.example`

## Related Files

- **Route handlers**: `src/app/api/payments/`
- **Type definitions**: `src/lib/types.ts` (PaymentRecord, PaymentKind, etc.)
- **Payment settlement**: `src/lib/payments.ts` (startCheckout, settlePayment)
- **Order fulfillment**: `src/lib/orders.ts` (payOrder, which runs after settlement)
