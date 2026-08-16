import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";

export default function MagicLinkErrorPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-16">
      <Logo size={20} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Link expired</h1>

      <Card className="mt-6 flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <p className="text-sm text-ink">That link has expired or has already been used.</p>
      </Card>

      <ButtonLink href="/signin" className="mt-6 w-full">
        Send me a new link
      </ButtonLink>
    </main>
  );
}
