-- cheapfollower.shop schema
-- Run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'reseller', 'admin');
create type public.order_status as enum (
  'pending', 'processing', 'in_progress', 'delivering',
  'completed', 'partial', 'canceled', 'refunded', 'refilling'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.user_role not null default 'customer',
  balance numeric(12,2) not null default 0,
  spending_limit numeric(12,2),
  api_key text unique,
  created_at timestamptz not null default now(),
  last_login timestamptz
);

create table if not exists public.services (
  id text primary key,
  platform text not null,
  slug text not null unique,
  name text not null,
  category text not null,
  quality text not null,
  rate_per_thousand numeric(12,4) not null,
  cost_per_thousand numeric(12,4) not null,
  markup_multiplier numeric(8,4) not null default 1.8,
  price_mode text not null default 'multiplier',
  min_qty int not null,
  max_qty int not null,
  refill boolean not null default false,
  refill_days int not null default 0,
  visible boolean not null default true,
  active boolean not null default true,
  provider_service_id int,
  description text
);

create table if not exists public.site_settings (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid references public.profiles(id),
  service_id text,
  service_name text not null,
  platform text not null,
  quantity int not null,
  delivered int not null default 0,
  status public.order_status not null default 'pending',
  link text not null,
  total numeric(12,2) not null,
  delivery text not null default 'standard',
  provider_order_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid references public.profiles(id),
  type text not null,
  method text,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.refills (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  order_id uuid references public.orders(id) on delete cascade,
  provider_refill_id bigint,
  status text not null default 'processing',
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid references public.profiles(id),
  category text not null,
  subject text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  author_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.refills enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

create policy "own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "guest track by public id" on public.orders
  for select using (true);

create policy "own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "own tickets" on public.tickets
  for select using (auth.uid() = user_id);

-- Tighten guest order reads after launch: replace the open select with a
-- tracking RPC that accepts public_id only.
