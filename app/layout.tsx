import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(
    typeof siteUrl === "string" && siteUrl.startsWith("http")
      ? siteUrl
      : "http://localhost:3000",
  ),
  title: {
    default: "Reflect - 毎日のふりかえり",
    template: "%s | Reflect",
  },
  description: "毎日の思考を静かに振り返る習慣を。感情と思考のパターンに気づく。",
  icons: {
    icon: "/reflect.png",
    apple: "/reflect.png",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Reflect",
    title: "Reflect - 毎日のふりかえり",
    description: "毎日の思考を静かに振り返る習慣を。感情と思考のパターンに気づく。",
    images: [
      {
        url: "/reflect.png",
        width: 1200,
        height: 630,
        alt: "Reflect - 毎日のふりかえり",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reflect - 毎日のふりかえり",
    description: "毎日の思考を静かに振り返る習慣を。感情と思考のパターンに気づく。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
