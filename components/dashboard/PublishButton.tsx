"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PublishButton({ businessId, size = "md" }: { businessId: string; size?: "md" | "lg" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size={size}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch(`/api/business/${businessId}/publish`, { method: "POST" });
        setLoading(false);
        if (res.ok) router.refresh();
      }}
    >
      {loading ? "Publishing…" : "Publish business"}
    </Button>
  );
}
