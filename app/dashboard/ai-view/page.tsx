import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { getMemberProducts } from "@/lib/business/queries";
import { generateAiView } from "@/lib/ai/view";
import { Card } from "@/components/ui/Card";
import { AiSimulator } from "@/components/dashboard/AiSimulator";

export default async function AiViewPage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  const products = await getMemberProducts(business.id, session.userId);
  const summary = generateAiView(business, products);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">How AI sees your business</h1>
        <p className="mt-1 text-sm text-muted">
          This is the information Icommerce makes available to AI agents — generated only from what&apos;s in
          your business record, uncertainty included.
        </p>
        <Card className="mt-4 bg-paper-dim/40">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{summary}</p>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Ask AI about your business</h2>
        <p className="mt-1 text-sm text-muted">
          Try a question a customer or AI agent might ask — answers come only from your business data.
        </p>
        <AiSimulator businessId={business.id} />
      </div>
    </div>
  );
}
