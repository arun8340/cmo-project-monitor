import type { Locale } from "@/lib/i18n/config";

/** The app's name in each interface language (shown under the name in the other language). */
export const APP_NAMES: Record<Locale, string> = {
  en: "CM Project Monitor",
  hi: "मुख्यमंत्री परियोजना निगरानी प्रणाली",
  mr: "मुख्यमंत्री प्रकल्प देखरेख प्रणाली",
};

/** Map-pin in an amber tile — the app's mark. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} aria-hidden>
      <rect x="1" y="1" width="32" height="32" rx="8" fill="none" stroke="var(--amber)" strokeWidth="2" />
      <path d="M17 8c-4 0-7 3-7 7 0 5 7 11 7 11s7-6 7-11c0-4-3-7-7-7z" fill="none" stroke="#f3f1ea" strokeWidth="2" />
      <circle cx="17" cy="15" r="2.5" fill="var(--amber)" />
    </svg>
  );
}
