import { randomInt, createHash } from "node:crypto";
import { runAsAnon } from "@/lib/db/withAuth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;

export type LoginChannel = "email" | "phone";

export interface LoginIdentity {
  userId: string;
  email?: string;
  phone?: string;
}

function generateCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => randomInt(0, 10)).join("");
}

function normalizeTarget(channel: LoginChannel, value: string): string {
  return channel === "email" ? value.trim().toLowerCase() : value.trim();
}

function hashCode(channel: LoginChannel, target: string, code: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${channel}:${target}:${code}:${pepper}`).digest("hex");
}

export async function requestLoginCode(channel: LoginChannel, value: string): Promise<{ code: string; target: string }> {
  const target = normalizeTarget(channel, value);
  const code = generateCode();
  const codeHash = hashCode(channel, target, code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await runAsAnon(async (client) => {
    if (channel === "email") {
      await client.query(
        `insert into login_codes (email, code_hash, expires_at) values ($1, $2, $3)`,
        [target, codeHash, expiresAt],
      );
    } else {
      await client.query(
        `insert into login_codes (phone, code_hash, expires_at) values ($1, $2, $3)`,
        [target, codeHash, expiresAt],
      );
    }
  });

  return { code, target };
}

export async function confirmLoginCode(
  channel: LoginChannel,
  value: string,
  code: string,
): Promise<LoginIdentity | null> {
  const target = normalizeTarget(channel, value);
  const codeHash = hashCode(channel, target, code);
  const column = channel; // constrained to the "email" | "phone" union above — never raw user input

  const consumed = await runAsAnon(async (client) => {
    const { rows } = await client.query(
      `update login_codes
       set consumed_at = now()
       where id = (
         select id from login_codes
         where ${column} = $1 and code_hash = $2
           and consumed_at is null and expires_at > now()
         order by created_at desc
         limit 1
       )
       returning id`,
      [target, codeHash],
    );
    if (rows.length === 0) return null;

    const existing = await client.query(
      `select id, email, phone from auth.users where ${column} = $1`,
      [target],
    );
    return { existingRow: existing.rows[0] ?? null };
  });

  if (!consumed) {
    return null;
  }
  if (consumed.existingRow) {
    const row = consumed.existingRow;
    return { userId: row.id as string, email: row.email ?? undefined, phone: row.phone ?? undefined };
  }

  return createIdentity(channel, target);
}

/**
 * Creates a brand-new identity for a first-time sign-in. Against a real
 * Supabase project (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY set), this goes
 * through the Admin API rather than a raw INSERT — auth.users there is
 * GoTrue-managed, and inserting into it directly bypasses bookkeeping a
 * production system shouldn't skip. Local dev (no Supabase configured)
 * keeps inserting into the local auth shim exactly as before — see
 * supabase/migrations/0002_auth_shim.sql and docs/SUPABASE_MIGRATION.md.
 */
export async function createIdentity(channel: LoginChannel, target: string): Promise<LoginIdentity> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.auth.admin.createUser(
      channel === "email"
        ? { email: target, email_confirm: true }
        : { phone: target, phone_confirm: true },
    );
    if (error || !data.user) {
      throw new Error(`Failed to create user: ${error?.message ?? "unknown error"}`);
    }
    return channel === "email" ? { userId: data.user.id, email: target } : { userId: data.user.id, phone: target };
  }

  return runAsAnon(async (client) => {
    const created = await client.query(
      channel === "email"
        ? `insert into auth.users (email) values ($1) returning id`
        : `insert into auth.users (phone) values ($1) returning id`,
      [target],
    );
    const userId = created.rows[0].id as string;
    return channel === "email" ? { userId, email: target } : { userId, phone: target };
  });
}
