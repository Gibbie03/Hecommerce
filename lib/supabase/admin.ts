import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Server-only, service-role Supabase client — used for exactly two
 * privileged operations that shouldn't go through raw SQL against a real
 * project: creating a new `auth.users` row via the Admin API (so GoTrue's
 * own bookkeeping stays correct) and writing to Storage. Never exposed to
 * the client; never used for RLS-scoped app data, which stays on the
 * regular `pg` pool in lib/db/withAuth.ts.
 *
 * Returns null when unconfigured — every caller falls back to the local-dev
 * behavior that predates this file (shim `auth.users` insert, local disk
 * uploads) so nothing here changes local dev or requires new env vars to
 * keep working exactly as before. See docs/SUPABASE_MIGRATION.md.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
