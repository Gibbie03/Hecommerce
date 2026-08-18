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

  const consumedId = await runAsAnon(async (client) => {
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
    return rows[0]?.id as string | undefined;
  });

  if (!consumedId) {
    return null;
  }

  return findOrCreateIdentity(channel, target);
}

/**
 * Resolves the existing identity for `target`, or creates one on first
 * sign-in. Against a real Supabase project (SUPABASE_URL/
 * SUPABASE_SERVICE_ROLE_KEY set), this goes entirely through the Admin API
 * rather than a raw `auth.users` query — not just for creation bookkeeping,
 * but because `icommerce_app` (the app's restricted, non-superuser DB role,
 * see supabase/production/01_role_and_grants.sql) cannot actually be
 * granted USAGE on the `auth` schema on a hosted Supabase project: `auth`
 * is owned by Supabase's own internal `supabase_auth_admin` role, and the
 * `postgres` role customers connect as isn't a true superuser there and
 * has no authority to hand out access to a schema it doesn't own — proven
 * live (a schema-usage grant run as `postgres` reports success but confers
 * nothing; `current_user`/`session_user` confirm the connection really is
 * `postgres`, not `supabase_admin`, the project's actual superuser). The
 * Admin API is authenticated with the service-role key over HTTPS, so it's
 * unaffected by that Postgres-level boundary. Local dev (no Supabase
 * configured) keeps using the local auth shim exactly as before — see
 * supabase/migrations/0002_auth_shim.sql and docs/SUPABASE_MIGRATION.md.
 */
export async function findOrCreateIdentity(channel: LoginChannel, target: string): Promise<LoginIdentity> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const perPage = 1000;
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users) break;
      const match = data.users.find((u) => (channel === "email" ? u.email === target : u.phone === target));
      if (match) {
        return { userId: match.id, email: match.email ?? undefined, phone: match.phone ?? undefined };
      }
      if (data.users.length < perPage) break; // exhausted every page
    }

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
    const existing = await client.query(
      `select id, email, phone from auth.users where ${channel} = $1`,
      [target],
    );
    if (existing.rows[0]) {
      const row = existing.rows[0];
      return { userId: row.id as string, email: row.email ?? undefined, phone: row.phone ?? undefined };
    }

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
