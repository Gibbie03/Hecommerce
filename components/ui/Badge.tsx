import type { ReactNode } from "react";

type Tone = "neutral" | "verified" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-paper-dim text-muted",
  verified: "bg-verified-bg text-verified",
  warning: "bg-amber-bg text-amber",
  danger: "bg-danger-bg text-danger",
  info: "bg-paper-dim text-ink",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
