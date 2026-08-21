# API Integration Notes

## Service Provider Integration

### How Services Work with API Keys

When orders are placed via the V2 API endpoint (`/api/v2`), they work as follows:

1. **User pays with wallet** - The API deducts from the user's wallet balance via `debitWallet()`
2. **Order is created** - The order is created in the database with `paid: true`
3. **Provider submission** - The order is submitted to the fulfillment provider (e.g., GodofPanel) via `attachProvider()`
4. **No API credit usage** - The system uses the provider's API directly without consuming user API credits

### New Follower Tiers

The new follower service tiers added:

- **Followers [Standard]** - Rate: $0.85/1k, Max: 500,000
- **Followers [Premium HQ]** - Rate: $2.45/1k, Max: 100,000 (Higher quality)
- **Followers [Real Active]** - Rate: $4.85/1k, Max: 50,000 (Most expensive, active accounts)
- **Followers [Max 1M]** - Rate: $0.68/1k, Max: 1,000,000 (Bulk orders)
- **Followers [Instant]** - Rate: $1.95/1k, Max: 250,000 (Fast delivery)

### Provider Mapping

To make these services work with the API key without using credits:

1. **Set provider service IDs** in the admin panel (`/admin/services`)
2. **Map to GodofPanel services** via `GODOFPANEL_SERVICE_MAP` environment variable
3. **Orders auto-submit** to the provider when paid

Example mapping:
```env
GODOFPANEL_SERVICE_MAP=101:12345,102:12346,103:12347
```

Where:
- `101` = Service ID in cheapfollower.shop
- `12345` = Service ID in GodofPanel

### Credit-Free Operation

The API key system works as follows:

- **User API key** - Generated per user in `/dashboard/api`
- **Wallet balance** - User adds funds to wallet via crypto
- **API orders** - Deduct from wallet, not from "API credits"
- **Provider fulfillment** - Uses store's provider API key (GodofPanel), not user's credits

This means users can place unlimited API orders as long as they have wallet balance.

## Fixing Stuck Orders

If orders get stuck in "Awaiting payment" status due to database update failures:

```bash
POST /api/admin/fix-orders
{
  "adminKey": "your_admin_secret_key"
}
```

This endpoint:
- Finds orders older than 10 minutes still in "pending" status
- Identifies small orders (<$0.50) likely paid via wallet
- Updates them to `paid: true` and `status: processing`

Set `ADMIN_SECRET_KEY` environment variable for authentication.
