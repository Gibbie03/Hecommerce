# Production Deployment Runbook — Vercel + Hosted Supabase

Every step here needs either a dashboard/OAuth session (Supabase, Vercel)
or DNS control (Resend) that only you have — none of it can run from an
agent sandbox. This is written to be followed verbatim, in order. Code and
migrations referenced below already exist in the repo; see
`docs/SUPABASE_MIGRATION.md` for the architecture those changes implement.

Before starting, generate two secrets you'll need in steps 2 and 6:

```bash
# Production SESSION_SECRET (signs the auth cookie)
openssl rand -base64 32

# Password for the app's restricted DB role (step 2)
openssl rand -base64 24
```

---

## 1. Hosted Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → New project.
2. Pick an organization, name it, set a strong database password (this is
   the *owner* password — save it, you'll use it once in step 2 as
   `SUPABASE_ADMIN_DB_URL` and then never need it again day-to-day).
3. **Region**: pick whichever you'll also deploy Vercel's functions to
   (step 7 lets you set this) — same-region keeps the direct Postgres
   connection's latency low. `us-east-1` (Supabase) ↔ `iad1` (Vercel) is a
   common pairing if you have no other constraint.
4. Wait for provisioning (~2 minutes), then collect these from
   **Project Settings**:
   - **API** tab: `Project URL` → this is `SUPABASE_URL`. `service_role`
     secret key → this is `SUPABASE_SERVICE_ROLE_KEY` (never expose this
     to the client, never commit it).
   - **Database** tab → **Connection string**: you'll need both the
     **Session pooler** or direct connection (as the `postgres` owner
     role, for step 2's one-time setup — call it `SUPABASE_ADMIN_DB_URL`)
     and the **Transaction pooler** URL (port `6543`) as the shape your
     production `DATABASE_URL` will follow once you swap in the
     `icommerce_app` role's credentials in step 2.

## 2. Production database + RLS migration

From a machine that can reach `supabase.com` (not this repo's dev
sandbox):

```bash
SUPABASE_ADMIN_DB_URL="postgresql://postgres:<owner-password>@<host>:5432/postgres" \
ICOMMERCE_APP_DB_PASSWORD="<the second openssl-generated secret above>" \
  bash scripts/db-migrate-production.sh
```

This runs, in order: `supabase/production/01_role_and_grants.sql` (creates
the `icommerce_app` role — **not** a superuser, **not** the table owner,
so RLS actually applies to it; see that file's header for why this
matters), the schema migrations `0003` through `0009` (skipping `0002` and
`0010` on purpose — Supabase already provides `auth.users`/`auth.uid()`,
and `0010` would conflict with them; see `docs/SUPABASE_MIGRATION.md`),
`supabase/production/02_storage_bucket.sql`, and
`supabase/production/03_backfill_grants.sql`. It finishes by running
`scripts/check_rls.sql` against the new database — **the only table it
should list is `login_codes`** (intentionally excluded, pre-authentication,
see its migration file's comment). If anything else shows up, a table is
missing RLS — stop and investigate before continuing.

Your production `DATABASE_URL` (for step 6) is the **transaction pooler**
connection string from step 1, with the username/password swapped to
`icommerce_app` / the password you just set:

```
postgresql://icommerce_app:<ICOMMERCE_APP_DB_PASSWORD>@<pooler-host>:6543/postgres
```

**Do not** use the project-owner `postgres` credentials as the app's
`DATABASE_URL` — that role bypasses RLS entirely, silently turning off the
tenant-isolation guarantees `docs/DATABASE_SECURITY.md` and this project's
own security audit depend on.

Seed data: `supabase/seed.sql` creates a demo business ("Oooh Lala
Shawarma") with fake data. **Not run automatically** — decide deliberately
whether you want fake demo data live on a real deployment before running
`psql "$SUPABASE_ADMIN_DB_URL" -f supabase/seed.sql` (default recommendation:
don't, for a real launch).

## 3. Supabase Auth

There's little to configure here, on purpose. This app doesn't use
Supabase's own GoTrue sign-in flows (magic links, its email templates, its
phone provider integration) — it keeps its existing hand-rolled email/phone
+ 6-digit-code flow (`lib/auth/otp.ts`), sending through Resend/Twilio
directly, and only uses Supabase's **Admin API** to create the resulting
`auth.users` row once a code is confirmed (see
`docs/SUPABASE_MIGRATION.md`). That's deliberate: it preserves the exact
existing sign-in UX rather than risking a mismatch against Supabase's own
OTP flow, which couldn't be verified without live access during
development.

Nothing to change under Authentication → Providers/Templates for this
app to work. Leave the defaults.

## 4. Supabase Storage

Already created by step 2's `02_storage_bucket.sql`. Verify: **Storage** in
the dashboard should show a `business-images` bucket marked public. Product
and business photos uploaded through the app land here (tenant-scoped
paths, `{businessId}/{file}`) instead of local disk — required for Vercel,
since serverless functions have no persistent/writable `public/` directory.

## 5. Resend production configuration

1. [resend.com/domains](https://resend.com/domains) → Add Domain, add the
   SPF/DKIM (and DMARC, recommended) DNS records it gives you to your
   domain's DNS provider, wait for verification (usually minutes, can take
   longer depending on DNS propagation).
2. Once verified, create a production API key
   ([resend.com/api-keys](https://resend.com/api-keys)) → this is
   `RESEND_API_KEY` for step 6.
3. Set `RESEND_FROM_EMAIL` to an address on the verified domain, e.g.
   `Icommerce <onboarding@yourdomain.com>` — the placeholder
   `onboarding@icommerce.ng` in `.env.example` won't send unless you
   actually own and verify that domain.

**Twilio** (not in your original 9 steps, but this app already ships phone
sign-in and phone business-verification, both built on Twilio — so it's
called out here as a decision, not assumed): get a phone number and
API credentials at [twilio.com/console](https://www.twilio.com/console) if
you want the phone channel to actually deliver SMS in production.
`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`. If you'd
rather ship without it for now, leave them unset — the phone option still
appears in the UI, but codes log server-side instead of sending (same
graceful degradation as an unconfigured Resend key), so nothing breaks;
it's just not functional for real users until configured.

## 6. Environment variables

Set these in Vercel: **Project Settings → Environment Variables**. Scope
each to Production, Preview, or both as noted.

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✓ | ✓ | `icommerce_app` role, transaction-pooler URL from step 2 |
| `SESSION_SECRET` | ✓ | ✓ | The `openssl rand -base64 32` value from the top of this doc |
| `SUPABASE_URL` | ✓ | ✓ | From step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | From step 1 — server-only, never `NEXT_PUBLIC_*` |
| `SUPABASE_STORAGE_BUCKET` | ✓ | ✓ | `business-images` |
| `RESEND_API_KEY` | ✓ | ✓ | From step 5 |
| `RESEND_FROM_EMAIL` | ✓ | ✓ | From step 5 |
| `TWILIO_ACCOUNT_SID` | ✓ | ✓ | From step 5, if using phone |
| `TWILIO_AUTH_TOKEN` | ✓ | ✓ | From step 5, if using phone |
| `TWILIO_FROM_NUMBER` | ✓ | ✓ | From step 5, if using phone |
| `APP_URL` | ✓ (your real domain) | leave unset | Preview builds fall back to Vercel's auto-injected `VERCEL_URL` automatically (see `app/[slug]/page.tsx`) — don't set `APP_URL` for Preview or every preview deploy would report the same stale URL |

Using one Supabase project for both Preview and Production is the simplest
setup and what this runbook assumes; use a second project + a different
`DATABASE_URL`/`SUPABASE_URL` pair for Preview if you want deploy previews
fully isolated from production data.

## 7. Vercel preview deployment

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo. Vercel
   auto-detects Next.js; no build command changes needed.
2. Set the env vars from step 6 before the first deploy (or redeploy after
   adding them).
3. Push the branch (or open a PR) — Vercel builds a Preview deployment and
   gives you a URL like `https://<project>-<hash>-<team>.vercel.app`.
4. If you want the direct-Postgres-connection latency benefit from step 1,
   set the function region under **Project Settings → Functions → Region**
   to match your Supabase project's region.

## 8. Full production smoke/security test

Automated portion:

```bash
SMOKE_TEST_URL="https://<your-preview-url>" bash scripts/smoke-test.sh
```

This checks: public pages load, unpublished/nonexistent businesses 404
through both the public site and the agent API, unauthenticated dashboard
access redirects, the SSRF guard on website import still rejects
loopback/private/non-http targets, malformed input doesn't leak a stack
trace, and auth rate limiting triggers within a burst — the same checks
already verified during this project's local security audit, now re-run
against the real deployment.

Manual checklist (needs real accounts/data, so it isn't scripted):

- [ ] Sign in with a real email — confirm the code actually arrives (Resend
      configured correctly).
- [ ] Sign in with a real phone number — confirm the SMS actually arrives
      (Twilio configured correctly), if you set it up in step 5.
- [ ] Full flow: create/import a business → verify (email or manual) →
      publish → view the live public site.
- [ ] Upload a product image → confirm it renders (proves Supabase Storage
      end-to-end, not just that the bucket exists).
- [ ] **Cross-tenant check**: create two separate test businesses under two
      different accounts; confirm account A cannot view/edit/publish
      account B's business via the dashboard or by guessing its API routes
      — this is the actual RLS enforcement working against the *real*
      project, not just the local one this was originally verified against.
- [ ] Check the agent API (`/api/agent/businesses/<slug>`) returns the
      published business correctly.

Known, accepted limitation worth being aware of before this ships:
`lib/rateLimit.ts` is in-memory and per-instance — on Vercel, with
multiple concurrent serverless instances, the actual effective rate limit
across all of them is higher than the configured "5 per 10 minutes"
number, not a hard global cap. This was flagged, not silently fixed with
new infrastructure (e.g. Upstash/Redis) that wasn't part of what was
asked for here — worth a deliberate decision later if abuse becomes a real
concern.

## 9. Production deployment

1. Merge/promote the branch to your production branch (Vercel deploys it
   as Production automatically if the branch is configured as such, or use
   `vercel --prod` from the CLI).
2. Set `APP_URL` in the Production environment scope to your real
   production URL (custom domain if you have one, otherwise the
   `*.vercel.app` production URL).
3. If using a custom domain: **Project Settings → Domains**, add it, follow
   Vercel's DNS instructions.
4. Re-run the smoke test against the production URL:
   ```bash
   SMOKE_TEST_URL="https://your-production-url" bash scripts/smoke-test.sh
   ```
5. Re-run the manual checklist from step 8 against production too — a
   Preview pass doesn't guarantee Production env vars were entered
   identically.
