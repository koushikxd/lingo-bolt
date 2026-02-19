import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/components/providers";
import "../index.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lingo Bolt — Translate, understand and manage any GitHub repo",
  description:
    "Lingo Bolt helps contributors participate and maintainers manage issues and PRs across languages — with AI onboarding docs, markdown translation, and a GitHub bot.",
  keywords: [
    "open source",
    "translation",
    "GitHub",
    "localization",
    "AI",
    "onboarding docs",
    "multilingual",
    "contributor tools",
  ],
  openGraph: {
    title: "Lingo Bolt — Translate, understand and manage any GitHub repo",
    description:
      "Helps contributors participate and maintainers manage issues and PRs across languages. AI onboarding docs, markdown translation, codebase chat, and a GitHub bot — all in your language.",
    type: "website",
    siteName: "Lingo Bolt",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lingo Bolt — Translate, understand and manage any GitHub repo",
    description:
      "Helps contributors participate and maintainers manage issues and PRs across languages. AI onboarding docs, markdown translation, codebase chat, and a GitHub bot — all in your language.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
