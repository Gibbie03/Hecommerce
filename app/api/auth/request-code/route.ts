import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestLoginCode } from "@/lib/auth/otp";
import { sendLoginCodeEmail } from "@/lib/email/resend";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`request-code:${ip}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const { email } = parsed.data;
  if (!rateLimit(`request-code:email:${email}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { code } = await requestLoginCode(email);
  const result = await sendLoginCodeEmail(email, code);

  // Always the same success response regardless of whether the email was
  // already registered — avoids account-enumeration per SECURITY_RULES.md §2.
  return NextResponse.json({
    ok: true,
    emailConfigured: result.sent || result.reason !== "not_configured",
  });
}
