import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";

import "./globals.css";

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const _notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "Reflect - AI Self-Analysis",
  description:
    "Turn your daily thoughts into actionable self-insights with AI-powered journaling.",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${_inter.variable} ${_notoSansJP.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
