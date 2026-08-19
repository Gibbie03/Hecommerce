import type { Metadata } from "next";
import Link from "next/link";
import { searchPublishedBusinesses } from "@/lib/business/queries";
import { absoluteUrl } from "@/lib/seo/site";
import { safeJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Businesses | Icommerce",
  description:
    "Discover published businesses on Icommerce. Browse businesses and products that are readable to search engines and AI agents.",
  alternates: { canonical: absoluteUrl("/businesses") },
};

export default async function BusinessesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const businesses = await searchPublishedBusinesses(query || undefined);
  const directoryUrl = absoluteUrl("/businesses");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Businesses | Icommerce",
    url: directoryUrl,
    description:
      "Published businesses on Icommerce that can be discovered and understood by search engines and AI agents.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: businesses.length,
      itemListElement: businesses.map((business, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: business.name,
        url: absoluteUrl(`/${business.slug}`),
      })),
    },
  };

  return (
    <main className="min-h-screen bg-paper pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
            Icommerce
          </Link>
          <Link href="/onboarding" className="text-sm font-medium text-ink hover:underline">
            List my business
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pt-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Discover businesses</h1>
          <p className="mt-3 text-muted">
            Browse published businesses on Icommerce. Every listing has a public page that can be read by people,
            search engines, and AI agents.
          </p>
        </div>

        <form action="/businesses" className="mt-8 flex max-w-2xl gap-3">
          <label htmlFor="business-search" className="sr-only">
            Search businesses
          </label>
          <input
            id="business-search"
            name="q"
            defaultValue={query}
            placeholder="Search by business, category, or city"
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
          />
          <button
            type="submit"
            className="rounded-xl bg-forest px-5 py-3 text-sm font-medium text-paper hover:bg-forest-light"
          >
            Search
          </button>
        </form>

        <section className="mt-10" aria-labelledby="published-businesses">
          <div className="flex items-center justify-between gap-4">
            <h2 id="published-businesses" className="text-lg font-semibold text-ink">
              {query ? `Results for “${query}”` : "Published businesses"}
            </h2>
            <span className="text-sm text-muted">{businesses.length} shown</span>
          </div>

          {businesses.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-line bg-white p-8 text-sm text-muted">
              No published businesses matched that search.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {businesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/${business.slug}`}
                  className="rounded-2xl border border-line bg-white p-6 transition hover:border-ink/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-ink">{business.name}</h3>
                      <p className="mt-1 text-sm text-muted">{business.category ?? "Business"}</p>
                    </div>
                    {business.verification_status === "verified" && (
                      <span className="shrink-0 rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink">
                        Verified
                      </span>
                    )}
                  </div>
                  {(business.city || business.state) && (
                    <p className="mt-4 text-sm text-muted">
                      {[business.city, business.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {business.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{business.description}</p>
                  )}
                  <p className="mt-5 text-sm font-medium text-ink">View business →</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
