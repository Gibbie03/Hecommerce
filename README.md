# Icommerce

«Make your business readable and tradable with AI agents.»

Icommerce turns a real business — with or without an existing website —
into a business identity that's discoverable, verifiable, and readable by
AI agents: a public Business Site, an "AI View," a rule-based Q&A
simulator, and a read-only agent API. See the full product spec in the
onboarding/dashboard copy itself; this README covers running it.

## Stack

Next.js (App Router, TypeScript) + Tailwind, backed by PostgreSQL with row
level security as the tenant-isolation boundary. Local dev runs against a
local Postgres instance with a small `auth` schema shim that mirrors
Supabase Auth's `auth.uid()` contract; production runs against real hosted
Supabase (same RLS policies, unmodified — see
[`docs/SUPABASE_MIGRATION.md`](./docs/SUPABASE_MIGRATION.md)). Deploying to
Vercel + Supabase: [`docs/PRODUCTION_DEPLOYMENT.md`](./docs/PRODUCTION_DEPLOYMENT.md).

## Running locally

```bash
npm install

# One-time: creates the `icommerce` Postgres database and a dedicated,
# non-superuser `icommerce_app` role (RLS is bypassed for table owners, so
# the app must NOT connect as the migration/owner role).
bash scripts/db-setup.sh

# Applies migrations, then seeds one realistic demo business
# ("Oooh Lala Shawarma") left deliberately unclaimed.
bash scripts/db-migrate.sh
psql "$DATABASE_URL" -f supabase/seed.sql

cp .env.example .env   # DATABASE_URL already matches db-setup.sh's output
npm run dev
```

To start over: `bash scripts/db-reset.sh` (drops, recreates, migrates, and
reseeds in one step).

Sign-in and verification codes go out over email (Resend, `RESEND_API_KEY`)
or phone/SMS (Twilio, `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/
`TWILIO_FROM_NUMBER`) — pick either at the `/claim` step. Without the
matching credentials set, codes are logged to the server console instead of
failing, so both flows stay testable with nothing configured. WhatsApp and
business-document verification are still visibly marked "requires provider
setup" in the UI rather than faked — see `docs/SECURITY_ARCHITECTURE.md`
in the earlier planning docs for why unbuilt scope is flagged, not hidden.

## Security planning docs

Written before this build started, and still the operating rules for it:

- [`SECURITY_RULES.md`](./SECURITY_RULES.md) — the checklist this codebase
  follows; read this first.
- [`docs/SECURITY_ARCHITECTURE.md`](./docs/SECURITY_ARCHITECTURE.md) —
  system shape, tenant model, data classification.
- [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) — assets, actors,
  threats, and mitigations.
- [`docs/DATABASE_SECURITY.md`](./docs/DATABASE_SECURITY.md) — the RLS
  pattern actually used in `supabase/migrations/0003_icommerce_schema.sql`.
- [`docs/SUPABASE_MIGRATION.md`](./docs/SUPABASE_MIGRATION.md) — what
  changes to point this at a real hosted Supabase project.
- [`docs/PRODUCTION_DEPLOYMENT.md`](./docs/PRODUCTION_DEPLOYMENT.md) — the
  step-by-step Vercel + Supabase deployment runbook.
- [`scripts/check_rls.sql`](./scripts/check_rls.sql) — flags any table
  missing RLS; run it after every schema change.

## Structure

```
app/            Routes: landing, onboarding, claim, verify, dashboard,
                the public [slug] business site, and API routes
                (including the read-only /api/agent/* agent interface)
components/     ui/ (shared design system), business/, dashboard/, verify/
lib/            db/ (pg pool + RLS-aware transaction helper), auth/,
                business/ (queries, mutations, readiness scoring),
                ai/ (rule-based AI View + question simulator — no LLM
                call, so it can't hallucinate facts not in the record),
                import/ (website scraping), email/, sms/, supabase/
                (service-role client, used only for prod user creation +
                Storage), agent/
supabase/       migrations/, seed.sql, production/ (role/grants/bucket SQL
                for a real hosted project — see docs/PRODUCTION_DEPLOYMENT.md)
scripts/        db-setup.sh, db-migrate.sh, db-reset.sh, check_rls.sql,
                db-migrate-production.sh, smoke-test.sh
```

Explicitly out of scope for this MVP (shown in the UI as "coming soon,"
never faked): payments/checkout, WhatsApp/business-document verification,
Jumia/Shopify/Bumpa source sync, review submission, and analytics beyond a
view counter.
