import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { getMemberProducts, getMemberImages } from "@/lib/business/queries";
import { ProductsManager } from "@/components/dashboard/ProductsManager";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  const products = await getMemberProducts(business.id, session.userId);
  const images = await getMemberImages(business.id, session.userId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Products</h1>
      <p className="mt-1 text-sm text-muted">
        Exact prices matter more than polish here — AI agents and customers both act on what you enter.
      </p>
      <div className="mt-6">
        <ProductsManager businessId={business.id} initialProducts={products} initialImages={images} />
      </div>
    </div>
  );
}
