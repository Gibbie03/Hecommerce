"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { loadDraft, clearDraft, type OnboardingDraft } from "@/lib/onboarding/draft";

type Channel = "email" | "phone";

export default function ClaimPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<OnboardingDraft | null | undefined>(undefined);
  const [channel, setChannel] = useState<Channel>("email");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"target" | "code">("target");
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

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: channel, value }),
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
      <p className="text-sm font-medium text-forest">Icommerce</p>
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

          <form onSubmit={requestCode} className="mt-4 space-y-4">
            {channel === "email" ? (
              <Field label="Email address">
                <Input type="email" required value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
            ) : (
              <Field label="Phone number" hint="International format, e.g. +2348011112222">
                <Input
                  type="tel"
                  required
                  placeholder="+2348011112222"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </Field>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={status === "loading"} className="w-full">
              {status === "loading" ? "Sending…" : "Send me a code"}
            </Button>
          </form>
        </>
      )}

      {step === "code" && (
        <form onSubmit={confirmAndClaim} className="mt-8 space-y-4">
          {!delivered && (
            <p className="rounded-xl bg-amber-bg px-3 py-2 text-xs text-amber">
              {channel === "email" ? "Email sending" : "SMS sending"} isn&apos;t configured in this environment yet
              — check the server logs for your code.
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
            Use a different {channel === "email" ? "email" : "phone number"}
          </button>
        </form>
      )}
    </main>
  );
}
