import type { Metadata } from "next";
import { DM_Serif_Text, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "../index.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "TADA - Instant AI Dashboards from Your Data",
  description:
    "Upload any CSV or Excel file and get an AI-generated dashboard in seconds. Ask questions, get insights, no setup required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${dmSerifText.variable}`}
    >
      <body className={instrumentSans.className}>{children}</body>
    </html>
  );
}
