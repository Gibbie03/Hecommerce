"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Business, VerificationRequest } from "@/lib/types";

const STUBBED_METHODS = [
  { key: "whatsapp", label: "WhatsApp", icon: "💬" },
  { key: "phone", label: "Phone", icon: "📞" },
  { key: "document", label: "Business documents", icon: "📄" },
] as const;

export function VerifyClient({
  business,
  initialRequests,
}: {
  business: Business;
  initialRequests: VerificationRequest[];
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(business.verification_status === "verified");
  const [manualPending, setManualPending] = useState(
    initialRequests.some((r) => r.method === "manual" && r.status === "pending"),
  );
  const [mode, setMode] = useState<"picker" | "email-target" | "email-code">("picker");
  const [targetEmail, setTargetEmail] = useState(business.email ?? "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(true);

  async function sendEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch(`/api/business/${business.id}/verify/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setEmailConfigured(Boolean(data.delivered));
    setMode("email-code");
  }

  async function confirmEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch(`/api/business/${business.id}/verify/email/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setError(data.error ?? "That code didn't work.");
      return;
    }
    setVerified(true);
  }

  async function requestManual() {
    setStatus("loading");
    setError(null);
    const res = await fetch(`/api/business/${business.id}/verify/manual`, { method: "POST" });
    const data = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setManualPending(true);
  }

  if (verified) {
    return (
      <div className="mt-8 space-y-5">
        <Card className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-ink">Business verified</p>
            <p className="text-sm text-muted">AI agents can now trust this information came from you.</p>
          </div>
        </Card>
        <Button className="w-full" onClick={() => router.push(`/onboarding/review/${business.id}`)}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {mode === "picker" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode("email-target")}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-forest/50"
          >
            <span className="text-xl">✉️</span>
            <div>
              <p className="font-medium text-ink">Email</p>
              <p className="text-sm text-muted">Verify by email</p>
            </div>
          </button>

          <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🧾</span>
              <div>
                <p className="font-medium text-ink">Manual review</p>
                <p className="text-sm text-muted">
                  {manualPending ? "We're reviewing your request." : "Request verification"}
                </p>
              </div>
            </div>
            {manualPending ? (
              <Badge tone="warning">Pending</Badge>
            ) : (
              <Button size="md" variant="secondary" disabled={status === "loading"} onClick={requestManual}>
                Request
              </Button>
            )}
          </div>

          {STUBBED_METHODS.map((method) => (
            <div
              key={method.key}
              className="flex items-center gap-3 rounded-2xl border border-line bg-paper-dim/50 p-4 opacity-70"
            >
              <span className="text-xl">{method.icon}</span>
              <div>
                <p className="font-medium text-ink">{method.label}</p>
                <p className="text-sm text-muted">Requires provider setup — coming soon</p>
              </div>
            </div>
          ))}

          {manualPending && (
            <Button variant="ghost" className="w-full" onClick={() => router.push(`/onboarding/review/${business.id}`)}>
              Continue with pending review →
            </Button>
          )}
        </div>
      )}

      {mode === "email-target" && (
        <form onSubmit={sendEmailCode} className="space-y-4">
          <Field label="Business email" hint="We'll send a code here to confirm you control it.">
            <Input
              type="email"
              required
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Sending…" : "Send code"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("picker")}>
              Back
            </Button>
          </div>
        </form>
      )}

      {mode === "email-code" && (
        <form onSubmit={confirmEmailCode} className="space-y-4">
          {!emailConfigured && (
            <p className="rounded-xl bg-amber-bg px-3 py-2 text-xs text-amber">
              Email sending isn&apos;t configured in this environment yet — check the server logs for your code.
            </p>
          )}
          <Field label={`6-digit code sent to ${targetEmail}`}>
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
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Confirming…" : "Confirm"}
          </Button>
        </form>
      )}
    </div>
  );
}
