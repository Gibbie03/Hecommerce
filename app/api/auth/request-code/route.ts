import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestLoginCode } from "@/lib/auth/otp";
import { sendLoginCodeEmail } from "@/lib/email/resend";
import { sendLoginCodeSms } from "@/lib/sms/twilio";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("email"), value: z.string().trim().email().max(320) }),
  z.object({
    method: z.literal("phone"),
    value: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +2348011112222"),
  }),
]);

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`request-code:${ip}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email or phone number." }, { status: 400 });
  }

  const { method, value } = parsed.data;
  if (!rateLimit(`request-code:${method}:${value}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { code, target } = await requestLoginCode(method, value);
  const result = method === "email" ? await sendLoginCodeEmail(target, code) : await sendLoginCodeSms(target, code);

  // Always the same success response regardless of whether the account was
  // already registered — avoids account-enumeration per SECURITY_RULES.md §2.
  // `delivered` must reflect whether the code actually went out — not just
  // whether a provider was configured. A misconfigured or failing provider
  // (wrong credentials, an outage, insufficient balance) still needs to
  // show the "check server logs" fallback, or a real user is stranded with
  // no way to ever see their code. Found via a production-config audit: this
  // used to read `result.sent || result.reason !== "not_configured"`, which
  // reported delivered:true for a send that failed for any reason other
  // than "not configured" at all.
  return NextResponse.json({
    ok: true,
    delivered: result.sent,
  });
}
