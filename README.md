# cheapfollower.shop

Dark SaaS marketplace for social media services. Next.js + Tailwind, Supabase-ready, GodofPanel (PerfectPanel v2) provider client.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Connect later

1. Copy `.env.example` to `.env.local`
2. Paste Supabase URL + keys
3. Run `supabase/schema.sql` in the SQL editor
4. Paste your GodofPanel API key (`GODOFPANEL_API_KEY`)
5. Map retail services, prices, and profit multipliers in `/admin/services`
6. Tune site-wide settings in `/admin/settings`

Admin pricing is saved to `data/admin-store.json` so checkout, service pages, and the reseller API all use the same live rates. Each service can use a profit multiplier (retail = cost × multiplier) or a fixed per-1K price.

Without keys the storefront, guest checkout, tracking, dashboards, and reseller/admin UIs still run on catalog + the admin store.

## Payment Methods

### Crypto Payments (NowPayments)
Configure crypto payments (BTC, ETH, USDT, etc.) via NowPayments API. See `.env.example` for required variables.

### CashApp Payments
Accept CashApp payments with automatic email verification. Customers send payments with order ID in the note, system monitors email for receipts and auto-verifies.

**Setup:** See [CASHAPP_SETUP.md](./CASHAPP_SETUP.md) for complete configuration guide.

**Requirements:**
- CashApp tag (e.g., $yourtag)
- Email with CashApp receipts
- IMAP access enabled

**Environment variables:**
```bash
CASHAPP_TAG=$yourtag
CASHAPP_EMAIL=your-email@gmail.com
CASHAPP_EMAIL_PASSWORD=your-app-password
CASHAPP_IMAP_HOST=imap.gmail.com
CASHAPP_IMAP_PORT=993
```

### PayPal (Optional)
PayPal REST API integration available but currently disabled. See `.env.example` for setup.
