"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";

/** Remembers the language for this portal address (read by Proxy on every request). */
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Switches the interface language for this portal. The choice is a cookie on
 * the portal's address; Proxy reads it on every request, so the page reloads
 * to render everything — including server-rendered text — in the new language.
 */
export function LanguageSwitcher({ locales, tone = "dark" }: { locales: Locale[]; tone?: "dark" | "light" }) {
  const current = useLocale();
  const t = useTranslations("header");
  if (locales.length < 2) return null;

  function choose(locale: Locale) {
    if (locale === current) return;
    rememberLocale(locale);
    window.location.reload();
  }

  const box = tone === "dark" ? "border-white/15 bg-white/[0.06]" : "border-border bg-card";
  const on = "bg-amber text-navy";
  const off = tone === "dark" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div role="group" aria-label={t("language")} className={`flex items-center gap-0.5 rounded-lg border p-1 ${box}`}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={LOCALE_NAMES[l]}
          onClick={() => choose(l)}
          aria-pressed={l === current}
          className={`min-w-9 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${l === current ? on : off}`}
        >
          {l === "en" ? "EN" : LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
