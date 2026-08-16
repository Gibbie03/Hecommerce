-- Run LAST, after the schema migrations (0003 through 0009) have created
-- every table. 01_role_and_grants.sql's ALTER DEFAULT PRIVILEGES already
-- makes this a no-op in the normal case (it applies automatically to
-- tables the same owner connection creates afterward) — this is the same
-- explicit safety-net sweep scripts/db-migrate.sh already runs locally,
-- kept here in case setup ever happens out of order.

grant select, insert, update, delete on all tables in schema public to icommerce_app;
grant select on auth.users to icommerce_app;
