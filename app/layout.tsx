import type { Metadata } from "next";
import "./globals.css";
import { MotionProvider } from "@/components/motion";

export const metadata: Metadata = {
  title: "YAARO — Meet. Talk. Connect.",
  description: "Find people who match your vibe. Chat, share moments, and build genuine connections on YAARO.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
