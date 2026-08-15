import { formatRelativeTime, provenanceLabel } from "@/lib/format";
import type { Provenance } from "@/lib/types";

export function ProvenanceLabel({
  source,
  updatedAt,
}: {
  source: Provenance;
  updatedAt?: string | null;
}) {
  if (source === "unknown") {
    return <span className="text-xs text-muted">Unknown</span>;
  }

  return (
    <span className="text-xs text-muted">
      {provenanceLabel(source)}
      {updatedAt && <> · Updated {formatRelativeTime(updatedAt)}</>}
    </span>
  );
}
