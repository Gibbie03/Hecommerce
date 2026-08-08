# Hecommerce

Multi-tenant commerce platform — currently in the idea/planning stage, no
application code yet.

## Security planning docs

Before any implementation starts, the security model is written down here so
it's decided in advance rather than improvised later:

- [`SECURITY_RULES.md`](./SECURITY_RULES.md) — rules an AI coding agent (or
  human) should follow when building; read this first.
- [`docs/SECURITY_ARCHITECTURE.md`](./docs/SECURITY_ARCHITECTURE.md) —
  overall system shape, tenant model, data classification.
- [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) — assets, actors,
  threats, and mitigations.
- [`docs/DATABASE_SECURITY.md`](./docs/DATABASE_SECURITY.md) — RLS patterns
  for tenant isolation in Postgres/Supabase.
- [`supabase/migrations/0001_tenant_foundation.sql`](./supabase/migrations/0001_tenant_foundation.sql)
  — reference migration showing the tenant/RLS pattern in SQL. Not yet run
  against a real project.
- [`scripts/check_rls.sql`](./scripts/check_rls.sql) — query to catch tables
  missing RLS; intended to be wired into CI once one exists.

The four things to get right before onboarding any real merchant: **tenant
isolation, RLS, authentication, and payment architecture.** Everything else
layers on incrementally.
