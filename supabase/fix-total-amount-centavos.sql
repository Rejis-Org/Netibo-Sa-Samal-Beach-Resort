-- Safe to run more than once.
-- The app calculates totals with centavos (corkage, manual totals, extensions), so the column cannot be integer.
alter table public.bookings alter column total_amount type numeric(12, 2);
