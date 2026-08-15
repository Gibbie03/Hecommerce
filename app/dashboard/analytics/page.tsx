import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { Card } from "@/components/ui/Card";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
      <p className="mt-1 text-sm text-muted">A first look at how your business site is doing.</p>

      <Card className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Public site views</p>
        <p className="mt-1 text-3xl font-semibold text-ink">{business.view_count}</p>
      </Card>

      <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper-dim/50 p-6 text-center">
        <p className="text-sm font-medium text-ink">Deeper analytics are coming soon</p>
        <p className="mt-1 text-sm text-muted">
          Product-level views, AI agent queries, and conversion tracking aren&apos;t part of this MVP yet.
        </p>
      </div>
    </div>
  );
}
