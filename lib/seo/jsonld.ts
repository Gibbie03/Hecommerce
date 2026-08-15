import type { Business, Product } from "@/lib/types";

export function buildLocalBusinessJsonLd(business: Business, products: Product[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description ?? undefined,
    url: siteUrl,
    telephone: business.phone ?? undefined,
    address: business.address
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address,
          addressLocality: business.city ?? undefined,
          addressRegion: business.state ?? undefined,
          addressCountry: "NG",
        }
      : undefined,
    makesOffer: products
      .filter((p) => p.price_cents !== null)
      .map((p) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Product", name: p.name, description: p.description ?? undefined },
        price: (p.price_cents as number) / 100,
        priceCurrency: p.currency,
        availability:
          p.availability === "available"
            ? "https://schema.org/InStock"
            : p.availability === "unavailable"
              ? "https://schema.org/OutOfStock"
              : undefined,
      })),
  };
}

/** Escapes `<` so a `</script>` sequence in data can't break out of the tag. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
