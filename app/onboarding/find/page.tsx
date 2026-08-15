"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { MatchCard } from "@/components/business/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { saveDraft } from "@/lib/onboarding/draft";
import type { Business } from "@/lib/types";

export default function FindBusinessPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<Business[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setStatus("loading");
    const res = await fetch(`/api/business/search-claimable?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setStatus("done");
  }

  function selectBusiness(business: Business) {
    saveDraft({ source: "match", matchedBusinessId: business.id, matchedBusinessName: business.name });
    router.push("/claim");
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <p className="text-sm font-medium text-forest">Icommerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Find your existing business.</h1>
      <p className="mt-2 text-muted">Search by business name, phone, or WhatsApp number.</p>

      <form onSubmit={handleSearch} className="mt-8 space-y-4">
        <Field label="Business name, phone, or WhatsApp">
          <Input
            required
            placeholder="Oooh Lala Shawarma"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={status === "loading"} className="w-full">
          {status === "loading" ? "Searching…" : "Search"}
        </Button>
      </form>

      {status === "done" && results.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="We couldn't find that business"
            description="It may not be on Icommerce yet — you can create it instead."
            action={
              <Link href="/onboarding/create">
                <Button variant="secondary">Create my business site</Button>
              </Link>
            }
          />
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8 space-y-4">
          <p className="text-sm font-medium text-ink">Is one of these your business?</p>
          {results.map((business) => (
            <div key={business.id} className="space-y-3">
              <MatchCard
                name={business.name}
                category={business.category}
                city={business.city}
                state={business.state}
                phone={business.phone}
                openingHours={business.opening_hours}
              />
              <Button onClick={() => selectBusiness(business)} className="w-full">
                Yes, this is my business
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
