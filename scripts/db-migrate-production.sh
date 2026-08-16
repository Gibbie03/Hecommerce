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

echo "1/5: app role + default grants"
psql "$SUPABASE_ADMIN_DB_URL" -v app_password="$ICOMMERCE_APP_DB_PASSWORD" -v ON_ERROR_STOP=1 \
  -f "$PROD_DIR/01_role_and_grants.sql"

echo "2/5: schema + RLS (0003 through 0009, plus 0011)"
for name in 0003_icommerce_schema.sql 0004_view_counter.sql 0005_business_created_by.sql \
  0006_fix_recursive_helpers.sql 0007_fix_claim_policy_recursion.sql \
  0008_fix_membership_returning.sql 0009_verification_status_insert_guard.sql \
  0011_magic_link_auth.sql; do
  echo "  applying $name"
  psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$name"
done

echo "3/5: storage bucket"
psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$PROD_DIR/02_storage_bucket.sql"

echo "4/5: backfill grants"
psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$PROD_DIR/03_backfill_grants.sql"

echo "5/5: revoke anon/authenticated access to pre-authentication tables"
psql "$SUPABASE_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -f "$PROD_DIR/04_restrict_pre_auth_tables.sql"

echo
echo "Done. Checking every tenant table has RLS enabled with at least one policy:"
psql "$SUPABASE_ADMIN_DB_URL" -f "$ROOT/scripts/check_rls.sql"
echo "(magic_links should be listed — it's pre-authentication and intentionally excluded, see its migration file)"
echo "(RLS-disabled here is now safe: step 5/5 also revoked anon/authenticated"
echo "table privileges directly, so PostgREST can't reach it regardless of RLS)"
echo
echo "NOTE: login_codes is created by 0002_auth_shim.sql, which this script skips"
echo "(that file also recreates auth.users/auth.uid(), which a real Supabase"
echo "project already provides). That means email/phone OTP sign-in"
echo "(lib/auth/otp.ts) has no table to write to against a real Supabase"
echo "project as this script stands today — a pre-existing gap, not"
echo "introduced by magic-link auth. Magic-link sign-in (this migration,"
echo "0011) does not depend on login_codes, so it is unaffected. If"
echo "OTP-based sign-in is still needed in production, extract login_codes'"
echo "table definition out of 0002 into its own migration the same way this"
echo "one is structured."
