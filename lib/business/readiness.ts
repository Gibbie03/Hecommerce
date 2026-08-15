import type { Business, BusinessImage, Product } from "@/lib/types";

export interface ReadinessCheck {
  key: string;
  label: string;
  met: boolean;
}

export interface Readiness {
  percent: number;
  checks: ReadinessCheck[];
}

export function computeReadiness(
  business: Pick<Business, "verification_status" | "phone" | "whatsapp" | "email" | "address" | "city" | "state" | "delivery_info">,
  products: Pick<Product, "price_cents">[],
  images: Pick<BusinessImage, "id">[],
): Readiness {
  const checks: ReadinessCheck[] = [
    { key: "verified", label: "Business verified", met: business.verification_status === "verified" },
    {
      key: "contact",
      label: "Contact information",
      met: Boolean(business.phone || business.whatsapp || business.email),
    },
    {
      key: "location",
      label: "Location",
      met: Boolean(business.address || (business.city && business.state)),
    },
    { key: "products", label: "Products", met: products.length > 0 },
    { key: "prices", label: "Prices", met: products.some((p) => p.price_cents !== null) },
    { key: "images", label: "Images", met: images.length > 0 },
    {
      key: "delivery",
      label: "Delivery information",
      met: business.delivery_info?.available !== undefined,
    },
  ];

  const percent = Math.round((checks.filter((c) => c.met).length / checks.length) * 100);
  return { percent, checks };
}
