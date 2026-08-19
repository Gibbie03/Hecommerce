import { runAsAnon, runAsUser, type DbClient } from "@/lib/db/withAuth";
import type {
  Business,
  BusinessImage,
  BusinessMember,
  BusinessSource,
  Product,
  Review,
  VerificationRequest,
} from "@/lib/types";

// Row shapes from `pg` already match our snake_case TS types 1:1, including
// jsonb columns (node-postgres parses those automatically) — no mapping layer.

export async function getPublishedBusinessBySlug(slug: string): Promise<Business | null> {
  return runAsAnon(async (client) => {
    const { rows } = await client.query<Business>(
      `select * from businesses where slug = $1 and status = 'published'`,
      [slug],
    );
    return rows[0] ?? null;
  });
}

export async function incrementBusinessViewCount(slug: string): Promise<void> {
  await runAsAnon(async (client) => {
    await client.query(`select increment_business_view_count($1)`, [slug]);
  });
}

export async function getBusinessForMember(businessId: string, userId: string): Promise<Business | null> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<Business>(`select * from businesses where id = $1`, [businessId]);
    return rows[0] ?? null;
  });
}

export async function getMemberRole(businessId: string, userId: string): Promise<string | null> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<{ role: string }>(
      `select role from business_members where business_id = $1 and user_id = $2`,
      [businessId, userId],
    );
    return rows[0]?.role ?? null;
  });
}

export async function listMemberBusinesses(userId: string): Promise<Business[]> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<Business>(
      `select b.* from businesses b
       join business_members m on m.business_id = b.id
       where m.user_id = $1
       order by b.created_at desc`,
      [userId],
    );
    return rows;
  });
}

export async function findClaimableBusinesses(query: string): Promise<Business[]> {
  const like = `%${query.trim()}%`;
  return runAsAnon(async (client) => {
    const { rows } = await client.query<Business>(
      `select b.* from businesses b
       where b.status = 'published'
         and not exists (select 1 from business_members m where m.business_id = b.id)
         and (b.name ilike $1 or b.phone ilike $1 or b.whatsapp ilike $1)
       limit 10`,
      [like],
    );
    return rows;
  });
}

async function productsQuery(client: DbClient, businessId: string): Promise<Product[]> {
  const { rows } = await client.query<Product>(
    `select * from products where business_id = $1 order by position asc, created_at asc`,
    [businessId],
  );
  return rows;
}

export async function getPublishedProducts(businessId: string): Promise<Product[]> {
  return runAsAnon((client) => productsQuery(client, businessId));
}

export async function getMemberProducts(businessId: string, userId: string): Promise<Product[]> {
  return runAsUser(userId, (client) => productsQuery(client, businessId));
}

export interface BusinessSummary {
  id: string;
  slug: string;
  name: string;
}

export async function getPublishedProductById(
  productId: string,
): Promise<{ product: Product; business: BusinessSummary } | null> {
  return runAsAnon(async (client) => {
    const { rows } = await client.query<Product & { business_slug: string; business_name: string }>(
      `select p.*, b.slug as business_slug, b.name as business_name
       from products p join businesses b on b.id = p.business_id
       where p.id = $1 and b.status = 'published'`,
      [productId],
    );
    const row = rows[0];
    if (!row) return null;
    const { business_slug, business_name, ...product } = row;
    return {
      product,
      business: { id: product.business_id, slug: business_slug, name: business_name },
    };
  });
}

async function imagesQuery(client: DbClient, businessId: string): Promise<BusinessImage[]> {
  const { rows } = await client.query<BusinessImage>(
    `select * from business_images where business_id = $1 order by created_at asc`,
    [businessId],
  );
  return rows;
}

export async function getPublishedImages(businessId: string): Promise<BusinessImage[]> {
  return runAsAnon((client) => imagesQuery(client, businessId));
}

export async function getMemberImages(businessId: string, userId: string): Promise<BusinessImage[]> {
  return runAsUser(userId, (client) => imagesQuery(client, businessId));
}

export async function getPublishedReviews(businessId: string): Promise<Review[]> {
  return runAsAnon(async (client) => {
    const { rows } = await client.query<Review>(
      `select * from reviews where business_id = $1 order by created_at desc`,
      [businessId],
    );
    return rows;
  });
}

export async function getMemberReviews(businessId: string, userId: string): Promise<Review[]> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<Review>(
      `select * from reviews where business_id = $1 order by created_at desc`,
      [businessId],
    );
    return rows;
  });
}

export async function getMemberSources(businessId: string, userId: string): Promise<BusinessSource[]> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<BusinessSource>(
      `select * from business_sources where business_id = $1 order by created_at asc`,
      [businessId],
    );
    return rows;
  });
}

export async function getMemberVerificationRequests(
  businessId: string,
  userId: string,
): Promise<VerificationRequest[]> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<VerificationRequest>(
      `select * from verification_requests where business_id = $1 order by created_at desc`,
      [businessId],
    );
    return rows;
  });
}

export async function getMemberRoster(businessId: string, userId: string): Promise<BusinessMember[]> {
  return runAsUser(userId, async (client) => {
    const { rows } = await client.query<BusinessMember>(
      `select * from business_members where business_id = $1 order by created_at asc`,
      [businessId],
    );
    return rows;
  });
}

export async function searchPublishedBusinesses(query?: string): Promise<Business[]> {
  return runAsAnon(async (client) => {
    if (!query) {
      const { rows } = await client.query<Business[]>(
        `select * from businesses where status = 'published' order by created_at desc limit 20`,
      );
      return rows as unknown as Business[];
    }
    const like = `%${query.trim()}%`;
    const { rows } = await client.query<Business>(
      `select * from businesses
       where status = 'published'
         and (name ilike $1 or category ilike $1 or city ilike $1)
       order by created_at desc
       limit 20`,
      [like],
    );
    return rows;
  });
}

/** All published businesses for machine-readable discovery feeds. */
export async function listPublishedBusinesses(): Promise<Business[]> {
  return runAsAnon(async (client) => {
    const { rows } = await client.query<Business>(
      `select * from businesses where status = 'published' order by created_at desc`,
    );
    return rows;
  });
}
