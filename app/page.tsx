import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const FLOW = ["Your business", "Icommerce", "AI agents", "Customers"];

const STEPS = [
  {
    title: "Tell us the truth about your business",
    body: "Import from an existing website, or start from scratch on your phone — no website required.",
  },
  {
    title: "Verify, without touching any code",
    body: "Prove you represent the business over WhatsApp, phone, email, or a quick manual review.",
  },
  {
    title: "AI agents can understand you",
    body: "Icommerce turns your information into a business identity that AI can read, trust, and eventually buy from.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-6">
        <Logo size={24} className="shrink-0" />
        <nav className="flex shrink-0 items-center gap-3">
          <ButtonLink href="/onboarding" variant="ghost" size="md">
            Sign in
          </ButtonLink>
          <span className="hidden sm:block">
            <ButtonLink href="/onboarding" variant="primary" size="md">
              Make my business AI-ready
            </ButtonLink>
          </span>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
          Make your business readable to AI.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Icommerce turns your business information into a trusted business identity that AI agents can
          understand, discover, and eventually buy from.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <ButtonLink href="/onboarding" variant="primary" size="lg" className="w-full sm:w-auto">
            Make my business AI-ready
          </ButtonLink>
          <ButtonLink href="/oooh-lala-shawarma" variant="secondary" size="lg" className="w-full sm:w-auto">
            See how it works
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-8 sm:flex-row sm:justify-between sm:gap-4">
          {FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  i === 1 ? "bg-forest text-paper" : "bg-paper-dim text-ink"
                }`}
              >
                {step}
              </span>
              {i < FLOW.length - 1 && <span className="text-muted sm:hidden md:inline">→</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-line bg-white p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper-dim text-sm font-semibold text-ink">
                {i + 1}
              </span>
              <p className="mt-4 font-medium text-ink">{step.title}</p>
              <p className="mt-1.5 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8 text-center text-sm text-muted">
        Icommerce · Make your business readable and tradable with AI agents.
      </footer>
    </main>
  );
}
