-- Referral Program & Bulk Orders Schema
-- Copy and paste into Supabase SQL Editor

-- Create referral program tables
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  uses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'paid', 'pending')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bulk orders tracking
CREATE TABLE IF NOT EXISTS public.bulk_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_orders INT NOT NULL,
  completed_orders INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'cancelled')),
  csv_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order progress tracking (real-time updates)
CREATE TABLE IF NOT EXISTS public.order_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  progress_percent INT NOT NULL DEFAULT 0,
  current_delivered INT NOT NULL DEFAULT 0,
  target_quantity INT NOT NULL,
  estimated_completion_at TIMESTAMPTZ,
  last_update_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX idx_referral_commissions_referrer_id ON public.referral_commissions(referrer_id);
CREATE INDEX idx_referral_commissions_status ON public.referral_commissions(status);
CREATE INDEX idx_referral_commissions_created_at ON public.referral_commissions(created_at DESC);
CREATE INDEX idx_bulk_orders_user_id ON public.bulk_orders(user_id);
CREATE INDEX idx_bulk_orders_status ON public.bulk_orders(status);
CREATE INDEX idx_order_progress_order_id ON public.order_progress(order_id);
CREATE INDEX idx_order_progress_progress_percent ON public.order_progress(progress_percent);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals for themselves" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- RLS Policies for referral commissions
CREATE POLICY "Users can view own commissions" ON public.referral_commissions
  FOR SELECT USING (auth.uid() = referrer_id);

-- RLS Policies for bulk orders
CREATE POLICY "Users can view own bulk orders" ON public.bulk_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bulk orders" ON public.bulk_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for order progress
CREATE POLICY "Users can view own order progress" ON public.order_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_progress.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_bulk_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_order_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bulk_orders_update_timestamp ON public.bulk_orders;
CREATE TRIGGER bulk_orders_update_timestamp
  BEFORE UPDATE ON public.bulk_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bulk_orders_timestamp();

DROP TRIGGER IF EXISTS order_progress_update_timestamp ON public.order_progress;
CREATE TRIGGER order_progress_update_timestamp
  BEFORE UPDATE ON public.order_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_progress_timestamp();
