# Supabase Payment Audit Setup - Copy & Paste Ready

## ⚡ Super Quick Setup (2 Minutes)

### Step 1: Open Supabase
Go to: https://app.supabase.com → Choose your project → Click "SQL Editor"

### Step 2: Click "New Query"

### Step 3: Copy Everything Below ↓

```sql
-- Payment Audit Logging Table
-- Copy and paste this entire section into your Supabase SQL editor
-- After pasting, click "Run" to create the table

-- Create enum for payment audit actions
CREATE TYPE public.payment_audit_action AS ENUM (
  'created',
  'verified',
  'settled',
  'failed',
  'cancelled',
  'check_requested',
  'check_completed',
  'check_failed'
);

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- Create the payment_audit table
CREATE TABLE IF NOT EXISTS public.payment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  order_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Payment details
  amount NUMERIC(12, 2) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('cashapp', 'paypal', 'nowpayments', 'stripe')),
  status public.payment_status NOT NULL,
  
  -- Audit details
  action public.payment_audit_action NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Indexes for common queries
  CONSTRAINT payment_audit_amount_check CHECK (amount > 0)
);

-- Create indexes for performance
CREATE INDEX idx_payment_audit_order_id ON public.payment_audit(order_id);
CREATE INDEX idx_payment_audit_user_id ON public.payment_audit(user_id);
CREATE INDEX idx_payment_audit_provider ON public.payment_audit(provider);
CREATE INDEX idx_payment_audit_action ON public.payment_audit(action);
CREATE INDEX idx_payment_audit_created_at ON public.payment_audit(created_at DESC);
CREATE INDEX idx_payment_audit_order_created ON public.payment_audit(order_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.payment_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own payment audits
CREATE POLICY "Users can view own payment audits"
  ON public.payment_audit
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policy: Admins can view all payment audits
CREATE POLICY "Admins can view all audits"
  ON public.payment_audit
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policy: System can insert audit records (for server-side operations)
CREATE POLICY "System can insert audit records"
  ON public.payment_audit
  FOR INSERT
  WITH CHECK (true);

-- Create a function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payment_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS payment_audit_update_timestamp ON public.payment_audit;
CREATE TRIGGER payment_audit_update_timestamp
  BEFORE UPDATE ON public.payment_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_audit_timestamp();
```

### Step 4: Click "Run"

You should see: ✅ **Executed successfully**

### Step 5: Verify

Check these tabs in Supabase:
- **Tables**: Should see `payment_audit` table listed
- **Types**: Should see `payment_audit_action` and `payment_status` enums

---

## ✅ What Gets Created

| Item | Type | Purpose |
|------|------|---------|
| `payment_audit` | Table | Stores all payment operations |
| `payment_audit_action` | Enum | Action types (created, verified, settled, failed, etc.) |
| `payment_status` | Enum | Payment statuses (pending, completed, failed) |
| Indexes (6) | Indexes | Speed up queries by order_id, user_id, provider |
| RLS Policies (3) | Security | Users see own, admins see all |
| Auto-timestamp | Trigger | Automatically updates `updated_at` |

---

## 🎯 What's Being Tracked

Every payment operation logs:
- **order_id** - Order identifier
- **user_id** - Customer (if logged in)
- **amount** - Payment amount
- **provider** - Payment method (CashApp, PayPal, etc.)
- **status** - Current status
- **action** - What happened (created, verified, settled, failed)
- **details** - Extra info (JSON)
- **error** - Error message if failed
- **created_at** - When it happened
- **updated_at** - Last update time

---

## 🚀 Using It in Your Code

Your code is already integrated! The audit logging happens automatically when:
1. Payment is created
2. Payment is verified
3. Payment is settled
4. Payment fails

No additional setup needed in your application code.

---

## 📊 Viewing Audit Logs

In Supabase dashboard:
1. Go to **Table Editor**
2. Click **payment_audit** table
3. See all payment operations logged
4. Filter by order_id, provider, action, etc.

---

## ❓ Already Have payment_audit Table?

If you get an error like "relation already exists":

**Option 1: Drop and recreate**
```sql
DROP TABLE IF EXISTS public.payment_audit CASCADE;
DROP TYPE IF EXISTS public.payment_audit_action CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
-- Then run the SQL above
```

**Option 2: Skip table creation**
Just run the index and policy creation parts (below the table creation).

---

## 💡 Pro Tips

- Table is automatically set up with Row Level Security
- Users can only see their own payment audits
- Admins can see all audits
- The `updated_at` timestamp is automatically managed
- Queries are optimized with 6 indexes

---

## 📝 That's It!

Your Supabase payment audit system is ready. No code changes needed - the integration is already in place in your application!
