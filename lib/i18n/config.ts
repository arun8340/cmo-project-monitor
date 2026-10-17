/**
 * Interface languages. Each state portal offers English plus the state's own
 * language (config/states.ts → `locale`); the admin portal is English only.
 * The choice is kept in a cookie per portal address, and Proxy passes it to the
 * app as a hidden first path segment (app/[locale]), so URLs stay clean.
 */
import { STATES } from "@/config/states";
import type { Portal } from "@/config/portals";

export const LOCALES = ["en", "hi", "mr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Each language's name in that language, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Languages offered on a portal (first = default). */
export function portalLocales(portal: Portal | null): Locale[] {
  if (!portal || portal.kind === "admin") return ["en"];
  return ["en", STATES[portal.stateCode].locale];
}

/** The language to use on a portal given the cookie value. */
export function resolveLocale(portal: Portal | null, cookie: string | undefined): Locale {
  const allowed = portalLocales(portal);
  return isLocale(cookie) && allowed.includes(cookie) ? cookie : allowed[0];
}

/**
 * BCP 47 tag for Intl formatting. Indian English date style; Hindi and Marathi
 * keep Latin digits so figures read the same as in the data and reports.
 */
export function intlLocale(locale: Locale) {
  return { en: "en-IN", hi: "hi-IN-u-nu-latn", mr: "mr-IN-u-nu-latn" }[locale];
}
