import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Icommerce — Make your business readable to AI",
  description:
    "Icommerce turns your business information into a trusted business identity that AI agents can understand, discover, and eventually buy from.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
