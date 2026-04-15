import localFont from "next/font/local";

export const satoshi = localFont({
  src: [
    {
      path: "./satoshi/satoshi-variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "./satoshi/satoshi-variable-italic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  variable: "--font-satoshi",
});
