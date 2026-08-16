#!/usr/bin/env bash
# Applies the production-safe subset of supabase/migrations/*.sql against a
# REAL Supabase Postgres connection. Run from a machine that can actually
# reach supabase.com — this repo's own dev/CI sandbox cannot (see
# docs/PRODUCTION_DEPLOYMENT.md for why).
#
# 0001 is historical reference and was never applied anywhere (see that
# file's header). 0002 and 0010 are intentionally skipped here: Supabase
# already provides auth.users/auth.uid() natively (0002 recreates them for
# local dev only), and 0010 ALTERs auth.users in ways that conflict with
# Supabase's own managed schema — see docs/SUPABASE_MIGRATION.md.
#
# Usage:
#   SUPABASE_ADMIN_DB_URL="postgresql://postgres:<password>@<host>:5432/postgres" \
#   ICOMMERCE_APP_DB_PASSWORD="<a strong password for the app's own DB role>" \
#     bash scripts/db-migrate-production.sh
set -euo pipefail

: "${SUPABASE_ADMIN_DB_URL:?Set SUPABASE_ADMIN_DB_URL to the project's owner connection string first}"
: "${ICOMMERCE_APP_DB_PASSWORD:?Set ICOMMERCE_APP_DB_PASSWORD — the password to create the app's restricted DB role with}"

ROOT="$(dirname "$0")/.."
MIGRATIONS_DIR="$ROOT/supabase/migrations"
PROD_DIR="$ROOT/supabase/production"

echo "1/4: app role + default grants"
psql "$SUPABASE_ADMIN_DB_URL" -v app_password="$ICOMMERCE_APP_DB_PASSWORD" -v ON_ERROR_STOP=1 \
  -f "$PROD_DIR/01_role_and_grants.sql"

echo "2/4: schema + RLS (0003 through 0009)"
for name in 0003_icommerce_schema.sql 0004_view_counter.sql 0005_business_created_by.sql \
  0006_fix_recursive_helpers.sql 0007_fix_claim_policy_recursion.sql \
  0008_fix_membership_returning.sql 0009_verification_status_insert_guard.sql; do
  echo "  applying $name"
  psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$name"
done

echo "3/4: storage bucket"
psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$PROD_DIR/02_storage_bucket.sql"

echo "4/4: backfill grants"
psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$PROD_DIR/03_backfill_grants.sql"

echo
echo "Done. Checking every tenant table has RLS enabled with at least one policy:"
psql "$SUPABASE_ADMIN_DB_URL" -f "$ROOT/scripts/check_rls.sql"
echo "(only login_codes should be listed — it's pre-authentication and intentionally excluded, see its migration file)"
