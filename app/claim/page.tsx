"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Logo } from "@/components/ui/Logo";
import { loadDraft, clearDraft, type OnboardingDraft } from "@/lib/onboarding/draft";

type Channel = "email" | "phone";
type Step = "target" | "code" | "waiting";

export default function ClaimPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<OnboardingDraft | null | undefined>(undefined);
  const [channel, setChannel] = useState<Channel>("email");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("target");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(true);

  useEffect(() => {
    const loaded = loadDraft();
    setDraft(loaded);
    if (!loaded) router.replace("/onboarding");
  }, [router]);

  function switchChannel(next: Channel) {
    setChannel(next);
    setValue("");
    setError(null);
  }

  async function requestEmailMagicLink() {
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/auth/magic-link/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value, continuation: draft }),
    });
    setStatus("idle");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    // Business creation/claiming for the email channel happens server-side
    // in the magic-link callback once the user clicks the link — the
    // draft was just sent above as the link's continuation, so it isn't
    // cleared from this tab until that succeeds elsewhere.
    setStep("waiting");
  }

  async function requestPhoneCode() {
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "phone", value }),
    });
    const data = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDelivered(Boolean(data.delivered));
    setStep("code");
  }

  function handleTargetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (channel === "email") {
      void requestEmailMagicLink();
    } else {
      void requestPhoneCode();
    }
  }

  async function confirmAndClaim(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const confirmRes = await fetch("/api/auth/confirm-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: channel, value, code }),
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
      <Logo size={20} />
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Claim {businessLabel}.</h1>
      <p className="mt-2 text-muted">
        We just need a way to reach you to save your progress — no password, and nothing else is required.
      </p>

      {step === "target" && (
        <>
          <div className="mt-6 inline-flex rounded-full border border-line bg-white p-1">
            {(["email", "phone"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchChannel(option)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  channel === option ? "bg-forest text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {option === "email" ? "Email" : "Phone"}
              </button>
            ))}
          </div>

          <form onSubmit={handleTargetSubmit} className="mt-4 space-y-4">
            {channel === "email" ? (
              <Field label="Email address" hint="We'll email you a secure sign-in link.">
                <Input type="email" required value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
            ) : (
              <PhoneInput label="Phone number" required value={value} onChange={setValue} />
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="submit"
              disabled={status === "loading" || !value}
              className="w-full"
            >
              {status === "loading"
                ? "Sending…"
                : channel === "email"
                  ? "Send me a magic link"
                  : "Send me a code"}
            </Button>
          </form>
        </>
      )}

      {step === "waiting" && (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl bg-paper-dim px-4 py-3 text-sm text-ink">
            Check your email. If the address is eligible, we've sent you a secure sign-in link.
          </p>
          <Button
            variant="secondary"
            className="w-full"
            disabled={status === "loading"}
            onClick={() => void requestEmailMagicLink()}
          >
            {status === "loading" ? "Sending…" : "Resend link"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            className="w-full text-sm text-muted underline"
            onClick={() => {
              setStep("target");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </div>
      )}

      {step === "code" && (
        <form onSubmit={confirmAndClaim} className="mt-8 space-y-4">
          {!delivered && (
            <p className="rounded-xl bg-amber-bg px-3 py-2 text-xs text-amber">
              We couldn&apos;t confirm the SMS was delivered — it may not be configured, or sending may have
              failed. Check the server logs for your code, or try again shortly.
            </p>
          )}
          <Field label={`6-digit code sent to ${value}`}>
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
          <button type="button" className="text-sm text-muted underline" onClick={() => setStep("target")}>
            Use a different phone number
          </button>
        </form>
      )}
    </main>
  );
}
