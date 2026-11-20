-- Run once in the Supabase SQL editor on the live database.
-- Splits the single "Umbrella Kubo" into 4 kubos at the same price (PHP 150).
-- The existing row is renamed (not replaced) so old bookings keep pointing to it.
update public.units set slug = 'umbrella-kubo-1', name = 'Umbrella Kubo 1', sort_order = 80
where slug = 'umbrella-kubo';

insert into public.units (slug, name, type, capacity_min, capacity_max, aircon, has_own_cr, price_amount, price_note, description, active, sort_order)
select 'umbrella-kubo-' || n, 'Umbrella Kubo ' || n, 'kubo', null, null, false, false,
       coalesce((select price_amount from public.units where slug = 'umbrella-kubo-1'), 150), null, '{}'::jsonb, true, 79 + n
from generate_series(2, 4) as n
on conflict (slug) do nothing;