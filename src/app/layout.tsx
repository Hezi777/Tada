import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Heebo, Inter } from "next/font/google";
import { satoshi } from "@/shared/fonts/satoshi";
import "../index.css";

// Inter carries body text; Heebo supplies Hebrew glyphs in the same stack so
// mixed Hebrew/English data never falls back to tofu. Satoshi stays the
// display/number face.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "TADA - Instant AI Dashboards from Your Data",
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
        className={`${satoshi.variable} ${inter.variable} ${heebo.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
