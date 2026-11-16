# Netibo sa Samal

Mobile-first public website and small resort admin area for Netibo sa Samal Beach Resort. Built with Next.js App Router, TypeScript, Tailwind CSS 4, next-intl, and Supabase.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase Project URL and publishable key. The public pages still show the typed Facebook-ad catalog when those values are missing; admin sign-in needs them.
3. Run `npm run dev` and open http://localhost:3000.
4. Use the language selector for English, Tagalog (`/fil`), and Cebuano (`/ceb`).

## Set up Supabase

Create a Supabase project in the resort owner's account.

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Open `supabase/schema.sql`, copy the entire file into the query, and click **Run** once. This one file creates all app tables, indexes, policies, functions, Realtime chat tables, both storage buckets, and initial package/unit/settings data. Do not apply a second schema patch.
3. Open **Authentication → Users** and create the owner account with email and password. Disable public email/password sign-ups; create staff accounts there as needed.
4. Replace `OWNER_EMAIL_HERE` in this SQL and run it to give the owner the owner role. Use the same role statement with `'staff'` for staff accounts. Re-run the owner statement if this project previously used the old guest/admin patch; the unified schema safely demotes its ambiguous `admin` rows to `staff` first.

```sql
insert into public.user_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = lower('OWNER_EMAIL_HERE')
on conflict (user_id) do update set role = 'owner';
```

5. From **Project Settings → API**, copy the Project URL and publishable key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Restart the local server.
6. Visit `/admin/login` and sign in with the account created above. The owner can edit units, packages, prices, and settings. Staff can edit units and packages.
7. Before enabling guest chat or booking flows in their later milestones, turn on Supabase anonymous sign-ins under **Authentication → Sign In / Providers**. Guest sessions use anonymous Auth; guests do not need a visible account or login screen.

The public pages read active units and packages through Supabase's public key and row-level policies. Prices use whole PHP pesos. Room 1–3 are visible as “Ask for price” until their standalone prices are confirmed. If Supabase is not configured or the catalog query fails, the public pages display the typed M1 price list from `src/lib/catalog.ts`.

### Resetting the app database

`supabase/reset.sql` is the only separate SQL file and is destructive. It removes the Netibo app tables, their rows, app functions and policies, Realtime publication entries, and every uploaded object in the `payment-proofs` and `unit-photos` buckets. It does not remove Supabase Auth users, project settings, or unrelated Supabase objects. Back up first. To start fresh, run `supabase/reset.sql`, then run the full `supabase/schema.sql` file once. Do not run the reset file for routine updates.

## Public pages

- `/[locale]`: home, price list, and resort highlights
- `/[locale]/packages`: exclusive packages and walk-in fees
- `/[locale]/stay`: cottages, rooms, capacities, and prices
- `/[locale]/schedule`: availability placeholder
- `/[locale]/book`: booking contact options
- `/[locale]/store-and-bar`: food, store, and bar information
- `/[locale]/find-us`: location and directions placeholder
- `/[locale]/contact`: phone and Facebook contact
- `/[locale]/privacy` and `/[locale]/terms`: legal drafts that need owner review before online forms or payments launch
- `/admin/login` and `/admin`: staff sign-in and catalog/settings editor

## Project structure

- `src/app/[locale]/`: localized public routes and shared layout
- `src/app/admin/`: admin login, dashboard, and editing actions
- `src/components/`: public navigation, carousel, and catalog
- `src/lib/catalog.ts`: typed M1 fallback prices from the advertisement
- `src/lib/catalog-data.ts`: live public catalog reads with fallback
- `src/lib/supabase/`: typed public and authenticated Supabase clients and role checks
- `src/i18n/`: locale routing and request configuration
- `public/netibo-brand-from-ad.webp`: wordmark crop from the supplied Facebook ad; replace it with the original logo when received
- `public/facebook-price-list.webp`: optimized copy of the supplied Facebook price list
- `messages/`: English, Tagalog, and Cebuano interface text; machine-drafted translations are marked for native review
- `supabase/schema.sql`: one-shot complete app schema and seed data
- `supabase/reset.sql`: the one separate destructive app-only reset

## Handover notes

Create Vercel and Supabase accounts in the client's name before production deployment. Connect the confirmed domain, add production environment variables, and replace marked placeholders before launch. Booking requests, availability rules, manual GCash, chat, and booking management belong to later milestones.
