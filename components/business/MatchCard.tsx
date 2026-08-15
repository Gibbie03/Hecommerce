import { StatusDot } from "./StatusDot";
import { isOpenNow } from "@/lib/business/hours";

export function MatchCard({
  name,
  category,
  city,
  state,
  phone,
  openingHours,
}: {
  name: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  openingHours?: import("@/lib/types").OpeningHours | null;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <p className="text-lg font-semibold text-ink">{name}</p>
      {category && <p className="mt-1 text-sm text-muted">{category}</p>}
      <div className="mt-3 space-y-1.5 text-sm text-ink">
        {(city || state) && <p>📍 {[city, state].filter(Boolean).join(", ")}</p>}
        {phone && <p>📞 {phone}</p>}
        <StatusDot open={isOpenNow(openingHours ?? null)} />
      </div>
    </div>
  );
}
