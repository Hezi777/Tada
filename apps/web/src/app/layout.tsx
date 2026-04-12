import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";

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
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
