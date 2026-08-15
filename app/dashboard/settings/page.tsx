import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { getMemberSources } from "@/lib/business/queries";
import { SourcesManager } from "@/components/dashboard/SourcesManager";
import { Card } from "@/components/ui/Card";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  const sources = await getMemberSources(business.id, session.userId);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Your account, and the sources connected to this business identity.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Account</h2>
        <Card>
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-medium text-ink">{session.email}</p>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Connected sources</h2>
        <p className="text-sm text-muted">
          A connected source feeds this business identity — it never replaces it.
        </p>
        <SourcesManager businessId={business.id} initialSources={sources} />
      </section>
    </div>
  );
}
