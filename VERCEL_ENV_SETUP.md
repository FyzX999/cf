# Vercel Environment Variables Setup

## ✅ COPY THESE TO VERCEL DASHBOARD

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Make sure ALL these variables are set for **Production, Preview, and Development** environments.

---

## 🔐 Required Variables

### Supabase (Database & Auth)
```
NEXT_PUBLIC_SUPABASE_URL
https://wgududgyrdgrvtlcvkrr.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndWR1ZGd5cmRncnZ0bGN2a3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTE5ODMsImV4cCI6MjEwMjgyNzk4M30.ap5rMTix-dPJM3ao4egKgZK5lB7Dj4_oaAobzTZlY3w

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndWR1ZGd5cmRncnZ0bGN2a3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI1MTk4MywiZXhwIjoyMTAyODI3OTgzfQ.ROCICWWy69kQqA-GjbYRAtMSSj0sfwDokRWZhfR_doc
```

### Site URL
```
NEXT_PUBLIC_SITE_URL
https://cheapfollower.shop
```

### GodofPanel (Fulfillment Provider)
```
GODOFPANEL_API_URL
https://godofpanel.com/api/v2

GODOFPANEL_API_KEY
e08f2b007c9befba706390fb89814f53

GODOFPANEL_SERVICE_MAP
(leave empty or add custom mapping)

MARKUP_PERCENT
80
```

### NowPayments (Crypto)
```
NOWPAYMENTS_API_KEY
GWVCAZP-C69MAY6-P1EPPB5-Y0DS5EK

NOWPAYMENTS_IPN_SECRET
CJKCYM2bwmY7zpjc3PHDFuxga38Y0Kqy

NOWPAYMENTS_MODE
live

NOWPAYMENTS_PUBLIC_KEY
ec68d941-1a58-452f-a6f0-dadfc0f6c38d
```

### Admin Access
```
ADMIN_SECRET_KEY
(use your existing value or generate a new random 32-character key)
```

---

## 🚀 After Adding Variables

1. Go to **Deployments** tab in Vercel
2. Click **3 dots** on latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes
5. Visit https://cheapfollower.shop

---

## ✅ Checklist

- [ ] All Supabase variables added to Vercel
- [ ] All GodofPanel variables added to Vercel
- [ ] All NowPayments variables added to Vercel
- [ ] NEXT_PUBLIC_SITE_URL set to https://cheapfollower.shop
- [ ] ADMIN_SECRET_KEY configured
- [ ] Redeployed after adding variables
- [ ] Site loads without "Supabase is not configured" error
- [ ] Can create user account
- [ ] Can place test order

---

## 📌 Important Notes

1. **Environment Scope**: Make sure to select "Production, Preview, and Development" when adding each variable
2. **Sensitive Keys**: NEVER commit `.env.local` or files with real keys to GitHub
3. **Testing**: After deployment, test account creation and order placement
4. **Supabase Tables**: Make sure your Supabase database has the required tables (orders, users, etc.)

---

## 🔍 Troubleshooting

**Still seeing "Supabase is not configured"?**
1. Check that ALL three Supabase variables are in Vercel
2. Verify they're set for "Production" environment
3. Make sure you clicked "Redeploy" after adding them
4. Check Vercel deployment logs for errors

**Can't create orders?**
1. Verify Supabase tables exist (see database schema in docs)
2. Check Supabase RLS policies are configured
3. Test API endpoints work: `/api/catalog`, `/api/orders`
