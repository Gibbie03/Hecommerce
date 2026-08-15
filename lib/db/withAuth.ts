import type { PoolClient } from "pg";
import { pool } from "./pool";

export type DbClient = PoolClient;

/**
 * Runs `fn` inside a transaction with `request.jwt.claims` set to mirror
 * exactly what PostgREST injects per-request against a real Supabase
 * project — see supabase/migrations/0002_auth_shim.sql. This is what makes
 * `auth.uid()` (and therefore every RLS policy) resolve correctly: the
 * database enforces access, this helper never does.
 */
async function withClaims<T>(
  claims: Record<string, unknown> | null,
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      claims ? JSON.stringify(claims) : "",
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function runAsUser<T>(
  userId: string,
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  return withClaims({ sub: userId, role: "authenticated" }, fn);
}

export function runAsAnon<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  return withClaims(null, fn);
}
