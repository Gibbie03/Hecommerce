export function formatPrice(cents: number | null, currency: string = "NGN"): string {
  if (cents === null) return "Unknown";
  const amount = cents / 100;
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${amount.toLocaleString("en-NG", { minimumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`;
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(seconds / 86400);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

const PROVENANCE_LABELS: Record<string, string> = {
  verified: "Verified",
  merchant_provided: "Merchant provided",
  merchant_confirmed: "Merchant confirmed",
  imported: "Imported from website",
  third_party: "Third-party source",
  unknown: "Unknown",
};

export function provenanceLabel(provenance: string): string {
  return PROVENANCE_LABELS[provenance] ?? "Unknown";
}
