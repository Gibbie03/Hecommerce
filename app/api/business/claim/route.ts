import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { applyOnboardingDraft, AuthorizationError, InvalidDraftError } from "@/lib/business/mutations";
import { claimDraftSchema } from "@/lib/business/claimSchema";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = claimDraftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  try {
    const { businessId } = await applyOnboardingDraft(session.userId, parsed.data);
    return NextResponse.json({ ok: true, businessId });
  } catch (err) {
    if (err instanceof InvalidDraftError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Claim failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
