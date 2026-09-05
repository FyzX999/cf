# Vercel Deployment Setup

## The Issue
Vercel uses a read-only file system, so we cannot save settings to `data/admin-store.json`. 

## The Solution
Settings are now stored in **Supabase** when deployed on Vercel.

---

## Quick Setup (2 options)

### Option 1: Use Environment Variables (Easiest)
Add these to your Vercel project settings:

```env
BASE_ORDER_COUNT=10000
AUTO_SYNC_COST=false
SITE_NAME=cheapfollower.shop
SITE_TAGLINE=Social Growth. Without the Complicated Price Tag.
SUPPORT_EMAIL=support@cheapfollower.shop
```

This works immediately without database setup.

### Option 2: Use Supabase (Recommended for full admin features)

1. **Create the table** in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  store_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS admin_settings_single_row 
ON admin_settings (id);

-- Initial insert
INSERT INTO admin_settings (id, store_data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
```

2. **Enable RLS** (Row Level Security):

```sql
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write
CREATE POLICY "Service role can do everything" ON admin_settings
FOR ALL USING (true);
```

3. Done! Settings will now persist across deployments.

---

## How It Works

- **On Vercel**: Uses Supabase `admin_settings` table
- **Local Dev**: Uses `data/admin-store.json` file
- **Automatic**: Detects environment and switches automatically

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_ORDER_COUNT` | Starting number for order counter | `0` |
| `AUTO_SYNC_COST` | Auto-sync provider costs | `false` |
| `SITE_NAME` | Site name | `cheapfollower.shop` |
| `SITE_TAGLINE` | Homepage tagline | `Social Growth...` |
| `SUPPORT_EMAIL` | Support email | `support@cheapfollower.shop` |
| `GUEST_CHECKOUT` | Allow guest orders | `true` |
| `MAINTENANCE_MODE` | Enable maintenance mode | `false` |
| `MIN_ORDER_AMOUNT` | Minimum order amount | `0` |
| `CURRENCY` | Currency code | `USD` |
| `RESELLER_DISCOUNT` | Reseller discount % | `20` |

---

## Testing

1. Deploy to Vercel
2. Go to `/admin/settings`
3. Change a setting
4. Click "Save settings"
5. ✅ Should save without errors

---

## Troubleshooting

**Settings not saving?**
- Check Supabase connection
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars
- Check Supabase logs for errors

**Want to use environment variables only?**
- Just don't create the Supabase table
- All settings will use env var defaults
- Still fully functional!

---

## Migration from File Storage

If you had local settings in `data/admin-store.json`:

1. Copy the content
2. In Supabase SQL Editor:
```sql
UPDATE admin_settings 
SET store_data = '{"settings": {...}, "promoCodes": [...]}'::jsonb
WHERE id = 1;
```

Replace `{...}` with your actual JSON data.