# Deployment Guide - cheapfollower.shop

This guide walks you through deploying cheapfollower.shop to Vercel with GitHub integration.

## Prerequisites

- GitHub account
- Vercel account (sign up with GitHub at https://vercel.com)
- Your domain name configured

## Step 1: Initialize Git Repository

Open PowerShell in your project directory and run:

```powershell
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: cheapfollower.shop SMM panel"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `cheapfollower-shop` (or your preferred name)
3. Make it **Private** (recommended for production code)
4. **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 3: Push to GitHub

Copy the commands from GitHub (they'll look like this):

```powershell
# Add GitHub as remote origin (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/cheapfollower-shop.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Configure environment variables (see below)
6. Click "Deploy"

### Option B: Deploy via Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

## Step 5: Configure Environment Variables in Vercel

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

### Required Variables:

```env
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://cheapfollower.shop

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NowPayments (Crypto)
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NOWPAYMENTS_MODE=live

# GodofPanel (Provider)
GODOFPANEL_API_URL=https://godofpanel.com/api/v2
GODOFPANEL_API_KEY=your_godofpanel_key
GODOFPANEL_SERVICE_MAP=101:12345,102:12346

# Admin
ADMIN_SECRET_KEY=create_a_strong_random_key_here

# PayPal (if using)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
PAYPAL_MODE=live
```

**Important:** Set all environment variables for "Production", "Preview", and "Development" environments.

## Step 6: Configure Custom Domain

1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain: `cheapfollower.shop`
3. Add `www.cheapfollower.shop` (optional)
4. Vercel will provide DNS records

### Configure DNS (at your domain registrar):

Add these DNS records:

**For root domain (cheapfollower.shop):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Wait 24-48 hours for DNS propagation** (usually faster, 5-30 minutes)

## Step 7: Verify Deployment

1. Visit https://cheapfollower.shop
2. Check that all pages load correctly
3. Test payment flow (use sandbox/test mode first)
4. Verify admin panel access
5. Test API endpoints

## Environment-Specific Settings

### Production
- Set `NOWPAYMENTS_MODE=live`
- Set `PAYPAL_MODE=live`
- Use production API keys

### Development/Preview
- Set `NOWPAYMENTS_MODE=sandbox`
- Set `PAYPAL_MODE=sandbox`
- Use test API keys

## Continuous Deployment

Once connected to GitHub:
- Every push to `main` branch auto-deploys to production
- Pull requests create preview deployments
- Vercel provides preview URLs for testing

## Post-Deployment Checklist

- [ ] SSL certificate is active (automatic with Vercel)
- [ ] Custom domain is working
- [ ] Environment variables are set correctly
- [ ] Admin panel is accessible
- [ ] Payment gateways are working (test mode first)
- [ ] Database connection is working
- [ ] Provider API integration is working
- [ ] Email notifications are working (if configured)

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure Node.js version compatibility (use Node 18+)

### Environment Variables Not Working
- Variables must be set for the correct environment
- Redeploy after adding/changing variables
- Public variables must start with `NEXT_PUBLIC_`

### Domain Not Working
- Verify DNS records are correct
- Wait for DNS propagation (can take up to 48 hours)
- Check SSL certificate status in Vercel

### Database Connection Issues
- Verify Supabase URL and keys
- Check IP allowlist in Supabase (Vercel IPs are allowed by default)

## Support

For Vercel-specific issues:
- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

For Next.js issues:
- Next.js Documentation: https://nextjs.org/docs
