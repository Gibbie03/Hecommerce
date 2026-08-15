#!/usr/bin/env bash
# Local dev database bootstrap.
#
# Creates the `icommerce` database plus a dedicated, non-superuser
# `icommerce_app` role for the application to connect as. This matters for
# security, not just tidiness: Postgres row level security is bypassed
# automatically for table owners and superusers, so the app must connect as
# a distinct, unprivileged role or RLS enforcement would be silently
# inert. Migrations run as `postgres` (owns the tables); the app role only
# gets DML grants, with RLS policies deciding actual row visibility.
set -euo pipefail

APP_PASSWORD="${ICOMMERCE_APP_DB_PASSWORD:-icommerce_app_dev_password}"

su postgres -c psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'icommerce_app') THEN
    CREATE ROLE icommerce_app LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE icommerce OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'icommerce')\gexec
SQL

su postgres -c "psql -d icommerce" <<'SQL'
GRANT CONNECT ON DATABASE icommerce TO icommerce_app;
GRANT USAGE ON SCHEMA public TO icommerce_app;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO icommerce_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO icommerce_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO icommerce_app;
SQL

echo "Database + app role ready. DATABASE_URL for the app:"
echo "postgresql://icommerce_app:${APP_PASSWORD}@localhost:5432/icommerce"
