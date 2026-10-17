"use client";

import { useLocale, useTranslations } from "next-intl";
import { LanguagesIcon } from "lucide-react";
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

  const box = tone === "dark" ? "border-white/20 bg-white/5" : "border-border bg-background";
  const on = tone === "dark" ? "bg-white text-slate-900" : "bg-foreground text-background";
  const off = tone === "dark" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div role="group" aria-label={t("language")} className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${box}`}>
      <LanguagesIcon className={`mx-1 size-3.5 ${tone === "dark" ? "text-white/60" : "text-muted-foreground"}`} aria-hidden />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => choose(l)}
          aria-pressed={l === current}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${l === current ? on : off}`}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
