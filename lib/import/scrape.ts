import { lookup as dnsLookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import type { SourceType } from "@/lib/types";

export interface ScrapedProduct {
  name: string;
  description?: string;
  price_cents?: number;
  image?: string;
}

export interface ScrapedBusiness {
  name?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  images: string[];
  socialLinks: { type: SourceType; value: string }[];
  products: ScrapedProduct[];
  fieldsFound: number;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Rejects loopback/private/link-local/reserved IPv4 and IPv6 addresses.
 * Used both on the literal hostname (catches "http://127.0.0.1/...") and on
 * every address the hostname actually resolves to (catches a hostname that
 * doesn't *look* internal but has a DNS record pointing at one — the
 * hostname-string check alone doesn't see through that).
 */
function isPrivateOrReservedIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const octets = v4.slice(1, 5).map(Number);
    if (octets.some((o) => o > 255)) return true; // malformed — reject rather than risk misparsing
    const [a, b] = octets as [number, number, number, number];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
    if (a === 0) return true; // "this" network
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("::ffff:")) return isPrivateOrReservedIp(lower.slice(7)); // IPv4-mapped
  const firstGroup = lower.split(":")[0] ?? "";
  if (/^fe[89ab][0-9a-f]$/.test(firstGroup)) return true; // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}$/.test(firstGroup)) return true; // fc00::/7 unique local
  return false;
}

/**
 * SSRF guard: rejects private/internal targets before this server makes an
 * outbound request to a URL a merchant typed in. Checks the literal
 * hostname AND every address it resolves to (a hostname that doesn't look
 * internal can still have a DNS record pointing at one — proven during a
 * security audit by resolving a normal-looking hostname straight at
 * 127.0.0.1 and reading back an internal-only service's content). Not
 * proof against DNS rebinding (the address could change between this check
 * and fetch()'s own resolution) — a production deployment should route
 * this through an egress-restricted fetcher pinned to a checked IP, per
 * SECURITY_RULES.md §9/§11.
 */
async function assertPubliclyRoutable(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are supported");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local") || isPrivateOrReservedIp(host)) {
    throw new Error("That URL can't be imported");
  }

  let addresses;
  try {
    addresses = await dnsLookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("Couldn't resolve that host");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    throw new Error("That URL can't be imported");
  }
}

function absoluteUrl(src: string | undefined, base: string): string | undefined {
  if (!src) return undefined;
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
}

function parsePrice(raw: unknown): number | undefined {
  const value = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (Number.isNaN(value) || value < 0) return undefined;
  return Math.round(value * 100);
}

export async function scrapeWebsite(inputUrl: string): Promise<ScrapedBusiness> {
  const url = new URL(inputUrl.trim());
  await assertPubliclyRoutable(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      // Manual, not "follow": a redirect target isn't covered by the
      // publicly-routable check above, and following it automatically was
      // a proven SSRF bypass (an allowed public host 302-ing to an
      // internal address). Reject redirects outright instead of chasing
      // and re-validating each hop.
      redirect: "manual",
      headers: { "User-Agent": "IcommerceBot/0.1 (+https://icommerce.ng)" },
    });
    if (res.status >= 300 && res.status < 400) {
      throw new Error("That site redirects, which isn't supported for import yet.");
    }
    if (!res.ok) throw new Error(`Site responded with ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) {
      html = await res.text();
    } else {
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > MAX_BYTES) throw new Error("Page too large to import");
        chunks.push(value);
      }
      html = Buffer.concat(chunks).toString("utf-8");
    }
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);
  const base = url.toString();

  const name =
    $('meta[property="og:site_name"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    undefined;

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    undefined;

  const phoneHref = $('a[href^="tel:"]').first().attr("href");
  const phone = phoneHref?.replace(/^tel:/, "").trim() || undefined;

  const waHref = $('a[href*="wa.me"], a[href*="whatsapp.com"]').first().attr("href");
  const whatsappMatch = waHref?.match(/(?:wa\.me\/|phone=)(\d+)/);
  const whatsapp = whatsappMatch?.[1] ? `+${whatsappMatch[1]}` : undefined;

  const images = new Set<string>();
  const ogImage = absoluteUrl($('meta[property="og:image"]').attr("content"), base);
  if (ogImage) images.add(ogImage);

  const socialLinks: ScrapedBusiness["socialLinks"] = [];
  const seenSocialTypes = new Set<SourceType>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = absoluteUrl(href, base);
    if (!abs) return;
    if (abs.includes("instagram.com") && !seenSocialTypes.has("instagram")) {
      socialLinks.push({ type: "instagram", value: abs });
      seenSocialTypes.add("instagram");
    } else if (abs.includes("facebook.com") && !seenSocialTypes.has("facebook")) {
      socialLinks.push({ type: "facebook", value: abs });
      seenSocialTypes.add("facebook");
    }
  });

  let address: string | undefined;
  const products: ScrapedProduct[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const type = obj["@type"];
      const types = Array.isArray(type) ? type : [type];

      if (types.some((t) => typeof t === "string" && ["LocalBusiness", "Restaurant", "Organization", "Store"].includes(t))) {
        const addr = obj.address;
        if (typeof addr === "string") address ??= addr;
        else if (addr && typeof addr === "object") {
          const a = addr as Record<string, unknown>;
          const parts = [a.streetAddress, a.addressLocality, a.addressRegion].filter(
            (p): p is string => typeof p === "string",
          );
          if (parts.length > 0) address ??= parts.join(", ");
        }
        const img = absoluteUrl(typeof obj.image === "string" ? obj.image : undefined, base);
        if (img) images.add(img);
      }

      if (types.some((t) => t === "Product")) {
        const productName = typeof obj.name === "string" ? obj.name : undefined;
        if (!productName) continue;
        const offers = obj.offers as Record<string, unknown> | undefined;
        const price = parsePrice(offers?.price);
        const img = absoluteUrl(typeof obj.image === "string" ? obj.image : undefined, base);
        products.push({
          name: productName,
          description: typeof obj.description === "string" ? obj.description : undefined,
          price_cents: price,
          image: img,
        });
      }
    }
  });

  for (const product of products) {
    if (product.image) images.add(product.image);
  }

  const fieldsFound =
    [name, description, phone, whatsapp, address].filter(Boolean).length +
    images.size +
    products.length +
    socialLinks.length;

  return {
    name,
    description,
    phone,
    whatsapp,
    address,
    images: Array.from(images).slice(0, 12),
    socialLinks,
    products: products.slice(0, 30),
    fieldsFound,
  };
}
