# 🚀 Quick Start: Deploy to Vercel + GitHub

Follow these steps to get cheapfollower.shop live on your domain in under 30 minutes.

## Step 1: Install Git (if not installed)

Download and install: https://git-scm.com/download/win

## Step 2: Run Setup Script

Open PowerShell in this folder and run:

```powershell
.\deploy-setup.ps1
```

This will:
- Initialize Git repository
- Stage all files
- Create initial commit
- Guide you through next steps

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `cheapfollower-shop`
3. Make it **Private**
4. Click "Create repository"

## Step 4: Push to GitHub

Run these commands (replace YOUR_USERNAME):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/cheapfollower-shop.git
git branch -M main
git push -u origin main
```

## Step 5: Deploy to Vercel

1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Click "Import" next to your repository
4. Vercel auto-detects Next.js ✓
5. Click "Deploy"

## Step 6: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

### Required:
```
NEXT_PUBLIC_SITE_URL=https://cheapfollower.shop
NOWPAYMENTS_API_KEY=your_key_here
NOWPAYMENTS_IPN_SECRET=your_secret_here
NOWPAYMENTS_MODE=live
GODOFPANEL_API_KEY=your_key_here
ADMIN_SECRET_KEY=random_32_char_string
```

### Optional (if using):
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
```

**Important:** After adding variables, click "Redeploy" in Vercel!

## Step 7: Configure Domain

In Vercel → Settings → Domains:

1. Add domain: `cheapfollower.shop`
2. Vercel shows DNS records
3. Add these to your domain registrar:

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME (for www):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Wait 5-30 minutes for DNS to propagate.

## Step 8: Test Your Site

Visit https://cheapfollower.shop and verify:

- ✅ Homepage loads
- ✅ Can create an account
- ✅ Can place a test order
- ✅ Payment flow works
- ✅ Admin panel accessible

## 🎉 You're Live!

Your SMM panel is now live and ready for customers.

---

## 📚 Additional Resources

- **Full deployment guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Post-deployment checklist:** [POST_DEPLOYMENT_CHECKLIST.md](./POST_DEPLOYMENT_CHECKLIST.md)
- **API integration:** [API_INTEGRATION.md](./API_INTEGRATION.md)
- **Environment variables:** [.env.production.example](./.env.production.example)

---

## 🆘 Need Help?

**Build failing?** Check Vercel build logs in dashboard

**Domain not working?** Wait 24 hours for DNS propagation

**Payment not working?** Verify API keys in environment variables

**Questions?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting
