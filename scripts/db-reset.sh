#!/usr/bin/env bash
# Drops and recreates the local dev database from scratch, then seeds it.
set -euo pipefail

su postgres -c "psql -c \"DROP DATABASE IF EXISTS icommerce\""
bash "$(dirname "$0")"/db-setup.sh
bash "$(dirname "$0")"/db-migrate.sh
su postgres -c "psql -d icommerce -v ON_ERROR_STOP=1 -f $(dirname "$0")/../supabase/seed.sql"
echo "Database reset and seeded."
