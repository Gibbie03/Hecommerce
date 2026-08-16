import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestMagicLink } from "@/lib/auth/magicLink";
import { sendMagicLinkEmail } from "@/lib/email/resend";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { claimDraftSchema } from "@/lib/business/claimSchema";

const MAGIC_LINK_TTL_MINUTES = 15;

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  // Present only when the request originates from an in-progress
  // create/claim flow — carries the onboarding draft through the link
  // round trip server-side, never in the URL. Absent for plain sign-in.
  continuation: claimDraftSchema.optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);

  // Same limit shape as /api/auth/request-code: one bucket per IP (abuse
  // from any single source), one per email (repeated requests for the
  // same address) — both reuse the repo's existing in-memory rate limiter.
  if (!rateLimit(`magic-link-request:ip:${ip}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { email, continuation } = parsed.data;

  if (!rateLimit(`magic-link-request:email:${email.trim().toLowerCase()}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { token } = await requestMagicLink(email, continuation ?? null);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/auth/email/callback?token=${token}`;
  await sendMagicLinkEmail(email, url, MAGIC_LINK_TTL_MINUTES);

  // Identical response whether or not this email belongs to an existing
  // account — requestMagicLink() always inserts a row and this route
  // always attempts to send, so there is nothing account-existence-shaped
  // for the response to leak. See SECURITY_ARCHITECTURE.md / the account
  // enumeration rule already applied to /api/auth/request-code.
  return NextResponse.json({ ok: true });
}
