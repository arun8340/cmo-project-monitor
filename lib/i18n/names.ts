import type { Locale } from "./config";

/**
 * Places, departments and projects have an English and a local-language name.
 * In English the English name leads; in Hindi / Marathi the local one does,
 * with the other shown alongside (if there is one).
 */
export function localNames(locale: Locale, name: string, nameLocal: string | null | undefined) {
  if (!nameLocal || nameLocal === name) return { primary: name, secondary: null };
  return locale === "en" ? { primary: name, secondary: nameLocal } : { primary: nameLocal, secondary: name };
}

/** Just the name to show in running text. */
export function localName(locale: Locale, name: string, nameLocal: string | null | undefined) {
  return locale !== "en" && nameLocal ? nameLocal : name;
}
