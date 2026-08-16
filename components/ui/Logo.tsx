import Image from "next/image";
import icommerceMark from "@/public/brand/icommerce-mark.png";

/** The official Icommerce mark: a person merged into a "C" opening onto three connected AI-agent nodes. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src={icommerceMark}
      alt=""
      width={size}
      height={size}
      className={className}
      priority
    />
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
