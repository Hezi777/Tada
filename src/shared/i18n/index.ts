"use client";

import { useSyncExternalStore } from "react";
import {
  LANGUAGE_EVENT,
  readLanguageCode,
  type LanguageCode,
} from "@/features/dashboard/client/locale";
import { translations, type TranslationKey } from "./dictionary";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(LANGUAGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Reactively read the active language; re-renders on language change. */
export function useLanguage(): LanguageCode {
  return useSyncExternalStore(subscribe, readLanguageCode, () => "en");
}

export function useTranslation(): {
  t: (key: TranslationKey) => string;
  lang: LanguageCode;
} {
  const lang = useLanguage();
  const t = (key: TranslationKey): string =>
    translations[lang][key] ?? translations.en[key] ?? key;
  return { t, lang };
}

export type { TranslationKey };
