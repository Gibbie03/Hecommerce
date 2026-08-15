# Moving from local Postgres to hosted Supabase

This app currently runs against a local PostgreSQL 16 server instead of
Supabase, because this development environment has no Docker daemon and
can't reach `supabase.com` to run the hosted stack. The schema and RLS
policies (`supabase/migrations/0003_icommerce_schema.sql`) were written to
be Supabase-compatible from day one, so moving to a real project is a swap,
not a rewrite.

## What to change

1. **Create a Supabase project**, then in its SQL editor run
   `supabase/migrations/0003_icommerce_schema.sql` only — skip
   `0002_auth_shim.sql` entirely, since Supabase already provides
   `auth.users` and `auth.uid()` natively.
2. **Auth**: replace `lib/auth/otp.ts` + `lib/db/withAuth.ts`'s manual
   `set_config('request.jwt.claims', ...)` with `@supabase/ssr` and
   `supabase.auth.signInWithOtp()`. The RLS policies don't change — they
   already key off `auth.uid()`.
3. **Data access**: replace `lib/db/pool.ts` (raw `pg`) with
   `@supabase/supabase-js` calls, or keep using `pg` pointed at the
   Supabase connection string if you prefer — RLS enforces the same either
   way as long as the connecting role isn't the table owner/service role.
4. **Storage**: `lib/business/mutations.ts` currently writes uploaded
   images to `public/uploads/{business_id}/...` on local disk. Swap this
   for a Supabase Storage bucket (`business-images`, public read, tenant-
   prefixed paths per `docs/DATABASE_SECURITY.md`).
5. **Email**: no change — `lib/email/resend.ts` already calls Resend's
   HTTP API directly and doesn't depend on which Postgres it's paired with.
6. Drop the `login_codes` table and its usage once `signInWithOtp` replaces
   the hand-rolled flow.

Everything else — query shape, RLS policies, the business/product/
verification data model — carries over unchanged.
