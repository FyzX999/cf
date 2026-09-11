# CashApp Payment System - Complete Breakdown

## High-Level Flow

```
1. Customer creates order
   ↓
2. Frontend calls POST /api/payments/checkout (method: "cashapp")
   ↓
3. createCashAppInvoice() creates PENDING payment record
   - Stores in admin-store.json payments array
   - gatewayId = order ID (e.g., "CF944441")
   - status = "pending"
   ↓
4. Returns instructions to frontend
   {
     payment: { id, provider, status, amount, gatewayId },
     instructions: {
       cashappTag: "$cheapfollower",
       amount: 50.00,
       note: "CF944441"  ← Customer MUST send this in memo
     }
   }
   ↓
5. Customer sends CashApp payment manually
   - Recipient: $cheapfollower (configured in CASHAPP_TAG env var)
   - Amount: $50.00
   - Note/Memo: CF944441 (order ID)
   ↓
6. Email arrives at fyzx91819@gmail.com
   - Subject: "Payment received" or "sent you"
   - From: cash@square.com
   - Contains: Amount, note field, "You were sent $X.XX"
   ↓
7. Payment check is triggered (either manually or via background job)
   - POST /api/payments/cashapp { orderId: "CF944441" }
   ↓
8. checkCashAppPayment() runs:
   - Connects to Gmail via IMAP
   - Searches for emails from cash@square.com
   - Filters by subject ("Payment received" or "sent you")
   - Parses HTML for: "You were sent $X.XX" (STRICT)
   - Extracts note field: must be "CF944441" format (STRICT)
   - Matches: amount=$50.00, note=CF944441
   ↓
9. If match found:
   - settlePayment() marks payment as "completed"
   - payOrder() marks order as paid in the system
   - Order fulfillment begins
   ↓
10. If no match:
    - Returns "pending" status
    - Order stays unpaid
```

---

## File-by-File Breakdown

### 1. **src/lib/payments.ts** - Payment Lifecycle
**Key Functions:**
- `createCashAppInvoice(input)` - Creates pending payment + returns instructions
- `findPaymentByGatewayId(orderId)` - Looks up payment record by order ID
- `settlePayment(record)` - Marks payment as completed, triggers fulfillment
- `paymentConfig()` - Returns which payment methods are enabled

**Payment Record Structure:**
```typescript
{
  id: "pay_abc123...",           // Unique payment ID
  provider: "cashapp",            // Payment method
  kind: "order" | "wallet",       // Is this an order or wallet topup?
  status: "pending" | "completed",
  amount: 50.00,                  // USD amount
  publicId: "CF944441",           // Order ID (for orders)
  gatewayId: "CF944441",          // Same as publicId for CashApp
  createdAt: "2026-09-10T20:52:55.000Z",
  completedAt?: "...",            // Set when payment completes
}
```

**Storage:** All payments stored in `data/admin-store.json` under `payments[]` array

---

### 2. **src/lib/cashapp.ts** - Email Parsing & Verification

**Key Function: `checkCashAppPayment(orderId, expectedAmount, config)`**

**What It Does:**
1. Connects to Gmail IMAP server
2. Searches inbox for emails from `cash@square.com` with subjects:
   - "Payment received" OR
   - "sent you"
3. For each email found:
   - Calls `parseCashAppEmail(html, plainText)`
   - Extracts amount, note, recipient
4. Compares extracted data against order requirements
5. Returns payment object if match found, null if not

**STRICT Validation in `parseCashAppEmail(html, plainText)`:**

Must contain ALL of these:
1. ✅ Plain text phrase: "You were sent" (rejects "You paid")
2. ✅ Amount pattern: "You were sent $XX.XX" → extracts as number
3. ✅ Note pattern: "CFxxxxxx" format (6+ digits after CF)
4. ✅ Recipient: Uses `CASHAPP_TAG` env var (e.g., "$cheapfollower")

**Example Validation:**
```
Email HTML/Text: "You were sent $50.00 for CF944441"
Parsing Result: {
  amount: 50.00,        ✅
  note: "CF944441",     ✅
  recipient: "cheapfollower"  ✅ (from CASHAPP_TAG env)
}
```

**Example Rejection:**
```
Email: "You paid $50.00"
Result: null ❌ (rejected - wrong phrase)

Email: "You were sent $50.00 for myorder123"
Result: null ❌ (rejected - note doesn't match CF format)

Email: "You were sent $50.00 for CF944441"
       But recipient field is "otheraccount"
Result: null ❌ (rejected - recipient mismatch)
```

---

### 3. **src/app/api/payments/cashapp/route.ts** - API Endpoint

**Endpoint:** `POST /api/payments/cashapp`

**Request Body:**
```json
{ "orderId": "CF944441" }
```

**Processing Steps:**
1. Validate order ID format (must be "CFXXXXXX")
2. Get CashApp config from env vars
3. Call `findPaymentByGatewayId(orderId)` 
   - Searches admin-store.json for matching gatewayId
   - If not found → "Payment not found" error (404)
4. If payment exists and already "completed" → return 200 (already processed)
5. Call `checkCashAppPayment(orderId, payment.amount, config)`
   - Checks Gmail for matching CashApp email
   - If not found → return 200 with status "pending"
   - If found → call `settlePayment(payment)`
6. Return 200 with status "completed"

**Response Examples:**
```json
// Payment found in email - settled successfully
{ "status": "completed", "message": "Payment processed successfully", "orderId": "CF944441" }

// Email not yet received or not matching order
{ "status": "pending", "message": "Payment not found yet" }

// Payment record not in database
{ "error": "Payment not found", "code": "NOT_FOUND", "statusCode": 404 }

// Config missing
{ "error": "CashApp is not configured", "code": "NOT_CONFIGURED", "statusCode": 503 }
```

---

## Environment Variables Required

```env
# CashApp Configuration
CASHAPP_TAG=cheapfollower                    # Your CashApp $tag
CASHAPP_EMAIL=fyzx91819@gmail.com           # Gmail account to check for emails
CASHAPP_EMAIL_PASSWORD=<app-password>        # Gmail app-specific password (not your main password)
CASHAPP_IMAP_HOST=imap.gmail.com            # IMAP server
CASHAPP_IMAP_PORT=993                       # IMAP port
```

---

## Data Storage (admin-store.json)

**Location:** `data/admin-store.json`

**Structure:**
```json
{
  "version": "1",
  "settings": { ... },
  "payments": [
    {
      "id": "pay_abc123...",
      "provider": "cashapp",
      "kind": "order",
      "status": "pending",
      "amount": 50.00,
      "publicId": "CF944441",
      "gatewayId": "CF944441",
      "createdAt": "2026-09-10T20:52:55.000Z"
    },
    { ... }
  ],
  "orders": [ ... ],
  "tickets": [ ... ]
}
```

---

## Current Issues & Debug Checkpoints

### ❌ "Payment not found" Error

**Possible Causes:**

1. **Payment record doesn't exist in admin-store.json**
   - Checkout API call failed
   - Payment was never saved
   - Check: Does `POST /api/payments/checkout` actually create the payment?

2. **Email hasn't arrived yet**
   - Gmail takes a few seconds
   - CashApp payment is still processing
   - Check: Does the email show up in Gmail inbox manually?

3. **Email parsing is failing**
   - Subject line is different
   - Amount format is different
   - "You were sent" phrase is missing
   - CF note format is wrong
   - Check: Look at server logs for parseCashAppEmail() output

4. **IMAP connection failing**
   - Credentials wrong
   - Gmail 2FA not disabled or app password not set
   - Check: Can you connect manually with Thunderbird/Mail client?

5. **Order ID mismatch**
   - Checkout created: "CF944441"
   - Email memo sent: "CF734641" (DIFFERENT!)
   - Check: Does email exactly match order ID?

6. **Amount mismatch**
   - Checkout: $50.00
   - Email received: $50 or $49.99 (DIFFERENT!)
   - Check: Match the exact amounts

---

## Debug Checklist

When "Payment not found" occurs:

```
1. ✅ Check admin-store.json:
   - Does payments[] array contain an entry with gatewayId="CF944441"?
   - Is status="pending"?

2. ✅ Check Gmail inbox:
   - Is the CashApp email present?
   - Subject line?
   - Does it say "You were sent $50.00"?

3. ✅ Check email memo field:
   - Does it say "CF944441" (exact match)?
   - Or does it say something else?

4. ✅ Check server logs:
   - Look for "[CashApp Parser]" lines
   - Are amounts being parsed correctly?
   - Is the note being extracted?

5. ✅ Check IMAP connection:
   - Are the env vars set correctly?
   - Try: echo $env:CASHAPP_EMAIL
   - Try connecting with Thunderbird manually

6. ✅ Check payment amount:
   - Checkout order amount = $50.00?
   - Email amount = $50.00? (not $50 or $49.99)
```

---

## What "Works" vs What "Doesn't Work"

### ✅ Works
- Checkout creates payment record
- Payment record saves to admin-store.json
- Email arrives from CashApp
- API endpoint receives requests
- Email parsing identifies amount & note

### ❌ Not Working (Most Common)
- **Order ID in email doesn't match order ID in checkout**
  - Checkout: CF944441
  - Email memo: CF734641
  - Result: No match = "pending" forever

- **Amount in email doesn't exactly match**
  - Checkout: $50.00
  - Email: $50 (without cents)
  - Result: No match = "pending" forever

- **IMAP credentials invalid**
  - Wrong password
  - 2FA blocking login
  - App password not created
  - Result: IMAP connection fails

---

## Key Takeaway

The system works like this:
1. **Checkout** creates a "pending" payment record with order ID as gateway ID
2. **Email arrives** from CashApp with payment details
3. **checkCashAppPayment()** searches Gmail for matching email
4. **Matching** checks: order ID (note field) + exact amount
5. **If match found** → payment settles → order pays → fulfillment starts

**If payment not found:** The email either (a) hasn't arrived, (b) has wrong order ID, (c) has wrong amount, or (d) IMAP can't reach it.
