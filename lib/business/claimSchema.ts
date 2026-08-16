import { z } from "zod";

// The shape a claim/create submission takes, whether it arrives directly
// via POST /api/business/claim (existing OTP flow) or is carried as a
// magic-link's server-side continuation payload (lib/auth/magicLink.ts) —
// one schema, reused by both, so the two flows can never drift apart.

const openingHoursDaySchema = z.object({ open: z.string(), close: z.string(), closed: z.boolean() });

const businessDraftSchema = z.object({
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
  delivery_info: z
    .object({
      available: z.boolean().optional(),
      fee: z.union([z.string(), z.number()]).optional(),
      note: z.string().optional(),
    })
    .optional(),
});

export const claimDraftSchema = z.object({
  source: z.enum(["website", "manual", "match"]),
  matchedBusinessId: z.string().uuid().optional(),
  business: businessDraftSchema.optional(),
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

export type ClaimDraft = z.infer<typeof claimDraftSchema>;
