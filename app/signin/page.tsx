"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"target" | "waiting">("target");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function requestLink() {
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/auth/magic-link/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setStatus("idle");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setStep("waiting");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void requestLink();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-16">
      <Logo size={20} />
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Sign in.</h1>
      <p className="mt-2 text-muted">We'll email you a secure link — no password required.</p>

      {step === "target" && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Email address">
            <Input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Sending…" : "Send me a magic link"}
          </Button>
        </form>
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
            onClick={() => void requestLink()}
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
    </main>
  );
}
