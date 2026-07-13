"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Marketing pages are always light + LTR/English, regardless of the
 * in-app theme (dark mode) and language (Hebrew/RTL) preferences a
 * signed-in user may have set for the dashboard (see AppShell.tsx and
 * HtmlLocaleSync.tsx, which apply those preferences to
 * document.documentElement globally).
 */
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;

    const previousDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;
    const previousDir = root.dir;
    const previousLang = root.lang;

    root.classList.remove("dark");
    root.style.colorScheme = "light";
    root.dir = "ltr";
    root.lang = "en";

    return () => {
      root.classList.toggle("dark", previousDark);
      root.style.colorScheme = previousColorScheme;
      root.dir = previousDir;
      root.lang = previousLang;
    };
  }, []);

  return <>{children}</>;
}
