import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getActiveBusiness } from "@/lib/business/active";
import { DesktopSidebar, MobileNav, LogoutButton } from "@/components/dashboard/DashboardNav";
import { Logo } from "@/components/ui/Logo";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/onboarding");

  const business = await getActiveBusiness(session.userId);
  if (!business) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-line px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Logo size={20} className="text-sm" />
          <span className="text-muted">·</span>
          <span className="text-sm text-ink">{business.name}</span>
          <VerificationBadge status={business.verification_status} />
        </div>
        <div className="flex items-center gap-4">
          {business.status === "published" && (
            <Link
              href={`/${business.slug}`}
              className="whitespace-nowrap text-sm text-forest hover:underline"
              target="_blank"
            >
              View site ↗
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>
      <div className="flex">
        <DesktopSidebar />
        <main className="flex-1 px-6 py-8 pb-24 sm:pb-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
