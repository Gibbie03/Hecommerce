import { StatusDot } from "./StatusDot";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { isOpenNow } from "@/lib/business/hours";
import type { Business } from "@/lib/types";

export function BusinessCard({
  business,
  imageUrl,
}: {
  business: Pick<Business, "name" | "category" | "city" | "state" | "verification_status" | "opening_hours">;
  imageUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-paper-dim">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink">{business.name}</p>
        </div>
        <p className="text-sm text-muted">{business.category ?? "Business"}</p>
        <div className="flex flex-wrap items-center gap-3">
          {(business.city || business.state) && (
            <span className="text-xs text-muted">
              📍 {[business.city, business.state].filter(Boolean).join(", ")}
            </span>
          )}
          <StatusDot open={isOpenNow(business.opening_hours)} />
        </div>
      </div>
      <VerificationBadge status={business.verification_status} />
    </div>
  );
}
