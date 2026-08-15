import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getBusinessForMember } from "@/lib/business/queries";
import { requestEmailVerification, AuthorizationError } from "@/lib/business/mutations";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({ email: z.string().trim().email().max(320) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { businessId } = await params;
  const ip = clientIp(req.headers);
  if (!rateLimit(`verify-email-send:${ip}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const business = await getBusinessForMember(businessId, session.userId);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  try {
    const { delivered } = await requestEmailVerification(
      session.userId,
      businessId,
      parsed.data.email,
      business.name,
    );
    return NextResponse.json({ ok: true, delivered });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
