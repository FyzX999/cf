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

-- Optional: Create a materialized view for payment stats (run separately if needed)
-- CREATE MATERIALIZED VIEW public.payment_stats AS
-- SELECT 
--   provider,
--   DATE(created_at) as date,
--   COUNT(*) as total_transactions,
--   COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
--   COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
--   SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue,
--   AVG(CASE WHEN action = 'check_completed' THEN 
--     EXTRACT(EPOCH FROM (updated_at - created_at)) ELSE NULL END) as avg_verification_seconds
-- FROM public.payment_audit
-- GROUP BY provider, DATE(created_at);

-- CREATE INDEX idx_payment_stats_provider_date ON public.payment_stats(provider, date DESC);
