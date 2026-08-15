import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmLoginCode } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`confirm-code:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and 6-digit code." }, { status: 400 });
  }

  const { email, code } = parsed.data;
  if (!rateLimit(`confirm-code:email:${email}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const result = await confirmLoginCode(email, code);
  if (!result) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }

  await createSession(result);
  return NextResponse.json({ ok: true });
}
