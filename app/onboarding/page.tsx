import Link from "next/link";
import { Card } from "@/components/ui/Card";

const PATHS = [
  {
    href: "/onboarding/import",
    title: "I have a website",
    body: "Import my business information.",
    icon: "🌐",
  },
  {
    href: "/onboarding/create",
    title: "I don't have a website",
    body: "Create my business site with Icommerce.",
    icon: "✨",
  },
  {
    href: "/onboarding/find",
    title: "Find my existing business",
    body: "Search by business name, phone, or WhatsApp.",
    icon: "🔍",
  },
];

export default function OnboardingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-forest">Icommerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Tell us about your business.</h1>
      <p className="mt-2 text-muted">Every path here is a legitimate way to get started — pick what fits.</p>

      <div className="mt-8 space-y-4">
        {PATHS.map((path) => (
          <Link key={path.href} href={path.href} className="block">
            <Card className="flex items-center gap-4 transition-colors hover:border-forest/50">
              <span className="text-2xl">{path.icon}</span>
              <div>
                <p className="font-medium text-ink">{path.title}</p>
                <p className="text-sm text-muted">{path.body}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
