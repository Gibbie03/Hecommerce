"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PublishButton({ businessId, size = "md" }: { businessId: string; size?: "md" | "lg" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size={size}
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/business/${businessId}/publish`, { method: "POST" });
          setLoading(false);
          if (res.ok) {
            router.refresh();
          } else {
            const data = await res.json().catch(() => null);
            setError(data?.error ?? "Something went wrong.");
          }
        }}
      >
        {loading ? "Publishing…" : "Publish business"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
