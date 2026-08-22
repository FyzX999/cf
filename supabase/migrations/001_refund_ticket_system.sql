-- Migration: Refund & Ticket System
-- Adds necessary columns and indexes for refund processing and ticket management

-- Add missing columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_code text;

-- Add missing columns to tickets table if needed
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS order_id text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS guest_email text;

-- Create indexes for performance

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_public_id ON public.orders(public_id);

-- Tickets table indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_public_id ON public.tickets(public_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets(order_id);

-- Ticket messages table indexes
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- Row-Level Security policies for tickets

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "own tickets" ON public.tickets;
DROP POLICY IF EXISTS "admins_all_tickets" ON public.tickets;

-- Users can see their own tickets
CREATE POLICY "users_own_tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all tickets
CREATE POLICY "admins_all_tickets" ON public.tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create tickets (either with user_id or as guest with null user_id)
CREATE POLICY "users_create_tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own tickets (for status changes)
CREATE POLICY "users_update_own_tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- Row-Level Security policies for ticket_messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "own_ticket_messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "admins_all_ticket_messages" ON public.ticket_messages;

-- Users can read messages from their own tickets
CREATE POLICY "users_read_own_ticket_messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.user_id = auth.uid()
    )
  );

-- Admins can read all ticket messages
CREATE POLICY "admins_read_all_ticket_messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can reply to their own tickets
CREATE POLICY "users_reply_own_tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.user_id = auth.uid()
    )
  );

-- Admins can reply to any ticket
CREATE POLICY "admins_reply_any_ticket" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update tickets.updated_at when ticket_messages are added
CREATE TRIGGER update_ticket_updated_at
AFTER INSERT ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to tickets table for direct updates
CREATE TRIGGER update_ticket_timestamp
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
