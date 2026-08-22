# Database Migrations

This folder contains SQL migration files for the cheapfollower.shop database.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Log into your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Open and run `001_refund_ticket_system.sql`
4. Verify the migration completed successfully

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

## Migration: 001_refund_ticket_system.sql

This migration adds support for the Refund & Ticket System:

### Schema Changes

**Orders Table:**
- Adds `paid` column (boolean, default false)
- Adds `promo_code` column (text, nullable)

**Tickets Table:**
- Adds `order_id` column (text, nullable) - links tickets to orders
- Adds `updated_at` column (timestamptz) - tracks last modification
- Adds `guest_email` column (text, nullable) - supports guest tickets

### Indexes Added

Performance indexes for:
- Order lookups by status, user_id, and public_id
- Ticket lookups by user_id, status, public_id, and order_id
- Ticket message lookups by ticket_id and created_at
- Transaction lookups by user_id, type, and created_at

### Row-Level Security (RLS) Policies

**Tickets:**
- `users_own_tickets` - Users can see their own tickets
- `admins_all_tickets` - Admins can see and manage all tickets
- `users_create_tickets` - Users can create tickets (including guest tickets)
- `users_update_own_tickets` - Users can update their own ticket status

**Ticket Messages:**
- `users_read_own_ticket_messages` - Users can read messages from their tickets
- `admins_read_all_ticket_messages` - Admins can read all ticket messages
- `users_reply_own_tickets` - Users can reply to their own tickets
- `admins_reply_any_ticket` - Admins can reply to any ticket

### Triggers

- `update_ticket_updated_at` - Automatically updates `tickets.updated_at` when a new message is added
- `update_ticket_timestamp` - Updates `updated_at` when a ticket is directly modified

## Verification

After running the migration, verify the changes:

```sql
-- Check if columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('paid', 'promo_code');

-- Check if tickets columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets' AND column_name IN ('order_id', 'updated_at', 'guest_email');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('orders', 'tickets', 'ticket_messages', 'transactions')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('tickets', 'ticket_messages')
ORDER BY tablename, policyname;
```
