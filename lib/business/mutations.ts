import { randomInt, createHash } from "node:crypto";
import { runAsUser } from "@/lib/db/withAuth";
import { one } from "@/lib/db/util";
import { slugify } from "@/lib/format";
import { computeReadiness } from "@/lib/business/readiness";
import { sendBusinessVerificationEmail } from "@/lib/email/resend";
import { sendBusinessVerificationSms } from "@/lib/sms/twilio";
import type {
  Business,
  DeliveryInfo,
  OpeningHours,
  Product,
  ProductAvailability,
  Provenance,
  SourceType,
  VerificationMethod,
} from "@/lib/types";

export class AuthorizationError extends Error {}
export class NotFoundError extends Error {}

function isRlsViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "42501";
}

// ============================================================
// Business
// ============================================================

export interface CreateBusinessInput {
  name: string;
  category?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  city?: string;
  state?: string;
  address?: string;
  opening_hours?: OpeningHours;
  delivery_info?: DeliveryInfo;
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
  provenance: Provenance = "merchant_provided",
): Promise<Business> {
  const baseSlug = slugify(input.name) || "business";

  return runAsUser(userId, async (client) => {
    let slug = baseSlug;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const { rows: existing } = await client.query(`select 1 from businesses where slug = $1`, [slug]);
      if (existing.length === 0) break;
      slug = `${baseSlug}-${randomInt(1000, 9999)}`;
    }

    const { rows } = await client.query<Business>(
      `insert into businesses (
         slug, name, category, description, phone, whatsapp, email, website,
         city, state, address, opening_hours, delivery_info, field_provenance
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning *`,
      [
        slug,
        input.name,
        input.category ?? null,
        input.description ?? null,
        input.phone ?? null,
        input.whatsapp ?? null,
        input.email ?? null,
        input.website ?? null,
        input.city ?? null,
        input.state ?? null,
        input.address ?? null,
        JSON.stringify(input.opening_hours ?? {}),
        JSON.stringify(input.delivery_info ?? {}),
        JSON.stringify(
          Object.fromEntries(
            (
              ["category", "description", "phone", "whatsapp", "email", "city", "state", "address"] as const
            )
              .filter((f) => Boolean(input[f as keyof CreateBusinessInput]))
              .map((f) => [f, { source: provenance, updated_at: new Date().toISOString() }]),
          ),
        ),
      ],
    );

    const business = one(rows, "Failed to create business");
    await client.query(
      `insert into business_members (business_id, user_id, role) values ($1, $2, 'owner')`,
      [business.id, userId],
    );

    return business;
  });
}

export async function claimBusiness(userId: string, businessId: string): Promise<void> {
  try {
    await runAsUser(userId, async (client) => {
      await client.query(
        `insert into business_members (business_id, user_id, role) values ($1, $2, 'owner')`,
        [businessId, userId],
      );
    });
  } catch (err) {
    if (isRlsViolation(err)) {
      throw new AuthorizationError("This business has already been claimed.");
    }
    throw err;
  }
}

const EDITABLE_BUSINESS_FIELDS = [
  "name",
  "category",
  "description",
  "phone",
  "whatsapp",
  "email",
  "website",
  "address",
  "city",
  "state",
  "opening_hours",
  "delivery_info",
  "policies",
] as const;
type EditableBusinessField = (typeof EDITABLE_BUSINESS_FIELDS)[number];

export type BusinessUpdateInput = Partial<{
  name: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  opening_hours: OpeningHours;
  delivery_info: DeliveryInfo;
  policies: string;
}>;

const JSONB_FIELDS = new Set(["opening_hours", "delivery_info"]);

export async function updateBusiness(
  userId: string,
  businessId: string,
  input: BusinessUpdateInput,
  provenance: Provenance = "merchant_provided",
): Promise<Business> {
  const fields = (Object.keys(input) as EditableBusinessField[]).filter((f) =>
    EDITABLE_BUSINESS_FIELDS.includes(f),
  );
  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const now = new Date().toISOString();
  const provenanceUpdate: Record<string, { source: Provenance; updated_at: string }> = {};

  for (const field of fields) {
    setClauses.push(`${field} = $${i}`);
    const value = input[field];
    values.push(JSONB_FIELDS.has(field) ? JSON.stringify(value) : value);
    provenanceUpdate[field] = { source: provenance, updated_at: now };
    i += 1;
  }

  values.push(JSON.stringify(provenanceUpdate));
  const provenanceIdx = i++;
  values.push(businessId);
  const idIdx = i;

  try {
    return await runAsUser(userId, async (client) => {
      const { rows } = await client.query<Business>(
        `update businesses
         set ${setClauses.join(", ")}, field_provenance = field_provenance || $${provenanceIdx}::jsonb, updated_at = now()
         where id = $${idIdx}
         returning *`,
        values,
      );
      return one(rows, "Business not found", NotFoundError);
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't edit this business.");
    throw err;
  }
}

/**
 * Re-stamps every field currently tagged `imported` as `merchant_confirmed`,
 * without changing the underlying values — the "merchant reviewed an
 * imported value and confirmed it's correct" state from the spec, distinct
 * from `merchant_provided` (the merchant typed/changed the value).
 */
export async function confirmImportedFields(userId: string, businessId: string): Promise<Business> {
  try {
    return await runAsUser(userId, async (client) => {
      const { rows } = await client.query<Business>(
        `update businesses
         set field_provenance = coalesce((
           select jsonb_object_agg(
             key,
             case when value ->> 'source' = 'imported'
               then jsonb_build_object('source', 'merchant_confirmed', 'updated_at', now())
               else value
             end
           )
           from jsonb_each(field_provenance)
         ), '{}'::jsonb),
         updated_at = now()
         where id = $1
         returning *`,
        [businessId],
      );
      return one(rows, "Business not found", NotFoundError);
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't edit this business.");
    throw err;
  }
}

export class VerificationRequiredError extends Error {}

export async function publishBusiness(userId: string, businessId: string): Promise<Business> {
  return runAsUser(userId, async (client) => {
    const { rows: businessRows } = await client.query<Business>(`select * from businesses where id = $1`, [
      businessId,
    ]);
    const currentBusiness = one(businessRows, "Business not found", NotFoundError);

    // Verification is the whole reason a business's claims are meant to be
    // trustworthy to AI agents (per the build spec's own "Trust Model" and
    // Claim -> Verify -> Review -> Publish order) — publishing a business
    // that never even attempted verification would let anyone stand up a
    // public, agent-discoverable listing under any name (e.g. impersonating
    // a real company) with nothing to distinguish it from a legitimate one
    // except a field most consumers of the data won't think to check.
    // `pending` (e.g. manual review requested but not yet resolved) is
    // still allowed through, since that's an intentional, supported path.
    if (currentBusiness.verification_status === "unverified") {
      throw new VerificationRequiredError(
        "Request verification before publishing — an unverified business can't go live.",
      );
    }

    const { rows: products } = await client.query<Product>(`select * from products where business_id = $1`, [
      businessId,
    ]);
    const { rows: images } = await client.query(`select id from business_images where business_id = $1`, [
      businessId,
    ]);

    const readiness = computeReadiness(currentBusiness, products, images);

    const { rows } = await client.query<Business>(
      `update businesses set status = 'published', ai_ready_score = $1, updated_at = now() where id = $2 returning *`,
      [readiness.percent, businessId],
    );
    return one(rows, "You can't publish this business.", AuthorizationError);
  });
}

// ============================================================
// Products
// ============================================================

export interface ProductInput {
  name: string;
  description?: string;
  price_cents?: number | null;
  currency?: string;
  availability?: ProductAvailability;
  position?: number;
}

export async function createProduct(
  userId: string,
  businessId: string,
  input: ProductInput,
  source: Provenance = "merchant_provided",
): Promise<Product> {
  const now = new Date().toISOString();
  try {
    return await runAsUser(userId, async (client) => {
      const { rows } = await client.query<Product>(
        `insert into products (
           business_id, name, description, price_cents, currency, availability,
           price_source, availability_source, price_updated_at, availability_updated_at, position
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning *`,
        [
          businessId,
          input.name,
          input.description ?? null,
          input.price_cents ?? null,
          input.currency ?? "NGN",
          input.availability ?? "unknown",
          input.price_cents !== undefined ? source : "unknown",
          input.availability ? source : "unknown",
          input.price_cents !== undefined ? now : null,
          input.availability ? now : null,
          input.position ?? 0,
        ],
      );
      return one(rows, "Failed to create product");
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't add products to this business.");
    throw err;
  }
}

export async function updateProduct(
  userId: string,
  productId: string,
  input: Partial<ProductInput>,
): Promise<Product> {
  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    setClauses.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    setClauses.push(`description = $${i++}`);
    values.push(input.description);
  }
  if (input.price_cents !== undefined) {
    setClauses.push(`price_cents = $${i++}`, `price_source = 'merchant_provided'`, `price_updated_at = $${i++}`);
    values.push(input.price_cents, now);
  }
  if (input.availability !== undefined) {
    setClauses.push(
      `availability = $${i++}`,
      `availability_source = 'merchant_provided'`,
      `availability_updated_at = $${i++}`,
    );
    values.push(input.availability, now);
  }
  if (input.currency !== undefined) {
    setClauses.push(`currency = $${i++}`);
    values.push(input.currency);
  }
  if (input.position !== undefined) {
    setClauses.push(`position = $${i++}`);
    values.push(input.position);
  }

  if (setClauses.length === 0) throw new Error("No valid fields to update");

  values.push(productId);
  const idIdx = i;

  try {
    return await runAsUser(userId, async (client) => {
      const { rows } = await client.query<Product>(
        `update products set ${setClauses.join(", ")}, updated_at = now() where id = $${idIdx} returning *`,
        values,
      );
      return one(rows, "Product not found or not authorized", NotFoundError);
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't edit this product.");
    throw err;
  }
}

/**
 * Attaches an already-hosted image URL (e.g. scraped from an imported
 * website) without writing a local file — distinct from the /api/uploads
 * route, which is for merchant-supplied photos.
 */
export async function addImageUrl(
  userId: string,
  businessId: string,
  url: string,
  options: { productId?: string; isPrimary?: boolean } = {},
): Promise<void> {
  try {
    await runAsUser(userId, async (client) => {
      await client.query(
        `insert into business_images (business_id, product_id, url, is_primary) values ($1, $2, $3, $4)`,
        [businessId, options.productId ?? null, url, options.isPrimary ?? false],
      );
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't add images to this business.");
    throw err;
  }
}

export async function deleteProduct(userId: string, productId: string): Promise<void> {
  await runAsUser(userId, async (client) => {
    const { rowCount } = await client.query(`delete from products where id = $1`, [productId]);
    if (rowCount === 0) throw new NotFoundError("Product not found or not authorized");
  });
}

// ============================================================
// Sources
// ============================================================

export async function connectSource(
  userId: string,
  businessId: string,
  type: SourceType,
  value: string,
): Promise<void> {
  try {
    await runAsUser(userId, async (client) => {
      await client.query(
        `insert into business_sources (business_id, type, value, status)
         values ($1, $2, $3, 'connected')
         on conflict (business_id, type) do update set value = excluded.value, status = 'connected'`,
        [businessId, type, value],
      );
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't manage sources for this business.");
    throw err;
  }
}

// ============================================================
// Verification
// ============================================================

const VERIFICATION_CODE_TTL_MINUTES = 10;

function generateCode(): string {
  return Array.from({ length: 6 }, () => randomInt(0, 10)).join("");
}

function hashVerificationCode(businessId: string, code: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${businessId}:${code}:${pepper}`).digest("hex");
}

export async function requestManualVerification(userId: string, businessId: string): Promise<void> {
  try {
    await runAsUser(userId, async (client) => {
      await client.query(
        `insert into verification_requests (business_id, method, status, requested_by)
         values ($1, 'manual', 'pending', $2)`,
        [businessId, userId],
      );
      await client.query(
        `update businesses set verification_status = 'pending', verification_method = 'manual' where id = $1`,
        [businessId],
      );
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't request verification for this business.");
    throw err;
  }
}

export type ChannelVerificationMethod = "email" | "phone";

export async function requestChannelVerification(
  userId: string,
  businessId: string,
  method: ChannelVerificationMethod,
  target: string,
  businessName: string,
): Promise<{ delivered: boolean }> {
  const code = generateCode();
  const codeHash = hashVerificationCode(businessId, code);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  try {
    await runAsUser(userId, async (client) => {
      await client.query(
        `insert into verification_requests (business_id, method, status, code_hash, target, expires_at, requested_by)
         values ($1, $2, 'pending', $3, $4, $5, $6)`,
        [businessId, method, codeHash, target, expiresAt, userId],
      );
      await client.query(`update businesses set verification_status = 'pending', verification_method = $2 where id = $1`, [
        businessId,
        method,
      ]);
    });
  } catch (err) {
    if (isRlsViolation(err)) throw new AuthorizationError("You can't request verification for this business.");
    throw err;
  }

  const result =
    method === "email"
      ? await sendBusinessVerificationEmail(target, code, businessName)
      : await sendBusinessVerificationSms(target, code, businessName);
  return { delivered: result.sent };
}

export async function confirmChannelVerification(
  userId: string,
  businessId: string,
  method: ChannelVerificationMethod,
  code: string,
): Promise<boolean> {
  const codeHash = hashVerificationCode(businessId, code);

  return runAsUser(userId, async (client) => {
    const { rows } = await client.query(
      `update verification_requests
       set status = 'verified', verified_at = now()
       where id = (
         select id from verification_requests
         where business_id = $1 and method = $2 and code_hash = $3
           and status = 'pending' and expires_at > now()
         order by created_at desc
         limit 1
       )
       returning id`,
      [businessId, method, codeHash],
    );

    if (rows.length === 0) return false;

    await client.query(
      `update businesses set verification_status = 'verified', verification_method = $2, verified_at = now() where id = $1`,
      [businessId, method],
    );
    return true;
  });
}

export function unimplementedVerificationMethodMessage(method: VerificationMethod): string {
  return `${method === "whatsapp" ? "WhatsApp" : "Business document"} verification requires provider setup and isn't available yet. Use email, phone, or manual review for now.`;
}
