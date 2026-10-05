import type { Metadata } from "next";
import "./globals.css";
import CallProvider from '@/components/call-provider';
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
      <body className="antialiased"><MotionProvider><CallProvider>{children}</CallProvider></MotionProvider></body>
    </html>
  );
}
