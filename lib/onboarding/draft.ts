import type { DeliveryInfo, OpeningHours, ProductAvailability } from "@/lib/types";

const STORAGE_KEY = "icommerce_onboarding_draft";

export interface DraftProduct {
  name: string;
  description?: string;
  price_cents?: number;
  availability?: ProductAvailability;
}

export interface DraftBusiness {
  name: string;
  category?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  opening_hours?: OpeningHours;
  delivery_info?: DeliveryInfo;
}

export interface OnboardingDraft {
  source: "website" | "manual" | "match";
  matchedBusinessId?: string;
  matchedBusinessName?: string;
  business?: DraftBusiness;
  products?: DraftProduct[];
  images?: string[];
}

export function saveDraft(draft: OnboardingDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function loadDraft(): OnboardingDraft | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
}
