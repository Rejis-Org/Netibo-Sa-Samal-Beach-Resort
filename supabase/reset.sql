-- DESTRUCTIVE: This removes every Netibo app table, row, function, policy,
-- Realtime entries, and uploaded objects in the payment-proofs and unit-photos buckets. Back up first.
-- It does not remove Supabase Auth users, project settings, or unrelated objects.
begin;

drop policy if exists "admins read payment proofs" on storage.objects;
drop policy if exists "admins manage payment proofs" on storage.objects;
drop policy if exists "admins manage unit photos" on storage.objects;
delete from storage.objects where bucket_id = 'payment-proofs';
delete from storage.buckets where id = 'payment-proofs';
delete from storage.objects where bucket_id = 'unit-photos';
delete from storage.buckets where id = 'unit-photos';

do $$
declare
  relation record;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    for relation in
      select quote_ident(n.nspname) || '.' || quote_ident(c.relname) as qualified_name
      from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname in ('messages', 'conversations', 'bookings')
    loop
      execute 'alter publication supabase_realtime drop table ' || relation.qualified_name;
    end loop;
  end if;
end $$;

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
drop function if exists public.mark_messages_read(uuid);
drop function if exists public.get_or_create_guest_conversation(text, text);
drop function if exists public.add_booking_to_guest_chat();
drop function if exists public.expire_unpaid_holds();
drop function if exists public.touch_conversation();
drop function if exists public.guard_booking_availability();
drop function if exists public.touch_updated_at();
drop function if exists public.is_admin();
drop function if exists public.is_owner();

commit;
