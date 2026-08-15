import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { Business, Product } from "@/lib/types";

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] as string;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function priceSourcePhrase(source: Product["price_source"]): string {
  switch (source) {
    case "merchant_provided":
    case "merchant_confirmed":
      return "The price was provided by the merchant";
    case "imported":
      return "The price was imported from the business's website";
    case "verified":
      return "The price has been verified";
    case "third_party":
      return "The price comes from a third-party source";
    default:
      return "The source of this price is unknown";
  }
}

/**
 * Composes a natural-language summary strictly from structured business
 * data — no external model call, so it cannot state anything that isn't in
 * the record. Missing or uncertain fields are named as such rather than
 * omitted, per the spec's "never hide uncertainty" rule.
 */
export function generateAiView(business: Business, products: Product[]): string {
  const sentences: string[] = [];

  const categoryPhrase = business.category ? business.category.toLowerCase() : "business";
  const verifiedPrefix = business.verification_status === "verified" ? "verified " : "";
  const location = [business.city, business.state].filter(Boolean).join(", ");
  sentences.push(
    `${business.name} is a ${verifiedPrefix}${categoryPhrase}${location ? ` located in ${location}` : ""}.`,
  );
  if (business.verification_status !== "verified") {
    sentences.push("This business has not yet been verified.");
  }

  if (products.length > 0) {
    sentences.push(`It offers ${joinList(products.map((p) => p.name))}.`);

    for (const product of products) {
      if (product.price_cents !== null) {
        const updated = product.price_updated_at
          ? ` and was last updated ${formatRelativeTime(product.price_updated_at)}`
          : "";
        sentences.push(
          `${product.name} is listed at ${formatPrice(product.price_cents, product.currency)}. ${priceSourcePhrase(product.price_source)}${updated}.`,
        );
      } else {
        sentences.push(`The price of ${product.name} is currently unknown.`);
      }

      if (product.availability === "unknown") {
        sentences.push(`Availability of ${product.name} is currently unknown.`);
      } else if (product.availability === "unavailable") {
        sentences.push(`${product.name} is currently unavailable.`);
      }
    }
  } else {
    sentences.push("No products have been listed yet.");
  }

  const contactMethods: string[] = [];
  if (business.whatsapp) contactMethods.push("WhatsApp");
  if (business.phone) contactMethods.push("phone");
  sentences.push(
    contactMethods.length > 0
      ? `Customers can contact the business through ${joinList(contactMethods)}.`
      : "No verified contact method is currently available.",
  );

  if (business.delivery_info?.available === true) {
    sentences.push("This business offers delivery.");
  } else if (business.delivery_info?.available === false) {
    sentences.push("This business does not offer delivery.");
  } else {
    sentences.push("Delivery availability is currently unknown.");
  }

  return sentences.join(" ");
}
