import { formatPrice, formatRelativeTime } from "@/lib/format";
import { isOpenNow, todayHoursLabel } from "@/lib/business/hours";
import type { Business, Product } from "@/lib/types";

const FALLBACK = "I don't have reliable information about that yet.";

/**
 * Answers strictly from the business record via keyword/intent matching —
 * deliberately not an LLM call, so it cannot invent facts. Anything it
 * can't match, or that the record doesn't know, gets the same honest
 * fallback line rather than a guess.
 */
export function answerQuestion(question: string, business: Business, products: Product[]): string {
  const q = question.toLowerCase();

  const matchedProduct = products.find((p) => q.includes(p.name.toLowerCase()));
  const asksPrice = /\b(how much|price|cost)\b/.test(q);
  if (asksPrice && matchedProduct) {
    if (matchedProduct.price_cents === null) {
      return `The price of ${matchedProduct.name} is currently unknown.`;
    }
    const updated = matchedProduct.price_updated_at
      ? ` (updated ${formatRelativeTime(matchedProduct.price_updated_at)})`
      : "";
    return `${matchedProduct.name} is ${formatPrice(matchedProduct.price_cents, matchedProduct.currency)}${updated}.`;
  }

  if (/\b(what.*sell|what.*offer|products|menu|services)\b/.test(q)) {
    if (products.length === 0) return "No products have been listed yet.";
    return `${business.name} offers: ${products.map((p) => p.name).join(", ")}.`;
  }

  if (/\b(where|located|location|address)\b/.test(q)) {
    if (business.address) return `${business.name} is located at ${business.address}.`;
    if (business.city || business.state) {
      return `${business.name} is located in ${[business.city, business.state].filter(Boolean).join(", ")}.`;
    }
    return FALLBACK;
  }

  if (/\b(open|hours|closed)\b/.test(q)) {
    const open = isOpenNow(business.opening_hours);
    if (open === null) return "Opening hours aren't available.";
    const todayLabel = todayHoursLabel(business.opening_hours);
    return open ? `Yes, ${business.name} is open now (${todayLabel}).` : `${business.name} is currently closed. Today's hours: ${todayLabel}.`;
  }

  if (/\b(contact|reach|whatsapp|call|phone|number)\b/.test(q)) {
    const methods: string[] = [];
    if (business.whatsapp) methods.push(`WhatsApp at ${business.whatsapp}`);
    if (business.phone) methods.push(`phone at ${business.phone}`);
    if (methods.length === 0) return FALLBACK;
    return `You can reach ${business.name} via ${methods.join(" or ")}.`;
  }

  if (/\b(deliver|delivery)\b/.test(q)) {
    if (business.delivery_info?.available === true) {
      return `Yes, ${business.name} offers delivery.${business.delivery_info.note ? ` ${business.delivery_info.note}` : ""}`;
    }
    if (business.delivery_info?.available === false) {
      return `No, ${business.name} does not currently offer delivery.`;
    }
    return FALLBACK;
  }

  return FALLBACK;
}
