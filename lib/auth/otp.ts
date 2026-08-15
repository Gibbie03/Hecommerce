import { randomInt, createHash } from "node:crypto";
import { runAsAnon } from "@/lib/db/withAuth";

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;

function generateCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => randomInt(0, 10)).join("");
}

function hashCode(email: string, code: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${email.toLowerCase()}:${code}:${pepper}`).digest("hex");
}

export async function requestLoginCode(email: string): Promise<{ code: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateCode();
  const codeHash = hashCode(normalizedEmail, code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await runAsAnon(async (client) => {
    await client.query(
      `insert into login_codes (email, code_hash, expires_at) values ($1, $2, $3)`,
      [normalizedEmail, codeHash, expiresAt],
    );
  });

  return { code };
}

export async function confirmLoginCode(
  email: string,
  code: string,
): Promise<{ userId: string; email: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = hashCode(normalizedEmail, code);

  return runAsAnon(async (client) => {
    const { rows } = await client.query(
      `update login_codes
       set consumed_at = now()
       where id = (
         select id from login_codes
         where email = $1 and code_hash = $2
           and consumed_at is null and expires_at > now()
         order by created_at desc
         limit 1
       )
       returning id`,
      [normalizedEmail, codeHash],
    );

    if (rows.length === 0) {
      return null;
    }

    const existing = await client.query(`select id from auth.users where email = $1`, [normalizedEmail]);
    if (existing.rows.length > 0) {
      return { userId: existing.rows[0].id as string, email: normalizedEmail };
    }

    const created = await client.query(
      `insert into auth.users (email) values ($1) returning id`,
      [normalizedEmail],
    );
    return { userId: created.rows[0].id as string, email: normalizedEmail };
  });
}
