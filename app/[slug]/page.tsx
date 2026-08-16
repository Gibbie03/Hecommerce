import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublishedBusinessBySlug,
  getPublishedProducts,
  getPublishedImages,
  getPublishedReviews,
  incrementBusinessViewCount,
} from "@/lib/business/queries";
import { ProductCard } from "@/components/business/ProductCard";
import { StatusDot } from "@/components/business/StatusDot";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { Badge } from "@/components/ui/Badge";
import { isOpenNow, DAY_LABELS, ORDERED_DAY_KEYS } from "@/lib/business/hours";
import { formatRelativeTime } from "@/lib/format";
import { buildLocalBusinessJsonLd, safeJsonLd } from "@/lib/seo/jsonld";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublishedBusinessBySlug(slug);
  if (!business) return {};
  return {
    title: `${business.name} | Icommerce`,
    description: business.description ?? `${business.name} on Icommerce.`,
  };
}

export default async function BusinessSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getPublishedBusinessBySlug(slug);
  if (!business) notFound();

  await incrementBusinessViewCount(slug);

  const [products, images, reviews] = await Promise.all([
    getPublishedProducts(business.id),
    getPublishedImages(business.id),
    getPublishedReviews(business.id),
  ]);

  const logo = images.find((img) => !img.product_id);
  const imageByProduct = new Map(images.filter((img) => img.product_id).map((img) => [img.product_id, img.url]));
  const open = isOpenNow(business.opening_hours);

  // Falls back to Vercel's auto-injected deployment URL so preview builds
  // get a correct absolute URL in the JSON-LD without needing APP_URL set
  // per-deploy (preview URLs are dynamic) — see docs/PRODUCTION_DEPLOYMENT.md.
  const baseUrl =
    process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const siteUrl = `${baseUrl}/${business.slug}`;
  const jsonLd = buildLocalBusinessJsonLd(business, products, siteUrl);

  return (
    <main className="min-h-screen bg-paper pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div className="h-48 w-full bg-paper-dim sm:h-64">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.url} alt={business.name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <div className="-mt-10 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-ink">{business.name}</h1>
                <VerificationBadge status={business.verification_status} />
              </div>
              <p className="mt-1 text-muted">{business.category ?? "Business"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink">
                {(business.city || business.state) && (
                  <span>📍 {[business.address, business.city, business.state].filter(Boolean).join(", ")}</span>
                )}
                <StatusDot open={open} />
              </div>
            </div>
            <div className="flex gap-2">
              {business.whatsapp && (
                <a
                  href={`https://wa.me/${business.whatsapp.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light"
                >
                  WhatsApp
                </a>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:border-ink/40"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink">Products</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} imageUrl={imageByProduct.get(product.id)} />
              ))}
            </div>
          </section>
        )}

        {business.description && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{business.description}</p>
          </section>
        )}

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold text-ink">Opening hours</h2>
            <div className="mt-2 space-y-1 text-sm">
              {Object.keys(business.opening_hours ?? {}).length === 0 ? (
                <p className="text-muted">Unknown</p>
              ) : (
                ORDERED_DAY_KEYS.map((day) => {
                  const value = business.opening_hours?.[day];
                  return (
                    <div key={day} className="flex justify-between text-ink">
                      <span className="text-muted">{DAY_LABELS[day]}</span>
                      <span>{!value || value.closed ? "Closed" : `${value.open} – ${value.close}`}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Delivery</h2>
            <p className="mt-2 text-sm text-muted">
              {business.delivery_info?.available === true
                ? `Available${business.delivery_info.note ? ` — ${business.delivery_info.note}` : ""}`
                : business.delivery_info?.available === false
                  ? "Not available"
                  : "Unknown"}
            </p>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No reviews yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{review.author_name}</p>
                    <span className="text-sm text-amber">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.body && <p className="mt-1 text-sm text-muted">{review.body}</p>}
                  <p className="mt-1 text-xs text-muted">{formatRelativeTime(review.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <div className="mt-2 space-y-1 text-sm text-ink">
            {business.phone && <p>📞 {business.phone}</p>}
            {business.whatsapp && <p>💬 {business.whatsapp}</p>}
            {business.email && <p>✉️ {business.email}</p>}
            {!business.phone && !business.whatsapp && !business.email && <p className="text-muted">Unknown</p>}
          </div>
        </section>

        {business.policies && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-ink">Policies</h2>
            <p className="mt-2 text-sm text-muted">{business.policies}</p>
          </section>
        )}

        <section className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
          {business.verification_status === "verified" && <Badge tone="verified">Business verified</Badge>}
          <Badge tone="neutral">Prices provided by merchant</Badge>
          <Badge tone="neutral">Information recently updated</Badge>
        </section>
      </div>
    </main>
  );
}
