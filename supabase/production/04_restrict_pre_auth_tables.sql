-- Run last, after 01-03, as the same owner connection.
--
-- login_codes and magic_links deliberately have RLS disabled (see their
-- own migration files) on the assumption that the only client that ever
-- queries them is this app's own server-side code, connected as the
-- dedicated icommerce_app role over a raw Postgres connection — never via
-- Supabase's PostgREST/REST API.
--
-- That assumption does NOT hold by default. Every new Supabase project is
-- provisioned with broad default grants — roughly
-- `grant all on all tables in schema public to anon, authenticated`, plus
-- matching `alter default privileges` for future tables — on the
-- expectation that RLS is what actually restricts access. For every OTHER
-- table in this schema that's true (see supabase/migrations/0003 onward).
-- For these two specific tables it is not: with no RLS and the default
-- grants left in place, anyone holding the project's public anon key could
-- hit `<project>.supabase.co/rest/v1/magic_links` directly and read every
-- row (emails, token hashes, pending onboarding drafts) — or INSERT a row
-- with an attacker-chosen token_hash and an arbitrary email, then call
-- this app's own /auth/email/callback with the matching raw token to
-- obtain a session for that email without ever proving control of it.
-- That's a full authentication-bypass path that exists entirely outside
-- this app's own code (rate limiting, atomic consumption, etc. never run,
-- since the request never touches the app), so revoking access instead of
-- adding an RLS policy on tables that intentionally have none.
--
-- icommerce_app is unaffected — it's a separate role from anon/authenticated
-- and was never granted these privileges to begin with (01_role_and_grants.sql
-- grants only to icommerce_app), so server-side application access is
-- unchanged by this file.
--
-- Guarded with \gexec + a pg_tables check, matching 01_role_and_grants.sql's
-- conditional-DDL pattern, because login_codes does not currently exist on
-- a real Supabase project (it's defined inside 0002_auth_shim.sql, which
-- db-migrate-production.sh intentionally skips — see
-- docs/SUPABASE_MIGRATION.md point 6). This file stays a no-op for
-- login_codes until that gap is separately fixed, rather than erroring out
-- of the whole migration run on a table that isn't there yet.

select format('revoke all on table public.%I from anon, authenticated, public', tablename)
from pg_tables
where schemaname = 'public' and tablename in ('login_codes', 'magic_links')
\gexec
