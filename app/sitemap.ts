import type { MetadataRoute } from "next";
import { listPublishedBusinesses } from "@/lib/business/queries";
import { absoluteUrl } from "@/lib/seo/site";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const businesses = await listPublishedBusinesses();

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/businesses"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...businesses.map((business) => ({
      url: absoluteUrl(`/${business.slug}`),
      lastModified: new Date(business.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
