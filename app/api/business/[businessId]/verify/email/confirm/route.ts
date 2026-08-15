import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { confirmEmailVerification } from "@/lib/business/mutations";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { businessId } = await params;
  const ip = clientIp(req.headers);
  if (!rateLimit(`verify-email-confirm:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const verified = await confirmEmailVerification(session.userId, businessId, parsed.data.code);
  if (!verified) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
