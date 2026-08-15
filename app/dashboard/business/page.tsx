import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { getMemberImages } from "@/lib/business/queries";
import { BusinessEditorForm } from "@/components/dashboard/BusinessEditorForm";

export default async function BusinessEditorPage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  const images = await getMemberImages(business.id, session.userId);
  const logo = images.find((img) => !img.product_id && img.is_primary) ?? images.find((img) => !img.product_id) ?? null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Business</h1>
      <p className="mt-1 text-sm text-muted">
        Every important claim shows where it came from — review and confirm what&apos;s accurate.
      </p>
      <BusinessEditorForm business={business} logoUrl={logo?.url ?? null} />
    </div>
  );
}
