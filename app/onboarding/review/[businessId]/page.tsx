import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getBusinessForMember, getMemberProducts, getMemberImages } from "@/lib/business/queries";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

function countPieces(business: Awaited<ReturnType<typeof getBusinessForMember>>, productCount: number, imageCount: number) {
  if (!business) return 0;
  const fields = [
    business.name,
    business.category,
    business.description,
    business.phone,
    business.whatsapp,
    business.email,
    business.address,
    business.city,
    business.state,
  ].filter(Boolean).length;
  const hoursSet = Object.keys(business.opening_hours ?? {}).length > 0 ? 1 : 0;
  return fields + hoursSet + productCount + imageCount;
}

export default async function ReviewPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getBusinessForMember(businessId, session.userId);
  if (!business) redirect("/onboarding");

  const products = await getMemberProducts(businessId, session.userId);
  const images = await getMemberImages(businessId, session.userId);
  const pieces = countPieces(business, products.length, images.length);

  const checklist = [
    { label: "Business information", met: Boolean(business.name && business.description) },
    { label: `${products.length} product${products.length === 1 ? "" : "s"}`, met: products.length > 0 },
    {
      label: `${products.filter((p) => p.price_cents !== null).length} prices`,
      met: products.some((p) => p.price_cents !== null),
    },
    { label: `${images.length} images`, met: images.length > 0 },
    { label: "Opening hours", met: Object.keys(business.opening_hours ?? {}).length > 0 },
    { label: "Contact information", met: Boolean(business.phone || business.whatsapp) },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <Logo size={20} />
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">We found your business information.</h1>
      <p className="mt-2 text-muted">
        {pieces} piece{pieces === 1 ? "" : "s"} of information{business.field_provenance && Object.values(business.field_provenance).some((f) => f?.source === "imported") ? ", imported from your website" : ""}.
      </p>

      <Card className="mt-6 space-y-2.5">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className={item.met ? "text-forest" : "text-muted"}>{item.met ? "✓" : "○"}</span>
            <span className={item.met ? "text-ink" : "text-muted"}>{item.label}</span>
          </div>
        ))}
      </Card>

      <p className="mt-6 text-sm text-muted">
        Review before publishing — you can correct anything, add missing prices, and upload photos.
      </p>
      <ButtonLink href="/dashboard/business" size="lg" className="mt-4 w-full">
        Review and complete my profile
      </ButtonLink>
    </main>
  );
}
