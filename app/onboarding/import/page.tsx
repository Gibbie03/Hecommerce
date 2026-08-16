"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import type { ScrapedBusiness } from "@/lib/import/scrape";
import { saveDraft } from "@/lib/onboarding/draft";

export default function ImportWebsitePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"input" | "loading" | "preview" | "error">("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapedBusiness | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/import/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't import that website.");
      setResult(data.result as ScrapedBusiness);
      setStatus("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import that website.");
      setStatus("error");
    }
  }

  function confirmMatch() {
    if (!result) return;
    saveDraft({
      source: "website",
      business: {
        name: result.name ?? "My business",
        description: result.description,
        phone: result.phone,
        whatsapp: result.whatsapp,
        website: url,
        address: result.address,
      },
      products: result.products.map((p) => ({
        name: p.name,
        description: p.description,
        price_cents: p.price_cents,
      })),
      images: result.images,
    });
    router.push("/claim");
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <Logo size={20} />
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Import my business information.</h1>
      <p className="mt-2 text-muted">Paste your website link and we&apos;ll pull in what&apos;s publicly there.</p>

      {(status === "input" || status === "loading" || status === "error") && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Website URL">
            <Input
              type="url"
              required
              placeholder="https://yourbusiness.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Importing…" : "Import my information"}
          </Button>
        </form>
      )}

      {status === "preview" && result && (
        <div className="mt-8 space-y-5">
          <p className="text-sm font-medium text-ink">
            We found {result.fieldsFound} piece{result.fieldsFound === 1 ? "" : "s"} of information.
          </p>
          <Card>
            <p className="text-lg font-semibold text-ink">{result.name ?? "Untitled business"}</p>
            {result.description && <p className="mt-1 text-sm text-muted line-clamp-3">{result.description}</p>}
            <div className="mt-3 space-y-1 text-sm text-ink">
              {result.phone && <p>📞 {result.phone}</p>}
              {result.address && <p>📍 {result.address}</p>}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span>{result.products.length} products</span>
              <span>{result.images.length} images</span>
              <span>{result.socialLinks.length} social links</span>
            </div>
          </Card>
          <p className="font-medium text-ink">Is this your business?</p>
          <div className="flex gap-3">
            <Button onClick={confirmMatch}>Yes, this is my business</Button>
            <Button variant="secondary" onClick={() => setStatus("input")}>
              No, try again
            </Button>
          </div>
        </div>
      )}

      <p className="mt-10 text-sm text-muted">
        Prefer to start from scratch?{" "}
        <Link href="/onboarding/create" className="font-medium text-forest">
          Create my business site
        </Link>
      </p>
    </main>
  );
}
