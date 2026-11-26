-- Netibo sa Samal app schema. Run this whole file once in Supabase SQL Editor.
-- Prices are stored as whole PHP pesos. Unknown prices remain NULL and clearly marked.
-- Guest chat and booking ownership use Supabase anonymous Auth; enable anonymous sign-ins before activating those flows.
-- Keep normal public email/password sign-ups disabled. Admin accounts are assigned owner/staff in user_roles.
begin;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- If an earlier patch collapsed owner/staff to admin, conservatively restore admin rows as staff.
-- Reassign the owner by email using the README SQL after running this file.
alter table public.user_roles drop constraint if exists user_roles_role_check;
update public.user_roles set role = 'staff' where role = 'admin';
alter table public.user_roles add constraint user_roles_role_check check (role in ('owner', 'staff'));

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null check (type in ('cottage', 'room', 'hall', 'kubo')),
  capacity_min integer check (capacity_min is null or capacity_min >= 0),
  capacity_max integer check (capacity_max is null or capacity_max >= 0),
  aircon boolean not null default false,
  has_own_cr boolean not null default false,
  price_amount integer check (price_amount is null or price_amount >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  price_note text,
  description jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (capacity_min is null or capacity_max is null or capacity_min <= capacity_max)
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  scope text not null check (scope in ('exclusive', 'walk-in')),
  price_amount integer check (price_amount is null or price_amount >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  pax_included integer check (pax_included is null or pax_included >= 0),
  weekday_only boolean not null default false,
  weekend_only boolean not null default false,
  notes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (weekday_only and weekend_only))
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique,
  type text not null check (type in ('exclusive', 'unit', 'entrance')),
  package_id uuid references public.packages(id) on delete set null,
  unit_ids uuid[] not null default '{}',
  date_start date not null,
  date_end date not null,
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  guest_name text not null,
  phone text not null,
  guest_email text,
  contact_extra text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'awaiting_payment', 'confirmed', 'cancelled', 'completed')),
  total_amount integer not null default 0 check (total_amount >= 0),
  deposit_required integer check (deposit_required is null or deposit_required >= 0),
  payment_deadline timestamptz,
  hold_expires_at timestamptz,
  access_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') check (length(access_token) >= 32),
  guest_uid uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_end >= date_start),
  check (length(trim(guest_name)) between 1 and 160),
  check (length(trim(phone)) between 7 and 40)
);

-- Approved exclusive dates are held while awaiting payment, then remain blocked when confirmed.
alter table public.bookings drop constraint if exists bookings_exclusive_dates_no_overlap;
alter table public.bookings add constraint bookings_exclusive_dates_no_overlap
  exclude using gist (daterange(date_start, date_end, '[]') with &&)
  where (type = 'exclusive' and status in ('awaiting_payment', 'confirmed'));

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  method text not null default 'gcash' check (method in ('gcash', 'bank_transfer', 'other')),
  reference_no text,
  proof_path text,
  amount integer not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (reference_no is null or length(reference_no) <= 120)
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text not null default 'closed',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') check (length(visitor_token) >= 32),
  guest_uid uuid references auth.users(id) on delete set null default auth.uid(),
  guest_name text,
  contact text,
  booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('guest', 'owner')),
  message_type text not null default 'text' check (message_type in ('text', 'booking')),
  booking_id uuid references public.bookings(id) on delete set null,
  booking_details jsonb,
  body text not null check (length(trim(body)) between 1 and 3000),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages add column if not exists booking_id uuid references public.bookings(id) on delete set null;
alter table public.messages add column if not exists booking_details jsonb;
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check check (message_type in ('text', 'booking'));
create unique index if not exists messages_one_booking_event on public.messages (booking_id) where booking_id is not null;

-- Keep message labels aligned with the owner/staff admin roles.
alter table public.messages drop constraint if exists messages_sender_check;
update public.messages set sender = 'owner' where sender = 'admin';
alter table public.messages add constraint messages_sender_check check (sender in ('guest', 'owner'));

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Keep guests tied to their hidden anonymous Auth user; admin accounts remain owner/staff.
alter table public.bookings add column if not exists guest_uid uuid references auth.users(id) on delete set null default auth.uid();
alter table public.conversations add column if not exists guest_uid uuid references auth.users(id) on delete set null default auth.uid();
create unique index if not exists conversations_one_per_guest on public.conversations (guest_uid) where guest_uid is not null;
alter table public.bookings alter column access_token set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.conversations alter column visitor_token set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

create index if not exists bookings_dates_status_idx on public.bookings (date_start, date_end, status);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists payments_booking_created_idx on public.payments (booking_id, created_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index if not exists conversations_last_message_idx on public.conversations (last_message_at desc);
create index if not exists conversations_guest_uid_idx on public.conversations (guest_uid);
create index if not exists bookings_guest_uid_idx on public.bookings (guest_uid);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('owner', 'staff')
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'owner'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_booking_availability()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('cancelled', 'completed') then
    return new;
  end if;

  -- Serialize booking writes so simultaneous requests cannot claim the same unit/date.
  perform pg_advisory_xact_lock(hashtext('netibo_bookings'));

  if exists (
    select 1 from public.blocked_dates d
    where d.date between new.date_start and new.date_end
  ) then
    raise exception 'One or more selected dates are closed.' using errcode = '23P01';
  end if;

  if new.type <> 'exclusive' and exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.type = 'exclusive'
      and b.status in ('awaiting_payment', 'confirmed')
      and (b.hold_expires_at is null or b.hold_expires_at > now())
      and daterange(b.date_start, b.date_end, '[]') && daterange(new.date_start, new.date_end, '[]')
  ) then
    raise exception 'An exclusive event already holds one or more selected dates.' using errcode = '23P01';
  end if;

  if new.type = 'exclusive' and new.status in ('awaiting_payment', 'confirmed') and exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.type <> 'exclusive'
      and b.status in ('awaiting_payment', 'confirmed')
      and (b.status = 'confirmed' or b.hold_expires_at is null or b.hold_expires_at > now())
      and daterange(b.date_start, b.date_end, '[]') && daterange(new.date_start, new.date_end, '[]')
  ) then
    raise exception 'Other bookings already hold one or more of these dates.' using errcode = '23P01';
  end if;

  if cardinality(new.unit_ids) > 0 and new.status in ('awaiting_payment', 'confirmed') and exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.unit_ids && new.unit_ids
      and b.status in ('awaiting_payment', 'confirmed')
      and (b.status = 'confirmed' or b.hold_expires_at is null or b.hold_expires_at > now())
      and daterange(b.date_start, b.date_end, '[]') && daterange(new.date_start, new.date_end, '[]')
  ) then
    raise exception 'That cottage or room is already booked for these dates.' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists units_touch_updated_at on public.units;
create trigger units_touch_updated_at before update on public.units for each row execute function public.touch_updated_at();
drop trigger if exists packages_touch_updated_at on public.packages;
create trigger packages_touch_updated_at before update on public.packages for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at before update on public.settings for each row execute function public.touch_updated_at();
drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at before update on public.bookings for each row execute function public.touch_updated_at();
drop trigger if exists bookings_guard_availability on public.bookings;
create trigger bookings_guard_availability before insert or update of type, status, date_start, date_end, unit_ids on public.bookings for each row execute function public.guard_booking_availability();

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function public.touch_conversation() from public;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

create or replace function public.mark_messages_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() then
    update public.messages set read_at = now()
    where conversation_id = p_conversation_id and sender = 'guest' and read_at is null;
  elsif exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.guest_uid = (select auth.uid())
  ) then
    update public.messages set read_at = now()
    where conversation_id = p_conversation_id and sender = 'owner' and read_at is null;
  end if;
end;
$$;

create or replace function public.get_or_create_guest_conversation(p_guest_name text default null, p_contact text default null)
returns setof public.conversations
language plpgsql security definer set search_path = '' as $$
declare
  guest_id uuid := auth.uid();
  guest_name_value text := nullif(left(trim(coalesce(p_guest_name, '')), 160), '');
  contact_value text := nullif(left(trim(coalesce(p_contact, '')), 120), '');
  result public.conversations;
begin
  if guest_id is null then
    raise exception 'Sign in anonymously before starting a chat.';
  end if;

  insert into public.conversations (guest_uid, guest_name, contact)
  values (guest_id, guest_name_value, contact_value)
  on conflict (guest_uid) where guest_uid is not null
  do update set
    guest_name = coalesce(excluded.guest_name, conversations.guest_name),
    contact = coalesce(excluded.contact, conversations.contact)
  returning * into result;

  return next result;
end;
$$;

create or replace function public.add_booking_to_guest_chat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  conversation_id uuid;
  package_name text;
  unit_names text;
begin
  if new.guest_uid is null then
    return new;
  end if;

  if new.package_id is not null then
    select p.name ->> 'en' into package_name
    from public.packages p
    where p.id = new.package_id;
  end if;

  if cardinality(new.unit_ids) > 0 then
    select string_agg(u.name, ', ' order by u.name) into unit_names
    from public.units u
    where u.id = any(new.unit_ids);
  end if;

  insert into public.conversations (guest_uid, guest_name, contact, booking_id)
  values (new.guest_uid, new.guest_name, new.phone, new.id)
  on conflict (guest_uid) where guest_uid is not null
  do update set
    guest_name = excluded.guest_name,
    contact = excluded.contact,
    booking_id = excluded.booking_id,
    status = 'open'
  returning id into conversation_id;

  insert into public.messages (conversation_id, sender, message_type, booking_id, booking_details, body)
  values (
    conversation_id,
    'guest',
    'booking',
    new.id,
    jsonb_build_object(
      'ref_code', new.ref_code,
      'guest_name', new.guest_name,
      'phone', new.phone,
      'guest_email', new.guest_email,
      'type', new.type,
      'date_start', new.date_start,
      'date_end', new.date_end,
      'adults', new.adults,
      'children', new.children,
      'total_amount', new.total_amount,
      'package_name', package_name,
      'unit_names', unit_names,
      'notes', new.notes
    ),
    'Booking request ' || new.ref_code
  );

  return new;
end;
$$;
revoke all on function public.add_booking_to_guest_chat() from public, anon, authenticated;

drop trigger if exists bookings_add_to_guest_chat on public.bookings;
create trigger bookings_add_to_guest_chat after insert on public.bookings
  for each row execute function public.add_booking_to_guest_chat();

create or replace function public.expire_unpaid_holds()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  update public.bookings set status = 'cancelled'
  where status = 'awaiting_payment' and hold_expires_at is not null and hold_expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

drop function if exists public.get_public_availability(date, date);
create function public.get_public_availability(from_date date, through_date date)
returns table (day date, state text)
language sql stable security definer set search_path = '' as $$
  -- Pending requests are omitted: they do not reserve dates and expose no guest activity.
  select dates.day, (array_agg(dates.state order by dates.priority desc))[1]
  from (
    select d.date as day, 'closed'::text as state, 4 as priority
    from public.blocked_dates d
    where d.date between from_date and through_date
    union all
    select series.day::date, 'exclusive'::text, 3
    from public.bookings b
    cross join lateral generate_series(b.date_start::timestamp, b.date_end::timestamp, interval '1 day') as series(day)
    where b.type = 'exclusive'
      and b.status in ('awaiting_payment', 'confirmed')
      and (b.status = 'confirmed' or b.hold_expires_at is null or b.hold_expires_at > now())
      and series.day::date between from_date and through_date
    union all
    select series.day::date, 'partial'::text, 2
    from public.bookings b
    cross join lateral generate_series(b.date_start::timestamp, b.date_end::timestamp, interval '1 day') as series(day)
    where b.type <> 'exclusive'
      and b.status in ('awaiting_payment', 'confirmed')
      and (b.status = 'confirmed' or b.hold_expires_at is null or b.hold_expires_at > now())
      and series.day::date between from_date and through_date
  ) as dates
  group by dates.day;
$$;

alter table public.user_roles enable row level security;
alter table public.settings enable row level security;
alter table public.units enable row level security;
alter table public.packages enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "roles read self or admin" on public.user_roles;
create policy "roles read self or admin" on public.user_roles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "owner manages roles" on public.user_roles;
create policy "owner manages roles" on public.user_roles for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

drop policy if exists "active units are public" on public.units;
create policy "active units are public" on public.units for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "admins manage units" on public.units;
create policy "admins manage units" on public.units for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "active packages are public" on public.packages;
create policy "active packages are public" on public.packages for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "admins manage packages" on public.packages;
create policy "admins manage packages" on public.packages for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "owner manages settings" on public.settings;
create policy "owner manages settings" on public.settings for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy if exists "public reads resort phone" on public.settings;
drop policy if exists "public settings are readable" on public.settings;
create policy "public settings are readable" on public.settings for select to anon, authenticated using (
  key in ('contact_phone', 'reply_time_hours', 'day_tour_start', 'overnight_start', 'arrival_directions', 'extra_guest_fee', 'corkage_presets')
);
drop policy if exists "admins manage bookings" on public.bookings;
create policy "admins manage bookings" on public.bookings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins manage payments" on public.payments;
create policy "admins manage payments" on public.payments for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins manage blocked dates" on public.blocked_dates;
create policy "admins manage blocked dates" on public.blocked_dates for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins manage conversations" on public.conversations;
create policy "admins manage conversations" on public.conversations for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "guests read own conversations" on public.conversations;
create policy "guests read own conversations" on public.conversations for select to authenticated using (guest_uid = (select auth.uid()));
drop policy if exists "guests start conversations" on public.conversations;
create policy "guests start conversations" on public.conversations for insert to authenticated with check (
  guest_uid = (select auth.uid())
  and status = 'open'
  and (
    booking_id is null
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.guest_uid = (select auth.uid())
    )
  )
);
drop policy if exists "admins manage messages" on public.messages;
create policy "admins manage messages" on public.messages for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "guests read own messages" on public.messages;
create policy "guests read own messages" on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.guest_uid = (select auth.uid())
  )
);
drop policy if exists "guests send messages" on public.messages;
create policy "guests send messages" on public.messages for insert to authenticated with check (
  sender = 'guest'
  and message_type = 'text'
  and booking_id is null
  and booking_details is null
  and delivered_at is null
  and read_at is null
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.guest_uid = (select auth.uid())
  )
);
drop policy if exists "guests read own bookings" on public.bookings;
create policy "guests read own bookings" on public.bookings for select to authenticated using (guest_uid = (select auth.uid()));
drop policy if exists "admins read audit log" on public.audit_log;
create policy "admins read audit log" on public.audit_log for select to authenticated using ((select public.is_admin()));
drop policy if exists "admins add audit log" on public.audit_log;
create policy "admins add audit log" on public.audit_log for insert to authenticated with check ((select public.is_admin()));

grant select on public.units, public.packages to anon, authenticated;
grant select on public.settings to anon;
grant select, insert, update, delete on public.user_roles, public.settings, public.units, public.packages, public.bookings, public.payments, public.blocked_dates, public.conversations, public.messages, public.audit_log to authenticated;
revoke all on function public.get_public_availability(date, date) from public;
grant execute on function public.get_public_availability(date, date) to anon, authenticated;
revoke all on function public.mark_messages_read(uuid) from public;
grant execute on function public.mark_messages_read(uuid) to authenticated;
revoke all on function public.get_or_create_guest_conversation(text, text) from public;
grant execute on function public.get_or_create_guest_conversation(text, text) to authenticated;
revoke all on function public.expire_unpaid_holds() from public;
grant execute on function public.expire_unpaid_holds() to service_role;
revoke all on function public.is_admin() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_admin(), public.is_owner() to anon, authenticated;

-- Enable live chat and admin booking updates when the standard Supabase Realtime publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.conversations;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.bookings;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

insert into public.settings (key, value) values
  ('contact_phone', '"0927 485 2412"'::jsonb),
  ('gcash_number', 'null'::jsonb),
  ('gcash_account_name', 'null'::jsonb),
  ('deposit_amount', 'null'::jsonb),
  ('deposit_percent', 'null'::jsonb),
  ('payment_deadline_hours', 'null'::jsonb),
  ('extra_guest_fee', 'null'::jsonb),
  ('reply_time_hours', 'null'::jsonb),
  ('day_tour_start', '"08:00"'::jsonb),
  ('overnight_start', '"16:00"'::jsonb),
  ('cancellation_refund_policy', 'null'::jsonb),
  ('arrival_directions', 'null'::jsonb)
on conflict (key) do nothing;

-- TODO: Have a native speaker review all machine-drafted fil/ceb labels before launch.
insert into public.packages (slug, name, scope, price_amount, pax_included, weekday_only, weekend_only, notes, sort_order) values
  ('exclusive-weekdays', '{"en":"Exclusive Weekdays","fil":"Eksklusibo tuwing weekday","ceb":"Eksklusibo sa weekday"}', 'exclusive', 10000, 20, true, false, '{"en":"Whole resort for up to 20 guests. Extra guest fee: TODO amount.","todo":"Confirm inclusions and extra guest fee."}', 10),
  ('exclusive-weekends', '{"en":"Exclusive Weekends","fil":"Eksklusibo tuwing weekend","ceb":"Eksklusibo sa weekend"}', 'exclusive', 12000, 20, false, true, '{"en":"Whole resort for up to 20 guests. Extra guest fee: TODO amount.","todo":"Confirm inclusions and extra guest fee."}', 20),
  ('exclusive-six-aircon-rooms', '{"en":"Exclusive with 6 aircon rooms","fil":"Eksklusibo na may 6 aircon room","ceb":"Eksklusibo nga adunay 6 ka aircon room"}', 'exclusive', 13000, 20, false, false, '{"en":"Includes 6 aircon rooms and free entrance for 20 guests. The ad lists Rooms 1 to 3; TODO: confirm the other rooms.","todo":"Confirm extra guest fee and full package inclusions."}', 30),
  ('day-tour-adult', '{"en":"Day tour entrance | adult","fil":"Day tour entrance | adult","ceb":"Day tour entrance | adult"}', 'walk-in', 65, null, false, false, '{"en":"Per adult head."}', 40),
  ('overnight-adult', '{"en":"Overnight entrance | adult","fil":"Overnight entrance | adult","ceb":"Overnight entrance | adult"}', 'walk-in', 85, null, false, false, '{"en":"Per adult head."}', 50),
  ('day-tour-child-5-10', '{"en":"Day tour entrance | child age 5 to 10","fil":"Day tour entrance | batang 5 hanggang 10 taong gulang","ceb":"Day tour entrance | bata nga 5 hangtod 10 anyos"}', 'walk-in', 30, null, false, false, '{"en":"Per child age 5 to 10."}', 60),
  ('overnight-child-5-10', '{"en":"Overnight entrance | child age 5 to 10","fil":"Overnight entrance | batang 5 hanggang 10 taong gulang","ceb":"Overnight entrance | bata nga 5 hangtod 10 anyos"}', 'walk-in', 50, null, false, false, '{"en":"Per child age 5 to 10."}', 70)
on conflict (slug) do nothing;

insert into public.units (slug, name, type, capacity_min, capacity_max, aircon, has_own_cr, price_amount, price_note, description, active, sort_order) values
  ('casa-liam', 'Casa Liam', 'cottage', 6, 8, false, false, 2500, null, '{"en":"Good for 6 to 8 guests."}', true, 10),
  ('villa-aryanna', 'Villa Aryanna', 'cottage', 6, 6, false, false, 2300, null, '{"en":"Good for 6 guests."}', true, 20),
  ('mapitag-function-hall', 'Mapitag Function Hall', 'hall', null, null, false, false, 2500, null, '{}', true, 30),
  ('alexa', 'Cozy Alexa', 'room', 2, 2, false, false, 1500, null, '{"en":"Good for 2 guests."}', true, 40),
  ('cabins-adrean', 'Cabins Adrean', 'room', 2, 2, false, false, 1500, null, '{"en":"Good for 2 guests."}', true, 50),
  ('aqua-blaire', 'Aqua Blaire', 'cottage', 2, 4, false, false, 500, null, '{"en":"Good for 2 to 4 guests."}', true, 60),
  ('open-cottage', 'Open Cottage', 'cottage', 3, 4, false, false, 500, null, '{"en":"Good for 3 to 4 guests."}', true, 70),
  ('umbrella-kubo-1', 'Umbrella Kubo 1', 'kubo', null, null, false, false, 150, null, '{}', true, 80),
  ('umbrella-kubo-2', 'Umbrella Kubo 2', 'kubo', null, null, false, false, 150, null, '{}', true, 81),
  ('umbrella-kubo-3', 'Umbrella Kubo 3', 'kubo', null, null, false, false, 150, null, '{}', true, 82),
  ('umbrella-kubo-4', 'Umbrella Kubo 4', 'kubo', null, null, false, false, 150, null, '{}', true, 83),
  ('room-1', 'Room 1', 'room', 2, 2, true, true, null, 'TODO: Price outside the 6-room exclusive package is unconfirmed.', '{"en":"Aircon room for 2 with own CR."}', true, 90),
  ('room-2', 'Room 2', 'room', 2, 2, true, true, null, 'TODO: Price outside the 6-room exclusive package is unconfirmed.', '{"en":"Aircon room for 2 with own CR."}', true, 100),
  ('room-3', 'Room 3', 'room', 2, 2, true, true, null, 'TODO: Price outside the 6-room exclusive package is unconfirmed.', '{"en":"Aircon room for 2 with own CR."}', true, 110)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('unit-photos', 'unit-photos', true)
on conflict (id) do nothing;

drop policy if exists "admins read payment proofs" on storage.objects;
create policy "admins read payment proofs" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and (select public.is_admin()));
drop policy if exists "admins manage payment proofs" on storage.objects;
create policy "admins manage payment proofs" on storage.objects for all to authenticated using (bucket_id = 'payment-proofs' and (select public.is_admin())) with check (bucket_id = 'payment-proofs' and (select public.is_admin()));

drop policy if exists "admins manage unit photos" on storage.objects;
create policy "admins manage unit photos" on storage.objects for all to authenticated
  using (bucket_id = 'unit-photos' and (select public.is_admin()))
  with check (bucket_id = 'unit-photos' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Update 2026-11: per-room free entrances, booking price snapshots, logbook,
-- daily reports, and per-unit public availability. Safe to re-run.
-- ---------------------------------------------------------------------------

-- Number of guests (any age) whose entrance fee is included with the unit. Editable per unit in admin.
-- Rooms start at 2; every other unit starts at 0. The default only applies the first time the column is added.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'units' and column_name = 'free_entrance_count'
  ) then
    alter table public.units add column free_entrance_count integer not null default 0 check (free_entrance_count >= 0);
    update public.units set free_entrance_count = 2 where type = 'room';
  end if;
end $$;

alter table public.bookings add column if not exists visit_type text;
alter table public.bookings drop constraint if exists bookings_visit_type_check;
alter table public.bookings add constraint bookings_visit_type_check check (visit_type is null or visit_type in ('day-tour', 'overnight'));
-- Corkage listing: [{"label": "Red Horse x6", "amount": 300}, ...]
alter table public.bookings add column if not exists corkage_items jsonb not null default '[]'::jsonb;
-- Line-by-line price snapshot taken when the booking was priced, so later price edits never rewrite history.
alter table public.bookings add column if not exists price_breakdown jsonb;
-- True when an admin typed a total by hand instead of using the computed one.
alter table public.bookings add column if not exists total_overridden boolean not null default false;

insert into public.settings (key, value) values ('corkage_presets', '[]'::jsonb) on conflict (key) do nothing;

-- Logbook: one entry per stay. Walk-ins are recorded as confirmed bookings first, so every entry has a booking.
create table if not exists public.guest_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actual_adults integer not null default 0 check (actual_adults >= 0),
  actual_children integer not null default 0 check (actual_children >= 0),
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  notes text,
  checked_in_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (checked_out_at is null or checked_out_at >= checked_in_at)
);
create unique index if not exists guest_log_one_open_per_booking on public.guest_log (booking_id) where checked_out_at is null;
create index if not exists guest_log_checked_in_idx on public.guest_log (checked_in_at desc);

-- End-of-day report snapshots, saved when an admin closes the day.
create table if not exists public.daily_reports (
  report_date date primary key,
  data jsonb not null,
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz not null default now()
);

alter table public.guest_log enable row level security;
alter table public.daily_reports enable row level security;
drop policy if exists "admins manage guest log" on public.guest_log;
create policy "admins manage guest log" on public.guest_log for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins manage daily reports" on public.daily_reports;
create policy "admins manage daily reports" on public.daily_reports for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, insert, update, delete on public.guest_log, public.daily_reports to authenticated;

-- Which units are taken on which days. Exposes no guest details. Pending requests do not reserve anything.
-- state: 'booked' (this unit), 'exclusive' (whole resort event), 'closed' (admin closed the date).
-- Units with no row for a day are free that day.
drop function if exists public.get_unit_availability(date, date);
create function public.get_unit_availability(from_date date, through_date date)
returns table (unit_id uuid, day date, state text)
language sql stable security definer set search_path = '' as $$
  with days as (
    select series.day::date as day
    from generate_series(from_date::timestamp, through_date::timestamp, interval '1 day') as series(day)
    where through_date - from_date <= 400
  ),
  live as (
    select b.type, b.unit_ids, b.date_start, b.date_end
    from public.bookings b
    where b.status in ('awaiting_payment', 'confirmed')
      and (b.status = 'confirmed' or b.hold_expires_at is null or b.hold_expires_at > now())
      and b.date_end >= from_date and b.date_start <= through_date
  )
  select s.unit_id, s.day, s.state
  from (
    select u.id as unit_id, d.day,
      case
        when exists (select 1 from public.blocked_dates x where x.date = d.day) then 'closed'
        when exists (select 1 from live l where l.type = 'exclusive' and d.day between l.date_start and l.date_end) then 'exclusive'
        when exists (select 1 from live l where u.id = any(l.unit_ids) and d.day between l.date_start and l.date_end) then 'booked'
      end as state
    from public.units u cross join days d
    where u.active
  ) s
  where s.state is not null;
$$;
revoke all on function public.get_unit_availability(date, date) from public;
grant execute on function public.get_unit_availability(date, date) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.guest_log;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

commit;
