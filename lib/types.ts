export type Provenance =
  | "verified"
  | "merchant_provided"
  | "merchant_confirmed"
  | "imported"
  | "third_party"
  | "unknown";

export type BusinessRole = "owner" | "admin" | "manager" | "staff";
export type BusinessStatus = "draft" | "published";
export type VerificationStatus = "unverified" | "pending" | "verified";
export type VerificationMethod = "whatsapp" | "phone" | "email" | "document" | "manual";
export type ProductAvailability = "available" | "unavailable" | "unknown";
export type SourceType = "website" | "whatsapp" | "instagram" | "facebook" | "jumia" | "shopify" | "bumpa";
export type SourceStatus = "connected" | "pending";

export interface FieldProvenanceEntry {
  source: Provenance;
  updated_at: string;
}

export type FieldProvenance = Record<string, FieldProvenanceEntry | undefined>;

export interface OpeningHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

export type OpeningHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", OpeningHoursDay>
>;

export interface DeliveryInfo {
  available?: boolean;
  fee?: string | number;
  note?: string;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  status: BusinessStatus;
  verification_status: VerificationStatus;
  verification_method: VerificationMethod | null;
  verified_at: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  opening_hours: OpeningHours;
  delivery_info: DeliveryInfo;
  policies: string | null;
  field_provenance: FieldProvenance;
  ai_ready_score: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  availability: ProductAvailability;
  price_source: Provenance;
  availability_source: Provenance;
  price_updated_at: string | null;
  availability_updated_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessImage {
  id: string;
  business_id: string;
  product_id: string | null;
  url: string;
  is_primary: boolean;
  created_at: string;
}

export interface BusinessSource {
  id: string;
  business_id: string;
  type: SourceType;
  value: string | null;
  status: SourceStatus;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  business_id: string;
  method: VerificationMethod;
  status: "pending" | "verified" | "rejected";
  target: string | null;
  expires_at: string | null;
  requested_by: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface Review {
  id: string;
  business_id: string;
  author_name: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  created_at: string;
}
