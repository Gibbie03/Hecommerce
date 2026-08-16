#!/usr/bin/env bash
# Applies supabase/migrations/*.sql in order, as the postgres owner role
# (migrations must run as the table owner so grants to icommerce_app in
# db-setup.sh's ALTER DEFAULT PRIVILEGES apply automatically to new tables).
set -euo pipefail

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

# 0001 is historical reference only (superseded product shape) and is
# intentionally not applied — see the note at the top of that file.
for name in 0002_auth_shim.sql 0003_icommerce_schema.sql 0004_view_counter.sql 0005_business_created_by.sql 0006_fix_recursive_helpers.sql 0007_fix_claim_policy_recursion.sql 0008_fix_membership_returning.sql 0009_verification_status_insert_guard.sql; do
  f="$MIGRATIONS_DIR/$name"
  echo "Applying $f"
  su postgres -c "psql -d icommerce -v ON_ERROR_STOP=1 -f $f"
done

# Existing tables created before the default-privilege grant (or via a
# migration run out of band) still need an explicit grant.
su postgres -c "psql -d icommerce" <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO icommerce_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO icommerce_app;
SQL

echo "Migrations applied."
