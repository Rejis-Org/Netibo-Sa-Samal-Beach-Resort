-- DESTRUCTIVE: This removes every Netibo app table, row, function, policy,
-- and uploaded object in the payment-proofs bucket. Back up first.
-- It does not remove Supabase Auth users, project settings, or unrelated objects.
begin;

drop policy if exists "admins read payment proofs" on storage.objects;
drop policy if exists "admins manage payment proofs" on storage.objects;
delete from storage.objects where bucket_id = 'payment-proofs';
delete from storage.buckets where id = 'payment-proofs';

drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.payments cascade;
drop table if exists public.bookings cascade;
drop table if exists public.blocked_dates cascade;
drop table if exists public.packages cascade;
drop table if exists public.units cascade;
drop table if exists public.settings cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.user_roles cascade;

drop function if exists public.get_public_availability(date, date);
drop function if exists public.guard_booking_availability();
drop function if exists public.touch_updated_at();
drop function if exists public.is_admin();
drop function if exists public.is_owner();

commit;