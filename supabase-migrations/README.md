# Supabase Database Migrations

## Required for Vercel Deployment

The admin store cannot use file system storage on Vercel (read-only). Run these migrations in your Supabase SQL editor to set up the database.

## How to Run Migrations

1. Go to your Supabase project: https://supabase.com/dashboard/project/wgududgyrdgrvtlcvkrr
2. Click **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Copy and paste the SQL from each migration file below
5. Click **Run** to execute

## Migration Files (run in order)

### 1. admin_store.sql
**Purpose:** Creates the `admin_store` table to replace file-based storage

**When to run:** Before deploying to Vercel (required)

**What it does:**
- Creates `admin_store` table with JSONB data column
- Inserts default settings and promo codes
- Sets up Row Level Security (RLS) policies

### Future Migrations

Additional migrations for orders, users, wallets, etc. can be added here as needed.

## Verifying Migration Success

After running the migration, verify it worked:

```sql
SELECT * FROM admin_store WHERE id = 'main';
```

You should see a row with default settings and the WELCOME10 promo code.

## Troubleshooting

**Error: "relation already exists"**
- The table already exists, you can skip this migration

**Error: "permission denied"**
- Make sure you're logged in as the project owner in Supabase

**Error: "duplicate key value"**
- The default data already exists, this is safe to ignore
