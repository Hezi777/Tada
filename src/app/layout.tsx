import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Assistant } from "next/font/google";
import { satoshi } from "@/shared/fonts/satoshi";
import { Toaster } from "@/shared/ui/toaster";
import { HtmlLocaleSync } from "@/features/dashboard/components/HtmlLocaleSync";
import "../index.css";

// Satoshi is the primary Latin/display face. Assistant supplies Hebrew glyphs
// in the same stack, so mixed Hebrew/English data falls back per-glyph
// (Latin -> Satoshi, Hebrew -> Assistant) and never renders tofu.
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Tada - Instant AI Dashboards from Your Data",
  description:
    "Upload any CSV or Excel file and get an AI-generated dashboard in seconds. Ask questions, get insights, no setup required.",
  icons: {
    icon: "/tada-logo.svg",
    apple: "/tada-logo.svg",
  },
  openGraph: {
    images: ["/tada-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${satoshi.variable} ${assistant.variable} font-sans`}
      >
        <HtmlLocaleSync />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
