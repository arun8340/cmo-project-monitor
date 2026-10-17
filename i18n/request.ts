import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { locale as rootLocale } from "next/root-params";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";

/**
 * next-intl configuration for each request. Pages and layouts get the language
 * from the hidden [locale] route segment; server actions and route handlers
 * can't read route params, so they fall back to the language cookie.
 */
export default getRequestConfig(async ({ locale: explicit }) => {
  let locale: string | undefined = explicit;
  if (!locale) {
    try {
      locale = await rootLocale();
    } catch {
      locale = (await cookies()).get(LOCALE_COOKIE)?.value;
    }
  }
  const resolved: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const english = (await import("../messages/en.json")).default;
  // Any key missing from a translation falls back to English rather than
  // breaking the page (`npm run check:messages` lists missing keys).
  const messages = resolved === "en" ? english : merge(english, (await import(`../messages/${resolved}.json`)).default);
  return { locale: resolved, messages, timeZone: "Asia/Kolkata" };
});

type Tree = { [key: string]: string | Tree };

function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] = typeof v === "object" && typeof b === "object" ? merge(b, v) : v;
  }
  return out;
}
