import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createProduct, AuthorizationError } from "@/lib/business/mutations";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  price_cents: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().max(8).optional(),
  availability: z.enum(["available", "unavailable", "unknown"]).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { businessId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A product name is required." }, { status: 400 });
  }

  try {
    const product = await createProduct(session.userId, businessId, {
      ...parsed.data,
      price_cents: parsed.data.price_cents ?? undefined,
    });
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
