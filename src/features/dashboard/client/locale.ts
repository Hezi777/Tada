// Language preference -> document direction/locale wiring (no i18n library).
// "he" flips the app to RTL + Hebrew typography; anything else stays LTR/English.

export const LANGUAGE_STORAGE_KEY = "tada-language";
export const LANGUAGE_EVENT = "tada-language-change";

export type LanguageCode = "en" | "he";

export function languageCodeFromLabel(label: string): LanguageCode {
  return label.startsWith("Hebrew") ? "he" : "en";
}

export function readLanguageCode(): LanguageCode {
  if (typeof window === "undefined") {
    return "en";
  }
  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "he"
    ? "he"
    : "en";
}

export function persistLanguageCode(code: LanguageCode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
