"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const SUGGESTIONS = [
  "What does my business sell?",
  "How much is my chicken shawarma?",
  "Where am I located?",
  "Are we open today?",
  "How can customers contact us?",
  "Do we deliver?",
];

export function AiSimulator({ businessId }: { businessId: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, question: q }),
    });
    const data = await res.json();
    setLoading(false);
    setHistory((prev) => [{ question: q, answer: data.answer ?? data.error ?? "Something went wrong." }, ...prev]);
    setQuestion("");
  }

  return (
    <div className="mt-4 space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Ask something about your business…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Asking…" : "Ask"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink hover:border-forest/40"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {history.map((entry, i) => (
          <div key={i} className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm font-medium text-ink">{entry.question}</p>
            <p className="mt-1.5 text-sm text-muted">{entry.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
