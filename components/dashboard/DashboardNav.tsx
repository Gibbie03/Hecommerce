"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/business", label: "Business", icon: "🏢" },
  { href: "/dashboard/products", label: "Products", icon: "🛍️" },
  { href: "/dashboard/ai-view", label: "AI View", icon: "🤖" },
  { href: "/dashboard/reviews", label: "Reviews", icon: "⭐" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/business", label: "Business", icon: "🏢" },
  { href: "/dashboard/products", label: "Products", icon: "🛍️" },
  { href: "/dashboard/ai-view", label: "AI View", icon: "🤖" },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DesktopSidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line px-3 py-6 sm:flex">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            isActive(pathname, item.href) ? "bg-forest text-paper" : "text-ink hover:bg-paper-dim"
          }`}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white sm:hidden">
      {MOBILE_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
            isActive(pathname, item.href) ? "text-forest" : "text-muted"
          }`}
        >
          <span className="text-base">{item.icon}</span>
          {item.label === "Dashboard" ? "Home" : item.label}
        </Link>
      ))}
      <Link
        href="/dashboard/settings"
        className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
          pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/reviews") || pathname.startsWith("/dashboard/analytics")
            ? "text-forest"
            : "text-muted"
        }`}
      >
        <span className="text-base">⋯</span>
        More
      </Link>
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="text-sm text-muted hover:text-ink"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
