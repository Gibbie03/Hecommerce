"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Business, VerificationRequest } from "@/lib/types";

type Channel = "email" | "phone";

const CHANNELS: { key: Channel; label: string; icon: string; blurb: string }[] = [
  { key: "email", label: "Email", icon: "✉️", blurb: "Verify by email" },
  { key: "phone", label: "Phone", icon: "📞", blurb: "Verify by SMS" },
];

const STUBBED_METHODS = [
  { key: "whatsapp", label: "WhatsApp", icon: "💬" },
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
  const [mode, setMode] = useState<"picker" | "channel-target" | "channel-code">("picker");
  const [activeChannel, setActiveChannel] = useState<Channel>("email");
  const [targetValue, setTargetValue] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(true);

  function openChannel(channel: Channel) {
    setActiveChannel(channel);
    setTargetValue(channel === "email" ? (business.email ?? "") : (business.whatsapp ?? business.phone ?? ""));
    setError(null);
    setMode("channel-target");
  }

  async function sendChannelCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const body = activeChannel === "email" ? { email: targetValue } : { phone: targetValue };
    const res = await fetch(`/api/business/${business.id}/verify/${activeChannel}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDelivered(Boolean(data.delivered));
    setMode("channel-code");
  }

  async function confirmChannelCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const res = await fetch(`/api/business/${business.id}/verify/${activeChannel}/confirm`, {
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
          {CHANNELS.map((channel) => (
            <button
              key={channel.key}
              type="button"
              onClick={() => openChannel(channel.key)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-forest/50"
            >
              <span className="text-xl">{channel.icon}</span>
              <div>
                <p className="font-medium text-ink">{channel.label}</p>
                <p className="text-sm text-muted">{channel.blurb}</p>
              </div>
            </button>
          ))}

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

      {mode === "channel-target" && (
        <form onSubmit={sendChannelCode} className="space-y-4">
          {activeChannel === "email" ? (
            <Field label="Business email" hint="We'll send a code here to confirm you control it.">
              <Input type="email" required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </Field>
          ) : (
            <PhoneInput label="Business phone number" required value={targetValue} onChange={setTargetValue} />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={status === "loading" || (activeChannel === "phone" && !targetValue)}>
              {status === "loading" ? "Sending…" : "Send code"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("picker")}>
              Back
            </Button>
          </div>
        </form>
      )}

      {mode === "channel-code" && (
        <form onSubmit={confirmChannelCode} className="space-y-4">
          {!delivered && (
            <p className="rounded-xl bg-amber-bg px-3 py-2 text-xs text-amber">
              We couldn&apos;t confirm the {activeChannel === "email" ? "email" : "SMS"} was delivered — it may not
              be configured, or sending may have failed. Check the server logs for your code, or try again shortly.
            </p>
          )}
          <Field label={`6-digit code sent to ${targetValue}`}>
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
