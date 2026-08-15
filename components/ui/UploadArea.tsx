"use client";

import { useRef, useState } from "react";

export function UploadArea({
  businessId,
  productId,
  isPrimary,
  label = "Upload a photo",
  onUploaded,
}: {
  businessId: string;
  productId?: string;
  isPrimary?: boolean;
  label?: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    setPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.set("file", file);
    form.set("businessId", businessId);
    if (productId) form.set("productId", productId);
    if (isPrimary) form.set("isPrimary", "true");

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStatus("idle");
      onUploaded(data.image.url as string);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper-dim/50 p-6 text-center transition-colors hover:border-forest/40"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-24 w-24 rounded-lg object-cover" />
        ) : (
          <span className="text-2xl">📷</span>
        )}
        <span className="text-sm font-medium text-ink">
          {status === "uploading" ? "Uploading…" : label}
        </span>
        <span className="text-xs text-muted">JPEG, PNG, WEBP, or GIF · up to 5MB</span>
      </button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
