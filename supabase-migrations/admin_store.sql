-- Create admin_store table for storing site settings and admin data
-- This replaces the file-based admin-store.json for Vercel deployment

CREATE TABLE IF NOT EXISTS admin_store (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default empty store
INSERT INTO admin_store (id, data, updated_at)
VALUES ('main', '{
  "settings": {
    "siteName": "cheapfollower.shop",
    "tagline": "Social Growth. Without the Complicated Price Tag.",
    "supportEmail": "support@cheapfollower.shop",
    "announcement": "",
    "guestCheckout": true,
    "maintenanceMode": false,
    "defaultMarkupMultiplier": 1.8,
    "resellerDiscountPercent": 20,
    "minOrderAmount": 0,
    "currency": "USD",
    "deliveryMultipliers": {
      "standard": 1,
      "fast": 1.35,
      "drip": 1.15
    },
    "autoSyncProviderCost": false
  },
  "services": {},
  "tickets": [],
  "audit": [],
  "promoCodes": [
    {
      "code": "WELCOME10",
      "type": "percent",
      "value": 10,
      "active": true,
      "maxUses": 1000,
      "uses": 0,
      "minOrder": 0
    }
  ],
  "giftCards": [],
  "wallets": {},
  "payments": []
}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_store ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage admin store" ON admin_store
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE admin_store IS 'Stores admin settings, service overrides, tickets, and other admin data';
