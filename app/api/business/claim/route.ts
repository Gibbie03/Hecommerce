import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createBusiness, claimBusiness, createProduct, addImageUrl, AuthorizationError } from "@/lib/business/mutations";
import type { Provenance } from "@/lib/types";

const openingHoursDaySchema = z.object({ open: z.string(), close: z.string(), closed: z.boolean() });

const businessSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  website: z.string().trim().url().max(2048).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  opening_hours: z.record(z.string(), openingHoursDaySchema).optional(),
  delivery_info: z.object({ available: z.boolean().optional(), fee: z.union([z.string(), z.number()]).optional(), note: z.string().optional() }).optional(),
});

const bodySchema = z.object({
  source: z.enum(["website", "manual", "match"]),
  matchedBusinessId: z.string().uuid().optional(),
  business: businessSchema.optional(),
  products: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(1000).optional(),
        price_cents: z.number().int().min(0).optional(),
        availability: z.enum(["available", "unavailable", "unknown"]).optional(),
      }),
    )
    .max(60)
    .optional(),
  images: z.array(z.string().url()).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const draft = parsed.data;

  try {
    let businessId: string;

    if (draft.source === "match") {
      if (!draft.matchedBusinessId) {
        return NextResponse.json({ error: "Missing business to claim." }, { status: 400 });
      }
      await claimBusiness(session.userId, draft.matchedBusinessId);
      businessId = draft.matchedBusinessId;
    } else {
      if (!draft.business) {
        return NextResponse.json({ error: "Missing business details." }, { status: 400 });
      }
      const provenance: Provenance = draft.source === "website" ? "imported" : "merchant_provided";
      const business = await createBusiness(
        session.userId,
        {
          ...draft.business,
          email: draft.business.email || undefined,
          website: draft.business.website || undefined,
        },
        provenance,
      );
      businessId = business.id;

      for (const product of draft.products ?? []) {
        await createProduct(session.userId, businessId, product, provenance);
      }
      for (const [index, url] of (draft.images ?? []).entries()) {
        await addImageUrl(session.userId, businessId, url, { isPrimary: index === 0 });
      }
    }

    return NextResponse.json({ ok: true, businessId });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Claim failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
