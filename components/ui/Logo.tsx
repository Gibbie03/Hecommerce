import { useId } from "react";

/**
 * The Icommerce mark: a person (the business/merchant) merged into a "C"
 * that opens onto three connected nodes (AI agents reading the business).
 * Colors are drawn from the existing design tokens only — no new palette.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const uid = useId();
  const cGradientId = `icommerce-c-${uid}`;
  const iGradientId = `icommerce-i-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={cGradientId} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-forest-light)" />
          <stop offset="1" stopColor="var(--color-forest)" />
        </linearGradient>
        <linearGradient id={iGradientId} x1="11" y1="10" x2="19" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-forest-light)" />
          <stop offset="1" stopColor="var(--color-forest)" />
        </linearGradient>
      </defs>
      <path
        d="M34.29 36.26 A16 16 0 1 1 34.29 11.74"
        stroke={`url(#${cGradientId})`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="15" cy="14.5" r="3.4" fill={`url(#${iGradientId})`} />
      <rect x="11.5" y="18.5" width="7" height="15" rx="3.5" fill={`url(#${iGradientId})`} />
      <circle cx="30" cy="16" r="2" fill="var(--color-forest-dark)" />
      <circle cx="35" cy="24" r="2.3" fill="var(--color-forest-dark)" />
      <circle cx="30" cy="32" r="2" fill="var(--color-forest-dark)" />
      <path d="M30 16 L35 24 L30 32" stroke="var(--color-forest-dark)" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function Logo({
  size = 24,
  withWordmark = true,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {withWordmark && <span className="text-lg font-semibold tracking-tight text-ink">icommerce</span>}
    </span>
  );
}
