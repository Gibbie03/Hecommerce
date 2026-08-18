import { randomBytes, createHash } from "node:crypto";
import { runAsAnon } from "@/lib/db/withAuth";
import { findOrCreateIdentity, type LoginIdentity } from "@/lib/auth/otp";
import type { ClaimDraft } from "@/lib/business/claimSchema";

const TOKEN_BYTES = 32; // 256 bits of entropy — infeasible to guess or brute force.
const TOKEN_TTL_MINUTES = 15;

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

// Peppered the same way lib/auth/otp.ts hashes login codes: a leaked
// magic_links table alone still isn't enough to forge a valid token.
function hashToken(token: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${token}:${pepper}`).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requestMagicLink(
  email: string,
  continuation: ClaimDraft | null,
): Promise<{ token: string; email: string }> {
  const target = normalizeEmail(email);
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await runAsAnon(async (client) => {
    await client.query(
      `insert into magic_links (email, token_hash, continuation, expires_at) values ($1, $2, $3, $4)`,
      [target, tokenHash, continuation ? JSON.stringify(continuation) : null, expiresAt],
    );
  });

  return { token, email: target };
}

export interface MagicLinkResult {
  identity: LoginIdentity;
  continuation: ClaimDraft | null;
}

/**
 * Validates and atomically consumes a magic-link token in one statement.
 *
 * Deliberately NOT `UPDATE ... WHERE id = (SELECT id FROM ... WHERE
 * consumed_at IS NULL ... LIMIT 1)`: under READ COMMITTED, two concurrent
 * transactions can each resolve that subquery to the same row *before*
 * either commits, then both apply the outer UPDATE against that already-
 * resolved id — the outer WHERE no longer re-checks `consumed_at IS NULL`,
 * so both "succeed". Here the full predicate (unique token_hash AND
 * consumed_at IS NULL AND expires_at > now()) lives directly on the
 * UPDATE's WHERE clause, so Postgres re-evaluates all of it — including
 * consumed_at — against the current row after waiting on the lock. The
 * second transaction's UPDATE then legitimately matches zero rows. No
 * ORDER BY/LIMIT is needed here (unlike login_codes' code lookup) because
 * token_hash is unique by construction, so at most one row can ever match.
 */
export async function consumeMagicLink(token: string): Promise<MagicLinkResult | null> {
  const tokenHash = hashToken(token);

  const consumed = await runAsAnon(async (client) => {
    const { rows } = await client.query<{ email: string; continuation: ClaimDraft | null }>(
      `update magic_links
       set consumed_at = now()
       where token_hash = $1
         and consumed_at is null
         and expires_at > now()
       returning email, continuation`,
      [tokenHash],
    );
    return rows[0] ?? null;
  });

  if (!consumed) return null;

  const identity: LoginIdentity = await findOrCreateIdentity("email", consumed.email);

  return { identity, continuation: consumed.continuation ?? null };
}
