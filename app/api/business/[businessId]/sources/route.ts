import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { connectSource, AuthorizationError } from "@/lib/business/mutations";

const bodySchema = z.object({
  type: z.enum(["website", "whatsapp", "instagram", "facebook"]),
  value: z.string().trim().min(1).max(2048),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { businessId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  try {
    await connectSource(session.userId, businessId, parsed.data.type, parsed.data.value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
