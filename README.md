# Netibo sa Samal

Mobile-first resort website for Netibo sa Samal Beach Resort, built with Next.js App Router, TypeScript, Tailwind CSS 4, next-intl, and Supabase.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

1. Copy .env.example to .env.local. M0 does not need Supabase keys to render the placeholder home page.
2. Run npm install.
3. Run npm run dev and open http://localhost:3000.
4. Check the language selector for English, Tagalog (/fil), and Cebuano (/ceb).

The price section is intentionally a placeholder until the database is connected. Do not add real secrets to Git.

## Supabase setup

Create a Supabase project in the resort owner's account. Open **SQL Editor â†’ New query**, paste the entire contents of supabase/schema.sql, and click **Run** once. The single file creates all app tables, indexes, policies, the private payment proof bucket, public availability RPC, and initial price/unit/settings seed data.

After creating the owner's Auth user in **Authentication â†’ Users**, replace the placeholder email below with that user's email and run this one-time role assignment in SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = lower('OWNER_EMAIL_HERE')
on conflict (user_id) do update set role = 'owner';
```

Paste the project's Project URL and anon/publishable key into .env.local when the Supabase client is added in a later milestone. Keep the service role key server-only.

### Resetting the app schema

supabase/reset.sql is destructive. Running it deletes all Netibo app tables, rows, policies/functions, and objects in the private payment-proofs bucket. It does not remove Supabase Auth users, project settings, or unrelated Supabase objects. Make a backup first. Re-run supabase/schema.sql to create a fresh app schema.

## Project structure

- src/app/[locale]/: localized public home and root layout
- src/components/: shared page controls
- src/i18n/: locale routing and request configuration
- public/netibo-brand-from-ad.webp: header wordmark crop from the supplied Facebook ad; replace with the original logo file when available
- public/facebook-price-list.webp: optimized copy of the supplied Facebook price list
- messages/: English, Tagalog, Cebuano UI strings
- supabase/schema.sql: one-shot app schema and seed data
- supabase/reset.sql: destructive app-only reset

## Handover notes

Create Vercel and Supabase accounts in the client's name before production deployment. Deployments, domain setup, backups, payment flows, booking management, chat, and admin tools belong to later milestones.