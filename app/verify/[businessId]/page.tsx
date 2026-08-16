import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getBusinessForMember, getMemberVerificationRequests } from "@/lib/business/queries";
import { VerifyClient } from "@/components/verify/VerifyClient";
import { Logo } from "@/components/ui/Logo";

export default async function VerifyPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getBusinessForMember(businessId, session.userId);
  if (!business) redirect("/onboarding");

  const requests = await getMemberVerificationRequests(businessId, session.userId);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <Logo size={20} />
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Let&apos;s verify your business.</h1>
      <p className="mt-2 text-muted">
        Verification helps AI agents distinguish your official business information from random information
        online.
      </p>

      <VerifyClient business={business} initialRequests={requests} />
    </main>
  );
}
