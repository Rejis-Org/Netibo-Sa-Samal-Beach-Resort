# Netibo sa Samal

Mobile-first public website for Netibo sa Samal Beach Resort, built with Next.js App Router, TypeScript, Tailwind CSS 4, next-intl, and Supabase (planned for later milestones).

## Run locally

Requirements: Node.js 20.9 or newer and npm.

1. Run `npm install`.
2. Run `npm run dev` and open http://localhost:3000.
3. Use the language selector for English, Tagalog (`/fil`), and Cebuano (`/ceb`).

The public pages currently run without Supabase credentials. Prices are transcribed into the typed catalog in `src/lib/catalog.ts`; they will move to the editable database catalog in a later milestone. Room 1–3 prices remain inquiry-only because the advertisement does not list them.

## Supabase setup (later milestone)

Create a Supabase project in the resort owner's account. Open **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and click **Run** once. The single file creates all app tables, indexes, policies, the private payment proof bucket, public availability RPC, and initial price/unit/settings seed data.

After creating the owner's Auth user in **Authentication → Users**, replace the placeholder email below with that user's email and run this one-time role assignment in SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = lower('OWNER_EMAIL_HERE')
on conflict (user_id) do update set role = 'owner';
```

The Supabase client will be connected in a later milestone. When needed, copy `.env.example` to `.env.local` and add the Project URL and anon/publishable key. Keep the service role key server-only and never commit real secrets.

### Resetting the app schema

`supabase/reset.sql` is destructive. Running it deletes all Netibo app tables, rows, policies/functions, and objects in the private payment-proofs bucket. It does not remove Supabase Auth users, project settings, or unrelated Supabase objects. Back up first, then re-run `supabase/schema.sql` to create a fresh app schema.

## Public pages

- `/[locale]`: home page with the resort price list and highlights
- `/[locale]/packages`: exclusive packages and walk-in fees
- `/[locale]/stay`: cottages, rooms, capacities, and listed prices
- `/[locale]/schedule`: availability placeholder
- `/[locale]/book`: booking contact options
- `/[locale]/store-and-bar`: food, store, and bar information
- `/[locale]/find-us`: location and directions placeholder
- `/[locale]/contact`: phone and Facebook contact
- `/[locale]/privacy` and `/[locale]/terms`: legal placeholders that need owner review before online forms or payments launch

## Project structure

- `src/app/[locale]/`: localized public routes and shared layout
- `src/components/`: navigation, carousel, catalog, footer, and mobile actions
- `src/lib/catalog.ts`: typed ad prices and unit details for M1
- `src/i18n/`: locale routing and request configuration
- `public/netibo-brand-from-ad.webp`: wordmark crop from the supplied Facebook ad; replace it with the original logo when received
- `public/facebook-price-list.webp`: optimized copy of the supplied Facebook price list
- `messages/`: English, Tagalog, and Cebuano interface text; machine-drafted translations are marked for native review
- `supabase/schema.sql`: one-shot app schema and seed data
- `supabase/reset.sql`: destructive app-only reset

## Handover notes

Create Vercel and Supabase accounts in the client's name before production deployment. Connect the confirmed domain, add production environment variables, and replace marked placeholders before launch. Booking management, availability, payments, chat, and admin tools belong to later milestones.
