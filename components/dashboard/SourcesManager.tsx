"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { BusinessSource, SourceType } from "@/lib/types";

const CONNECTABLE: { type: SourceType; label: string; icon: string; placeholder: string }[] = [
  { type: "website", label: "Website", icon: "🌐", placeholder: "https://yourbusiness.com" },
  { type: "whatsapp", label: "WhatsApp", icon: "💬", placeholder: "+234 803 000 1122" },
  { type: "instagram", label: "Instagram", icon: "📷", placeholder: "https://instagram.com/yourbusiness" },
  { type: "facebook", label: "Facebook", icon: "👍", placeholder: "https://facebook.com/yourbusiness" },
];

const COMING_SOON: { label: string; icon: string }[] = [
  { label: "Jumia", icon: "🛒" },
  { label: "Shopify", icon: "🛍️" },
  { label: "Bumpa", icon: "📦" },
];

export function SourcesManager({ businessId, initialSources }: { businessId: string; initialSources: BusinessSource[] }) {
  const [sources, setSources] = useState(initialSources);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function connect(type: SourceType) {
    const value = drafts[type];
    if (!value?.trim()) return;
    setSaving(type);
    const res = await fetch(`/api/business/${businessId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value }),
    });
    setSaving(null);
    if (res.ok) {
      setSources((prev) => {
        const others = prev.filter((s) => s.type !== type);
        return [...others, { id: type, business_id: businessId, type, value, status: "connected", created_at: new Date().toISOString() }];
      });
    }
  }

  return (
    <div className="space-y-3">
      {CONNECTABLE.map((item) => {
        const existing = sources.find((s) => s.type === item.type);
        return (
          <div key={item.type} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-ink">{item.label}</p>
              {existing?.status === "connected" ? (
                <p className="text-sm text-muted">{existing.value}</p>
              ) : (
                <div className="mt-1.5 flex gap-2">
                  <Input
                    placeholder={item.placeholder}
                    value={drafts[item.type] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [item.type]: e.target.value }))}
                  />
                  <Button size="md" variant="secondary" disabled={saving === item.type} onClick={() => connect(item.type)}>
                    Connect
                  </Button>
                </div>
              )}
            </div>
            {existing?.status === "connected" && <Badge tone="verified">Connected</Badge>}
          </div>
        );
      })}

      {COMING_SOON.map((item) => (
        <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-line bg-paper-dim/50 p-4 opacity-70">
          <span className="text-xl">{item.icon}</span>
          <div className="flex-1">
            <p className="font-medium text-ink">{item.label}</p>
            <p className="text-sm text-muted">Coming soon</p>
          </div>
        </div>
      ))}
    </div>
  );
}
