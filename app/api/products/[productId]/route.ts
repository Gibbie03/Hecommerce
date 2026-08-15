import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateProduct, deleteProduct, AuthorizationError, NotFoundError } from "@/lib/business/mutations";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  price_cents: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().max(8).optional(),
  availability: z.enum(["available", "unavailable", "unknown"]).optional(),
  position: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { productId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  try {
    const product = await updateProduct(session.userId, productId, {
      ...parsed.data,
      price_cents: parsed.data.price_cents === null ? undefined : parsed.data.price_cents,
    });
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { productId } = await params;
  try {
    await deleteProduct(session.userId, productId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
