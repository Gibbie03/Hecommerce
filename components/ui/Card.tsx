import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-white ${padded ? "p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}
