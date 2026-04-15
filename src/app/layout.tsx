import type { Metadata } from "next";
import type { ReactNode } from "react";
import { satoshi } from "@/shared/fonts/satoshi";
import "../index.css";

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
      <body className={`${satoshi.variable} ${satoshi.className}`}>
        {children}
      </body>
    </html>
  );
}
