# Moving from local Postgres to hosted Supabase

This app was originally built against a local PostgreSQL 16 server with a
hand-built `auth` schema shim, because that dev environment had no Docker
daemon and couldn't reach `supabase.com`. It's now wired to run against a
real hosted Supabase project instead — this describes exactly what changed
and why, for anyone reading the code cold. For the actual step-by-step
deploy process, see `docs/PRODUCTION_DEPLOYMENT.md`.

## The chosen approach: hybrid, not a full Supabase-native rewrite

Two swaps were possible for data access and auth. This app took the
conservative branch on both, to avoid changing any product behavior or UX
in the process:

- **Data access stays raw `pg`**, pointed at Supabase's own Postgres
  (via its connection pooler) instead of local Postgres. `lib/db/withAuth.ts`'s
  `BEGIN; SELECT set_config('request.jwt.claims', ..., true); ...; COMMIT`
  pattern is exactly what PostgREST does internally against a real Supabase
  project — `request.jwt.claims` is a plain Postgres session variable, and
  `auth.uid()` reads it the same way no matter who set it. This is why the
  local shim's `auth.uid()` was written to match Supabase's real
  implementation from the start: **zero RLS policy changes were needed.**
  A `@supabase/supabase-js`-based rewrite of the query layer was the other
  option; not taken, since it would touch every query in
  `lib/business/queries.ts`/`mutations.ts` for no behavioral gain.
- **Sign-in and verification UX are unchanged** — email or phone, a
  6-digit code, the same session cookie (`lib/auth/otp.ts`,
  `lib/auth/session.ts`). Swapping to Supabase's own `signInWithOtp()` +
  `@supabase/ssr` was the documented alternative; not taken, because it
  would move email/SMS sending into Supabase's own GoTrue pipeline
  (dashboard-configured SMTP/phone provider) and there was no way to verify
  that produces an identical UX without live access to a project. Only
  *where a new identity is stored* changed — see below.

## What actually changed

1. **Database**: run `supabase/migrations/0003_icommerce_schema.sql`
   through `0009_verification_status_insert_guard.sql` (in that order)
   against the real project — **not** `0002_auth_shim.sql` (Supabase
   already provides `auth.users`/`auth.uid()` natively) and **not**
   `0010_phone_auth.sql` (it `ALTER TABLE auth.users ADD COLUMN phone`,
   but Supabase's real `auth.users` already has a native `phone` column —
   running it against a real project would error). `0001` was always
   historical reference and was never applied anywhere. See
   `scripts/db-migrate-production.sh`, which encodes this exact list.
2. **A dedicated Postgres role.** Supabase's default connection credentials
   are the project-owner `postgres` role, which — like any table owner —
   bypasses RLS entirely. `supabase/production/01_role_and_grants.sql`
   creates `icommerce_app` (login, no bypass, no superuser) for the app to
   actually connect as, mirroring `scripts/db-setup.sh`'s local pattern.
3. **Auth**: `lib/auth/otp.ts`'s `confirmLoginCode` still generates,
   hashes, and validates its own 6-digit codes exactly as before. Only the
   *first-time user creation* step branches: if `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` are set, it calls Supabase's Admin API
   (`auth.admin.createUser()`) instead of inserting into `auth.users`
   directly — that table is GoTrue-managed on a real project, and a raw
   `INSERT` bypasses bookkeeping a production system shouldn't skip.
   Existing-user lookup stays a plain `SELECT` either way (always safe on
   any Postgres table). See `lib/supabase/admin.ts`.
4. **Storage**: `lib/upload.ts` branches the same way — Supabase Storage
   bucket `business-images` (public read, tenant-prefixed paths per
   `docs/DATABASE_SECURITY.md`) when configured, local disk otherwise. This
   one isn't optional for a real deployment: serverless functions don't
   have a writable, persistent `public/` directory, so local-disk uploads
   flatly don't work on Vercel. Authorization is unchanged — the
   RLS-protected `business_images` insert is still the actual gate; the
   service-role Storage write only happens after that succeeds.
5. **Email/SMS**: no change. `lib/email/resend.ts` and `lib/sms/twilio.ts`
   call their providers' HTTP APIs directly and never depended on which
   Postgres they're paired with.
6. **`login_codes` table**: kept. It's an app-owned table in the `public`
   schema (not `auth`), so Supabase has no opinion on it — it's what
   `lib/auth/otp.ts` uses to track outstanding codes regardless of which
   environment it's running in.

## The env-var switch

Every branch above checks for `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
(`lib/supabase/admin.ts`'s `getSupabaseAdmin()`, returns `null` when unset).
Leave them unset and the app behaves exactly as it did before any of this
existed — local shim `auth.users`, local disk uploads, zero new
requirements for local dev. Set them and production behavior activates.
Nothing else in the codebase needs to know which mode it's in.

## If you do want the full Supabase-native swap later

`@supabase/ssr` + `signInWithOtp()` + a `@supabase/supabase-js` query layer
remains a reasonable direction if the hand-rolled OTP/session system ever
becomes a maintenance burden — but it's a real UX-risk-bearing change (GoTrue's
own email/SMS templates and session/refresh-token behavior would need to be
verified against the current UX), not a drop-in, so it wasn't done as part
of productionizing this MVP. If you pursue it: RLS policies still don't
change (they already key off `auth.uid()`); drop `login_codes` and
`lib/auth/otp.ts`; replace `lib/auth/session.ts`'s cookie handling with
`@supabase/ssr`'s server client throughout `app/`.
