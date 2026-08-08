-- Reference check, not yet wired into a CI pipeline (none exists yet).
--
-- Lists any table in `public` that either has row level security disabled,
-- or has RLS enabled but zero policies defined (which silently blocks all
-- access rather than granting it — usually a sign a policy was forgotten).
--
-- Intended use once CI exists: run this against a freshly migrated database
-- and fail the build if it returns any rows.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/check_rls.sql

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.polname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
having c.relrowsecurity = false or count(p.polname) = 0
order by table_name;
