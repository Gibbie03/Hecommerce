import { formatPrice } from "@/lib/format";
import { isOpenNow } from "@/lib/business/hours";
import type { Business, Product, Review } from "@/lib/types";

export function serializeBusiness(business: Business) {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    category: business.category,
    description: business.description,
    verification: {
      status: business.verification_status,
      method: business.verification_method,
      verified_at: business.verified_at,
    },
    location: {
      address: business.address,
      city: business.city,
      state: business.state,
    },
    contact: {
      phone: business.phone,
      whatsapp: business.whatsapp,
      email: business.email,
      website: business.website,
    },
    opening_hours: business.opening_hours,
    open_now: isOpenNow(business.opening_hours),
    delivery: business.delivery_info,
    policies: business.policies,
    ai_ready_score: business.ai_ready_score,
    url: `/${business.slug}`,
  };
}

export function serializeProduct(product: Product) {
  return {
    id: product.id,
    business_id: product.business_id,
    name: product.name,
    description: product.description,
    offer: {
      price_cents: product.price_cents,
      formatted_price: formatPrice(product.price_cents, product.currency),
      currency: product.currency,
      price_source: product.price_source,
      price_updated_at: product.price_updated_at,
      availability: product.availability,
      availability_source: product.availability_source,
      availability_updated_at: product.availability_updated_at,
    },
  };
}

export function serializeReview(review: Review) {
  return {
    id: review.id,
    author_name: review.author_name,
    rating: review.rating,
    body: review.body,
    created_at: review.created_at,
  };
}
