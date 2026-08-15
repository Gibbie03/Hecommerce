import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { confirmImportedFields, AuthorizationError } from "@/lib/business/mutations";

export async function POST(_req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { businessId } = await params;
  try {
    const business = await confirmImportedFields(session.userId, businessId);
    return NextResponse.json({ ok: true, business });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
