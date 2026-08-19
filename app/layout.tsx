import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Icommerce — Make your business readable to AI",
  description:
    "Icommerce turns your business information into a trusted business identity that AI agents can understand, discover, and eventually buy from.",
  alternates: { canonical: getSiteUrl() },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "Icommerce — Make your business readable to AI",
    description:
      "Icommerce turns your business information into a trusted business identity that AI agents can understand, discover, and eventually buy from.",
    url: getSiteUrl(),
    siteName: "Icommerce",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
