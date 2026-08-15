import { Badge } from "./Badge";
import type { VerificationStatus } from "@/lib/types";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return <Badge tone="verified">✓ Verified business</Badge>;
  }
  if (status === "pending") {
    return <Badge tone="warning">Verification pending</Badge>;
  }
  return <Badge tone="neutral">Not yet verified</Badge>;
}
