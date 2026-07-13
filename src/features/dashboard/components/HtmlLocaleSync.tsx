"use client";

import { useEffect } from "react";
import { LANGUAGE_STORAGE_KEY, LANGUAGE_EVENT } from "@/features/dashboard/client/locale";

/** Applies the persisted language preference to the <html> element (dir + lang). */
export function HtmlLocaleSync() {
  useEffect(() => {
    const apply = () => {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const isHebrew = stored === "he";
      const root = document.documentElement;
      root.dir = isHebrew ? "rtl" : "ltr";
      root.lang = isHebrew ? "he" : "en";
    };

    apply();

    window.addEventListener(LANGUAGE_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}
