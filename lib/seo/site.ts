const PRODUCTION_SITE_URL = "https://www.icommerce.name.ng";

/**
 * Returns the canonical public origin for the current deployment.
 * Production uses APP_URL when configured; preview deployments fall back to
 * Vercel's deployment URL so generated metadata and feeds remain absolute.
 */
export function getSiteUrl(): string {
  const configured = process.env.APP_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();
  const raw = configured || (vercel ? `https://${vercel}` : PRODUCTION_SITE_URL);
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return new URL(path.startsWith("/") ? path : `/${path}`, `${getSiteUrl()}/`).toString();
}
