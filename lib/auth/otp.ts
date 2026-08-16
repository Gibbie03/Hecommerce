import { randomInt, createHash } from "node:crypto";
import { runAsAnon } from "@/lib/db/withAuth";

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

  return runAsAnon(async (client) => {
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

    if (rows.length === 0) {
      return null;
    }

    const existing = await client.query(
      `select id, email, phone from auth.users where ${column} = $1`,
      [target],
    );
    if (existing.rows.length > 0) {
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
