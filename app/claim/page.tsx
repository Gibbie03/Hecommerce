"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { loadDraft, clearDraft, type OnboardingDraft } from "@/lib/onboarding/draft";

export default function ClaimPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<OnboardingDraft | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(true);

  useEffect(() => {
    const loaded = loadDraft();
    setDraft(loaded);
    if (!loaded) router.replace("/onboarding");
  }, [router]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setEmailConfigured(Boolean(data.emailConfigured));
    setStep("code");
  }

  async function confirmAndClaim(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const confirmRes = await fetch("/api/auth/confirm-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const confirmData = await confirmRes.json();
    if (!confirmRes.ok) {
      setStatus("idle");
      setError(confirmData.error ?? "That code didn't work.");
      return;
    }

    const claimRes = await fetch("/api/business/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const claimData = await claimRes.json();
    setStatus("idle");
    if (!claimRes.ok) {
      setError(claimData.error ?? "Something went wrong.");
      return;
    }

    clearDraft();
    router.push(`/verify/${claimData.businessId}`);
  }

  if (draft === undefined) return null;
  if (!draft) return null;

  const businessLabel = draft.matchedBusinessName ?? draft.business?.name ?? "your business";

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-16">
      <p className="text-sm font-medium text-forest">Icommerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Claim {businessLabel}.</h1>
      <p className="mt-2 text-muted">
        We just need your email to save your progress — no password, and nothing else is required.
      </p>

      {step === "email" && (
        <form onSubmit={requestCode} className="mt-8 space-y-4">
          <Field label="Email address">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Sending…" : "Send me a code"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={confirmAndClaim} className="mt-8 space-y-4">
          {!emailConfigured && (
            <p className="rounded-xl bg-amber-bg px-3 py-2 text-xs text-amber">
              Email sending isn&apos;t configured in this environment yet — check the server logs for your code.
            </p>
          )}
          <Field label={`6-digit code sent to ${email}`}>
            <Input
              required
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Confirming…" : "Confirm and claim my business"}
          </Button>
          <button type="button" className="text-sm text-muted underline" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </form>
      )}
    </main>
  );
}
