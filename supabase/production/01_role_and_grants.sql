-- Run this FIRST, as the Supabase project's default owner connection
-- (the "postgres" user / connection string from Project Settings > Database
-- > Connection string), before the schema migrations in
-- supabase/migrations/. Mirrors scripts/db-setup.sh's local pattern for the
-- same reason: Postgres row level security is bypassed entirely for table
-- owners and superusers, and Supabase's default "postgres" role is exactly
-- that — so the app must connect as a separate, unprivileged role or every
-- RLS policy in this project is silently inert.
--
-- Usage (see docs/PRODUCTION_DEPLOYMENT.md step 2):
--   psql "$SUPABASE_ADMIN_DB_URL" -v app_password="$ICOMMERCE_APP_DB_PASSWORD" \
--     -v ON_ERROR_STOP=1 -f supabase/production/01_role_and_grants.sql

select format(
  'create role icommerce_app login password %L nosuperuser nocreatedb nocreaterole nobypassrls',
  :'app_password'
)
where not exists (select 1 from pg_roles where rolname = 'icommerce_app')
\gexec

grant connect on database postgres to icommerce_app;
grant usage on schema public to icommerce_app;

-- Applies automatically to every table the schema migrations (run next, as
-- this same owner connection) create — see scripts/db-migrate-production.sh.
alter default privileges in schema public grant select, insert, update, delete on tables to icommerce_app;

-- Supabase owns and manages the auth schema/auth.users; the app only ever
-- needs to look up an existing account (SELECT) and call auth.uid() (used
-- inside every RLS policy in supabase/migrations/0003_icommerce_schema.sql
-- onward). Explicit grants here rather than assuming Supabase's defaults
-- extend to a brand-new custom role.
grant usage on schema auth to icommerce_app;
grant select on auth.users to icommerce_app;
grant execute on function auth.uid() to icommerce_app;
