-- Adds an itemized price snapshot to each booking so receipts keep showing what was charged,
-- even if cottage, room, or package prices are changed later.
-- Run this once in Supabase SQL Editor. It is safe to run again.
alter table public.bookings add column if not exists line_items jsonb;
