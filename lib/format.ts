/**
 * Display formatting shared by server and client components. Fixed time zone
 * (IST); the language comes from the caller — `getLocale()` on the server,
 * `useLocale()` in client components — and defaults to English.
 */
import { intlLocale, type Locale } from "@/lib/i18n/config";

const TZ = "Asia/Kolkata";

/** "16 Oct 2026" / "16 अक्टू॰ 2026". */
export function formatDate(d: Date | string | null | undefined, locale: Locale = "en") {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

/** "October 2026". */
export function formatMonth(d: Date | string, locale: Locale = "en") {
  return new Date(d).toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric", timeZone: TZ });
}

const BUDGET_UNITS: Record<Locale, { lakh: string; crore: string }> = {
  en: { lakh: "L", crore: "Cr" },
  hi: { lakh: "लाख", crore: "करोड़" },
  mr: { lakh: "लाख", crore: "कोटी" },
};

/** Budget stored in ₹ lakh → "₹85 L" or "₹24.5 Cr" (₹85 लाख / ₹24.5 करोड़). */
export function formatBudget(lakhs: number | null | undefined, locale: Locale = "en") {
  if (lakhs == null) return "—";
  const unit = BUDGET_UNITS[locale];
  if (lakhs >= 100) {
    const crore = lakhs / 100;
    return `₹${crore >= 100 ? Math.round(crore).toLocaleString("en-IN") : crore.toFixed(crore >= 10 ? 0 : 1)} ${unit.crore}`;
  }
  return `₹${Math.round(lakhs)} ${unit.lakh}`;
}

/** File size → "740 KB" / "3.2 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const DAY_MS = 86_400_000;

/** Whole IST calendar days from `from` to `to` (positive if `to` is later). */
export function daysBetween(from: Date, to: Date) {
  const ist = (d: Date) => Math.floor((d.getTime() + 5.5 * 3_600_000) / DAY_MS);
  return ist(to) - ist(from);
}

/** "today", "3 days ago", "in 5 days" (आज, 3 दिन पहले, …). */
export function relativeDays(date: Date, now = new Date(), locale: Locale = "en") {
  return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" }).format(daysBetween(now, date), "day");
}

/** "16 Oct 2026, 2:05 pm" (IST). */
export function formatDateTime(d: Date | string, locale: Locale = "en") {
  return new Date(d).toLocaleString(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });
}
