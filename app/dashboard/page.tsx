import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { getMemberProducts, getMemberImages } from "@/lib/business/queries";
import { computeReadiness } from "@/lib/business/readiness";
import { ReadinessRing } from "@/components/ui/ReadinessRing";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PublishButton } from "@/components/dashboard/PublishButton";

export default async function DashboardHomePage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  const products = await getMemberProducts(business.id, session.userId);
  const images = await getMemberImages(business.id, session.userId);
  const readiness = computeReadiness(business, products, images);
  const isDraft = business.status === "draft";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {isDraft ? "Your business is ready for AI" : `${business.name} is AI-ready`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isDraft
            ? "Publish to make this public — you can keep improving it any time after."
            : "AI agents can understand most of your business information."}
        </p>
      </div>

      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <ReadinessRing percent={readiness.percent} />
        <div className="flex-1 space-y-1.5">
          {readiness.checks.map((check) => (
            <div key={check.key} className="flex items-center gap-2 text-sm">
              <span className={check.met ? "text-forest" : "text-amber"}>{check.met ? "✓" : "⚠"}</span>
              <span className={check.met ? "text-ink" : "text-muted"}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {isDraft ? (
        <div className="flex gap-3">
          <PublishButton businessId={business.id} size="lg" />
          <ButtonLink href="/dashboard/business" variant="secondary" size="lg">
            Complete my profile
          </ButtonLink>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Business</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {business.verification_status === "verified" ? "Verified" : "Unverified"}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Products</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {products.length} product{products.length === 1 ? "" : "s"}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Trust</p>
            <p className="mt-1 text-lg font-semibold text-ink">{readiness.percent}% verified</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">AI visibility</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              <Badge tone="verified">Live</Badge>
            </p>
          </Card>
        </div>
      )}

      <Link
        href="/dashboard/ai-view"
        className="flex items-center justify-between rounded-2xl border border-line bg-white p-5 transition-colors hover:border-forest/40"
      >
        <div>
          <p className="font-medium text-ink">How AI sees your business</p>
          <p className="text-sm text-muted">See the exact summary AI agents receive, and try asking it questions.</p>
        </div>
        <span className="text-forest">→</span>
      </Link>
    </div>
  );
}
