import type { Metadata } from "next";
import "./globals.css";
import "./social.css";
import "./theme.css";
import "./premium.css";
import "./spaces.css";
import "./consumer.css";
import {ThemeProvider} from "@/components/theme";
import {SoundProvider} from "@/components/sounds";
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider><MotionProvider><SoundProvider><CallProvider>{children}</CallProvider></SoundProvider></MotionProvider></ThemeProvider></body>
    </html>
  );
}
