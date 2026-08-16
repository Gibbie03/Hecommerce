import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __icommercePool: Pool | undefined;
}

function isLocalConnection(connectionString: string): boolean {
  return /(^|@)(localhost|127\.0\.0\.1)([:/]|$)/.test(connectionString);
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const local = isLocalConnection(connectionString);

  return new Pool({
    connectionString,
    // Supabase's Postgres requires TLS; local dev has no cert to validate
    // against. rejectUnauthorized: false still encrypts the connection —
    // the connection string's embedded password is the actual secret
    // boundary here — but swap in `ca: <Supabase's CA cert>` instead if
    // full chain validation matters for your compliance needs.
    ssl: local ? undefined : { rejectUnauthorized: false },
    // Serverless functions are short-lived and many can run concurrently;
    // keep each instance's own pool small. Point DATABASE_URL at Supabase's
    // connection pooler (the :6543 URL, not :5432) — that's what actually
    // absorbs the real fan-out across instances, not this setting.
    max: local ? 10 : 3,
    idleTimeoutMillis: 10_000,
  });
}

// Reuse the pool across hot reloads in dev. In production there's no HMR to
// survive — each serverless instance runs this module once at cold start
// and reuses the resulting pool for every request it handles afterward, so
// a fresh pool per module load is already the correct behavior there.
export const pool = global.__icommercePool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__icommercePool = pool;
}
