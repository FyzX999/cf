# Post-Deployment Checklist

After deploying to Vercel, verify everything is working correctly.

## ✅ Immediate Checks (First 5 minutes)

### 1. Site Accessibility
- [ ] Visit https://cheapfollower.shop
- [ ] Verify homepage loads correctly
- [ ] Check that all CSS/styling is working
- [ ] Test responsive design (mobile, tablet, desktop)

### 2. Basic Pages
- [ ] `/services` - Service listings load
- [ ] `/platforms` - Platform pages work
- [ ] `/pricing` - Pricing calculator works
- [ ] `/track` - Track order page loads

### 3. SSL & Security
- [ ] HTTPS is active (green padlock in browser)
- [ ] No mixed content warnings
- [ ] Check SSL certificate validity

## ✅ Authentication & User Flow (10 minutes)

### 4. User Registration
- [ ] Sign up form works
- [ ] Email verification (if enabled)
- [ ] Can log in after signup

### 5. User Dashboard
- [ ] `/dashboard` - Dashboard loads
- [ ] `/dashboard/orders` - Orders page accessible
- [ ] `/dashboard/wallet` - Wallet page works
- [ ] `/dashboard/api` - API key generation works

## ✅ Core Functionality (15 minutes)

### 6. Order Creation
- [ ] Can create a new order (test mode first!)
- [ ] Service selection works
- [ ] Quantity slider/input works
- [ ] Link validation works
- [ ] Delivery mode selection works

### 7. Payment Flow - Crypto
- [ ] "Pay with crypto" button works
- [ ] Redirects to NowPayments correctly
- [ ] Test payment completes (use minimum amount)
- [ ] Order status updates after payment
- [ ] Webhook receives IPN correctly

### 8. Payment Flow - Wallet
- [ ] Can add funds to wallet (test amount)
- [ ] Wallet balance displays in navbar
- [ ] "Pay with wallet" requires confirmation
- [ ] Order processes after wallet payment
- [ ] Wallet balance deducted correctly

### 9. Order Processing
- [ ] Order status shows correctly
- [ ] Progress updates work
- [ ] Order details display properly
- [ ] Track page works with order ID

## ✅ Admin Panel (10 minutes)

### 10. Admin Access
- [ ] `/admin/login` - Can access admin panel
- [ ] Admin credentials work
- [ ] Admin dashboard loads

### 11. Admin Functions
- [ ] `/admin/services` - Can view/edit services
- [ ] `/admin/orders` - Can view orders
- [ ] `/admin/settings` - Settings save correctly
- [ ] `/admin/commerce` - Can create promo codes
- [ ] `/admin/audit` - Audit log works

## ✅ API Integration (10 minutes)

### 12. V2 API
- [ ] API endpoint responds: `GET /api/v2?action=services&key=YOUR_KEY`
- [ ] API authentication works
- [ ] Can create order via API
- [ ] API orders deduct from wallet
- [ ] API order status updates correctly

### 13. Provider Integration
- [ ] GodofPanel API connection works
- [ ] Services fetch from provider (if auto-sync enabled)
- [ ] Orders submit to provider
- [ ] Provider order status updates sync back

## ✅ Advanced Features (15 minutes)

### 14. Promo Codes
- [ ] Create a test promo code
- [ ] Apply promo code to order
- [ ] Discount calculates correctly
- [ ] Promo code usage limits work

### 15. Gift Cards
- [ ] Create a test gift card
- [ ] Redeem gift card in wallet
- [ ] Gift card applies to order payment
- [ ] Partial gift card redemption works

### 16. Support System
- [ ] `/support` - Can create support ticket
- [ ] Admin can view tickets
- [ ] Can reply to tickets
- [ ] Email notifications work (if configured)

## ✅ Performance & Monitoring (5 minutes)

### 17. Performance
- [ ] Page load times are acceptable (<3s)
- [ ] Images load properly
- [ ] No console errors in browser
- [ ] Check Vercel Analytics (if enabled)

### 18. Error Handling
- [ ] 404 page shows for invalid routes
- [ ] Error boundaries catch React errors
- [ ] API errors show user-friendly messages

## ✅ Database & Data (5 minutes)

### 19. Database (if using Supabase)
- [ ] Orders are saving to database
- [ ] User profiles are created
- [ ] Wallet transactions log correctly
- [ ] Database queries are working

### 20. File Storage
- [ ] Admin store file (`data/admin-store.json`) is persisted
- [ ] Settings changes persist across deployments

## 🔧 If Something Fails

### Common Issues

**Site won't load:**
- Check DNS settings (may take 24-48 hours)
- Verify SSL certificate in Vercel
- Check build logs in Vercel dashboard

**Environment variables not working:**
- Redeploy after adding environment variables
- Check variable names (typos?)
- Ensure public variables have `NEXT_PUBLIC_` prefix

**Payment not working:**
- Verify API keys are correct (production, not test)
- Check webhook URLs are correct
- Look at Vercel function logs for errors
- Test with minimum payment amount first

**Database connection fails:**
- Verify Supabase URL and keys
- Check Supabase project is active
- Verify SQL schema is applied

**Provider API not working:**
- Check GODOFPANEL_API_KEY is correct
- Verify API URL is correct
- Check provider service mappings
- Look at function logs for API errors

### Getting Help

1. **Check Vercel logs:**
   - Vercel Dashboard → Your Project → Deployments → [Latest] → Functions
   
2. **Check browser console:**
   - Open DevTools (F12) → Console tab
   - Look for errors in red

3. **Check Supabase logs:**
   - Supabase Dashboard → Logs

4. **Contact Support:**
   - Vercel: https://vercel.com/support
   - NowPayments: support@nowpayments.io
   - GodofPanel: Check their support channels

## 📊 Production Monitoring

After deployment, monitor:

- **Vercel Analytics** - Page views, performance
- **Error tracking** - Check Vercel function logs daily
- **Payment webhooks** - Monitor IPN success rate
- **Database usage** - Check Supabase dashboard
- **API usage** - Monitor provider API calls

## 🎉 Launch Checklist

Before announcing your site:

- [ ] All tests above passed
- [ ] Test orders completed successfully
- [ ] Real payment processed correctly (small amount)
- [ ] Admin panel secured
- [ ] Terms of service posted
- [ ] Privacy policy posted
- [ ] Contact information visible
- [ ] Support email working
- [ ] Social media links (if any) correct
- [ ] Analytics/tracking set up (optional)

---

## Quick Fix Commands

### Force rebuild/redeploy:
```bash
# In Vercel Dashboard
Settings → General → Redeploy

# Or via CLI
vercel --prod
```

### Fix stuck orders:
```bash
curl -X POST https://cheapfollower.shop/api/admin/fix-orders \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"your_admin_secret_key"}'
```

### Clear Next.js cache:
In Vercel Dashboard: Deployments → [Latest] → ... → Redeploy

---

**Remember:** Start with small test transactions before processing large amounts!
