# SMM Features Setup Guide

## ✅ Features Added

1. **Referral Program** - Track commissions and referral codes
2. **Bulk Order Builder** - Create multiple orders at once
3. **Real-time Order Progress Tracker** - Live order status updates
4. **Live Chat Widget Integration** - Customer support chat

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Update Supabase Schema

1. Go to: https://app.supabase.com → Your Project → **SQL Editor**
2. Click **New Query**
3. Copy entire SQL from: `SUPABASE_SMM_FEATURES.sql`
4. Click **Run**

Expected output: ✅ **Executed successfully**

### Step 2: Add Environment Variables

In your `.env.local`:

```env
# For Live Chat (Crisp) - Get from https://app.crisp.chat
NEXT_PUBLIC_CRISP_WEBSITE_ID=xxxxx-xxxxx-xxxxx-xxxxx-xxxxx

# Optional: Other providers
# TAWK_TO_PROPERTY_ID=xxxxx
# INTERCOM_APP_ID=xxxxx
```

### Step 3: Integrate Components in Your Pages

#### Referral Program Page
Create or edit `src/app/dashboard/referrals/page.tsx`:

```typescript
import { ReferralProgram } from "@/components/ReferralProgram";

export default function ReferralsPage() {
  return <ReferralProgram />;
}
```

#### Bulk Orders Page
Create or edit `src/app/dashboard/bulk-orders/page.tsx`:

```typescript
import { BulkOrderBuilder } from "@/components/BulkOrderBuilder";

export default function BulkOrdersPage() {
  return <BulkOrderBuilder />;
}
```

#### Order Progress Tracker
Add to your `src/app/track/[publicId]/page.tsx`:

```typescript
import { OrderProgressTracker } from "@/components/OrderProgressTracker";

export default function TrackPage({ params }: { params: { publicId: string } }) {
  return (
    <div>
      {/* ... existing tracking info ... */}
      <OrderProgressTracker publicId={params.publicId} />
    </div>
  );
}
```

#### Live Chat Widget
Add to your `src/app/layout.tsx`:

```typescript
import { LiveChatWidget } from "@/components/LiveChatWidget";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <LiveChatWidget />
      </body>
    </html>
  );
}
```

---

## 💬 Live Chat Setup Guide

### Option 1: Crisp Chat (Recommended - Free)

1. **Sign up**: https://app.crisp.chat
2. **Create account** and add website
3. **Get Website ID**:
   - Go to Settings → Integrations
   - Copy "Website ID"
4. **Add to .env.local**:
   ```env
   NEXT_PUBLIC_CRISP_WEBSITE_ID=your-website-id-here
   ```
5. **Deploy and test**

### Option 2: Tawk.to (Free)

1. **Sign up**: https://www.tawk.to
2. **Get Property ID**:
   - Dashboard → Channels → Chat Widget
   - Copy "Property ID"
3. **Add to .env.local**:
   ```env
   NEXT_PUBLIC_TAWK_PROPERTY_ID=your-property-id
   ```

### Option 3: Intercom (Paid - $39/month)

1. **Sign up**: https://www.intercom.com
2. **Get App ID**: Settings → Installation code
3. **Add to .env.local**:
   ```env
   NEXT_PUBLIC_INTERCOM_APP_ID=your-app-id
   ```

---

## 📊 Database Schema Added

### Tables

| Table | Purpose |
|-------|---------|
| `referrals` | Store referral codes and tracking |
| `referral_commissions` | Track earned commissions |
| `bulk_orders` | Track bulk order batches |
| `order_progress` | Real-time order delivery tracking |

### Key Fields

**referrals**
- `referral_code` - Unique code (e.g., REF-ABC123)
- `referrer_id` - User who owns the code
- `commission_rate` - Default 10% (customizable)
- `uses` - Number of times code was used

**referral_commissions**
- `amount` - Commission earned
- `status` - earned, paid, pending
- `order_id` - Which order generated it

**bulk_orders**
- `csv_data` - JSONB of order details
- `completed_orders` - Progress tracking
- `status` - processing, completed, cancelled

**order_progress**
- `progress_percent` - 0-100%
- `current_delivered` - Units delivered so far
- `target_quantity` - Total units
- `estimated_completion_at` - ETA

---

## 🔌 API Endpoints

### Referral Program

```bash
# Create referral code
POST /api/referrals
Content-Type: application/json
{ "action": "create" }

# Get user's referral codes
GET /api/referrals?type=code

# Get commission history
GET /api/referrals?type=commissions

# Claim referral by code
POST /api/referrals
{ "action": "claim", "referral_code": "REF-ABC123" }
```

### Bulk Orders

```bash
# Create bulk order
POST /api/bulk-orders
{
  "name": "My Campaign",
  "orders": [
    { "service_id": "...", "quantity": 1000, "link": "...", ... }
  ],
  "total_amount": 100.00
}

# Get bulk orders
GET /api/bulk-orders

# Get specific bulk order
GET /api/bulk-orders?id=uuid
```

### Order Progress

```bash
# Get progress by order ID
GET /api/order-progress?orderId=uuid

# Get progress by public ID
GET /api/order-progress?publicId=public-id

# Update progress (internal use)
POST /api/order-progress
{
  "orderId": "uuid",
  "current_delivered": 500,
  "target_quantity": 1000,
  "estimated_completion_at": "2026-09-12T15:00:00Z"
}
```

---

## 📱 Component Features

### ReferralProgram Component

```typescript
import { ReferralProgram } from "@/components/ReferralProgram";

export default function Page() {
  return <ReferralProgram />;
}
```

**Features**:
- ✅ Create referral codes
- ✅ Copy referral links
- ✅ View commission stats (earned, pending, paid)
- ✅ Commission history
- ✅ Real-time share tracking

### BulkOrderBuilder Component

```typescript
import { BulkOrderBuilder } from "@/components/BulkOrderBuilder";

export default function Page() {
  return <BulkOrderBuilder />;
}
```

**Features**:
- ✅ Add multiple orders
- ✅ CSV import/export
- ✅ Real-time price calculation
- ✅ Delivery speed selection
- ✅ Batch submission

### OrderProgressTracker Component

```typescript
import { OrderProgressTracker } from "@/components/OrderProgressTracker";

export default function Page() {
  return <OrderProgressTracker publicId="ORDER-123" />;
}
```

**Features**:
- ✅ Real-time progress bar
- ✅ Units delivered counter
- ✅ Estimated completion time
- ✅ Auto-refresh every 30s
- ✅ Completion celebration animation

### LiveChatWidget Component

```typescript
import { LiveChatWidget } from "@/components/LiveChatWidget";

export default function Page() {
  return <LiveChatWidget />;
}
```

**Features**:
- ✅ Crisp/Tawk.to/Intercom support
- ✅ Float button with animations
- ✅ Customizable styling

---

## 🎯 User Flow Examples

### Referral Flow

1. User goes to `/dashboard/referrals`
2. Clicks "Create Code" → `REF-ABC123` generated
3. Clicks "Copy Link" → Link copied to clipboard
4. Shares with friends → `cheapfollower.shop?ref=REF-ABC123`
5. Friend uses referral → Both get benefits
6. Commission automatically tracked and earned

### Bulk Order Flow

1. User goes to `/dashboard/bulk-orders`
2. Enters "Instagram Growth Campaign"
3. Adds 5 orders (1000 followers each @ $20 = $100)
4. Clicks "Create Bulk Order"
5. System creates 5 individual orders
6. Orders appear in user's dashboard with progress tracking

### Order Tracking Flow

1. User places order (single or bulk)
2. Goes to `/track/ORDER-123`
3. Sees real-time progress bar (0% → 100%)
4. Gets estimated completion time
5. Receives completion notification
6. Can download invoice/receipt

---

## 🔐 Security Features

- ✅ Row-level security (RLS) on all tables
- ✅ Users can only see their own data
- ✅ Commission withdrawal requires authentication
- ✅ Audit logging on all operations
- ✅ CSRF protection on forms

---

## 📊 Admin Dashboard Additions

Add to admin panel (`src/app/admin/analytics/page.tsx`):

```typescript
// View all referral commissions
const { data: allCommissions } = await supabase
  .from("referral_commissions")
  .select("*")
  .order("created_at", { ascending: false });

// View all bulk orders
const { data: allBulkOrders } = await supabase
  .from("bulk_orders")
  .select("*")
  .order("created_at", { ascending: false });
```

---

## 🧪 Testing

### Test Referral Program

```bash
1. Create account (Account A)
2. Go to /dashboard/referrals
3. Create referral code
4. Create new account (Account B) with referral link
5. Account B makes purchase
6. Check Account A's commissions → Should show earned amount
```

### Test Bulk Orders

```bash
1. Go to /dashboard/bulk-orders
2. Create 3 test orders (1000 qty each)
3. Submit bulk order
4. Check /dashboard/orders → All 3 orders should appear
5. Track each order progress
```

### Test Order Progress

```bash
1. Place order
2. Go to /track/ORDER-ID
3. See 0% progress
4. Use POST /api/order-progress to update
5. Progress bar updates in real-time
```

### Test Live Chat

```bash
1. Deploy with CRISP_WEBSITE_ID set
2. Open site in browser
3. Bottom-right corner should show chat button
4. Click to open chat widget
5. Send test message
```

---

## 🐛 Troubleshooting

### Referral codes not creating

1. Check Supabase is running
2. Verify RLS policies are enabled
3. Check user is authenticated (auth.sub exists)
4. Look at browser console for errors

### Bulk orders not submitting

1. Ensure all fields are filled
2. Check total_amount is calculated correctly
3. Verify orders array is not empty
4. Check Supabase row limits (if using free tier)

### Order progress not updating

1. Verify order exists in database
2. Check order_progress table has entry
3. Ensure `current_delivered` < `target_quantity`
4. Refresh page or wait 30 seconds for auto-update

### Live chat not showing

1. Check CRISP_WEBSITE_ID is set in .env.local
2. Verify it's not in NODE_ENV production without correct ID
3. Check browser console for Crisp script errors
4. Clear browser cache and reload

---

## 📈 Next Steps

### Optional Enhancements

1. **Email Notifications**
   - Notify when commission is earned
   - Bulk order status updates
   - Order completion notifications

2. **Automated Payouts**
   - Monthly commission payment to Stripe
   - Payout history tracking
   - Tax document generation

3. **Advanced Analytics**
   - Referral conversion rates
   - Commission ROI analysis
   - Bulk order performance metrics

4. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Offline order tracking

5. **API Documentation**
   - Generate OpenAPI docs
   - Partner integration guide
   - Webhook system for third-party apps

---

## ✅ Deployment Checklist

- [ ] Run `npm run build` - verify no errors
- [ ] Update Supabase schema (SUPABASE_SMM_FEATURES.sql)
- [ ] Set environment variables in Vercel
  - Add `NEXT_PUBLIC_CRISP_WEBSITE_ID`
  - Add other live chat provider IDs
- [ ] Deploy to Vercel
- [ ] Test referral program
- [ ] Test bulk orders
- [ ] Test order tracking
- [ ] Test live chat
- [ ] Monitor error logs in Vercel dashboard

---

## 📞 Support

For issues:
1. Check TypeScript errors: `npm run lint`
2. Check database: Supabase dashboard
3. Check logs: Vercel deployment logs
4. Check browser console: DevTools → Console tab

---

**All features are production-ready with zero TypeScript errors!** 🎉
