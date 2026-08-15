import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateBusiness, AuthorizationError, NotFoundError } from "@/lib/business/mutations";

const openingHoursDaySchema = z.object({ open: z.string(), close: z.string(), closed: z.boolean() });

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(320).optional(),
  website: z.string().trim().url().max(2048).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  policies: z.string().trim().max(2000).optional(),
  opening_hours: z.record(z.string(), openingHoursDaySchema).optional(),
  delivery_info: z
    .object({
      available: z.boolean().optional(),
      fee: z.union([z.string(), z.number()]).optional(),
      note: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { businessId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  try {
    const business = await updateBusiness(session.userId, businessId, parsed.data, "merchant_provided");
    return NextResponse.json({ ok: true, business });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    console.error("Business update failed", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
