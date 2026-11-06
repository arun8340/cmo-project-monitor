import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import { APP_NAMES, BrandMark } from "@/components/app-shell/brand";
import { DemoBadge } from "@/components/app-shell/app-header";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SatelliteStrip } from "@/components/landing/satellite-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { getPortals, isMainHostFromHeaders } from "@/config/portals";
import { STATES, STATE_CODES, type StateCode } from "@/config/states";
import { UPCOMING_STATES } from "@/config/upcoming-states";
import { DEMO_MODE } from "@/lib/demo";
import { MAIN_LOCALES, type Locale } from "@/lib/i18n/config";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("main"))("title") };
}

/**
 * Public main page (PORTAL_HOST_MAIN): the states that have a portal, each
 * linking to that portal's sign-in, plus states that are coming. No project
 * data is shown here, and the admin portal is deliberately not linked.
 */
export default function MainPage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-navy text-white">
      <SatelliteStrip />
      <div aria-hidden className="absolute inset-0 bg-navy/70" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-navy/60"
      />
      <Suspense fallback={<MainSkeleton />}>
        <StateSelection />
      </Suspense>
    </main>
  );
}

async function StateSelection() {
  const h = await headers();
  if (!isMainHostFromHeaders(h)) notFound();

  const [t, tApp, tLogin, locale] = await Promise.all([
    getTranslations("main"),
    getTranslations("app"),
    getTranslations("login"),
    getLocale(),
  ]);
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0] ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const portals = getPortals();
  const loginUrl = (code: StateCode) => {
    const portal = portals.find(
      (p) => p.kind === "state" && p.stateCode === code,
    );
    return portal ? `${proto}://${portal.host}/login` : null;
  };

  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-10 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-9 shrink-0 sm:size-10" />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-bold sm:text-lg">
              {tApp("name")}
            </span>
            <span className="hidden truncate text-xs text-white/70 sm:block">
              {tApp("tagline")}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {DEMO_MODE && (
            <span className="hidden sm:inline-flex">
              <DemoBadge />
            </span>
          )}
          <LanguageSwitcher locales={MAIN_LOCALES} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-10 sm:py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-wide text-amber uppercase">
            {tApp("name")}
          </p>
          <h1 className="mt-2 text-[30px] leading-[1.15] font-bold tracking-tight text-[#f3f1ea] [text-shadow:0_2px_12px_rgb(0_0_0/0.35)] sm:text-[44px]">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            {t("intro")}
          </p>
        </div>

        <h2 className="mt-8 mb-3 text-xs font-semibold tracking-wider text-white/70 uppercase sm:mt-10">
          {t("available")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {STATE_CODES.map((code) => {
            const st = STATES[code];
            const href = loginUrl(code);
            const name = localName(locale, st.name, st.nameLocal);
            const card = (
              <>
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ background: st.theme.primary }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative district outline */}
                <img
                  src={`/landing/state-${code.toLowerCase()}.svg`}
                  alt=""
                  width={200}
                  height={180}
                  className="pointer-events-none absolute -right-4 -bottom-6 h-36 w-auto opacity-35 transition group-hover:opacity-60 sm:h-52 sm:opacity-80 sm:group-hover:opacity-100"
                />
                <span className="relative grid gap-1">
                  <span className="text-2xl font-bold tracking-tight text-[#f3f1ea] sm:text-[28px]">
                    {st.name}
                  </span>
                  <span className="text-lg text-white/80" lang={st.locale}>
                    {st.nameLocal}
                  </span>
                  <span className="mt-2 text-sm text-white/70">
                    {locale === "en"
                      ? st.government.name
                      : st.government.nameLocal}
                  </span>
                  <span className="text-sm text-white/70">
                    {tLogin("cmOffice", { state: name })}
                  </span>
                </span>
                <span className="relative mt-8 inline-flex w-fit items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-navy transition group-hover:gap-3">
                  {t("signIn")}
                  <ArrowRightIcon className="size-4" />
                </span>
              </>
            );
            const cls =
              "group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-navy/60 p-6 pl-8 shadow-xl backdrop-blur-sm transition";
            return (
              <li key={code}>
                {href ? (
                  <a
                    href={href}
                    aria-label={t("openPortal", { state: name })}
                    className={`${cls} hover:border-amber/70 hover:bg-navy/75 focus-visible:ring-2 focus-visible:ring-amber focus-visible:outline-none`}
                  >
                    {card}
                  </a>
                ) : (
                  <div className={cls}>{card}</div>
                )}
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 mb-3 text-xs font-semibold tracking-wider text-white/70 uppercase">
          {t("comingSoon")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {UPCOMING_STATES.map((st) => (
            <li
              key={st.code}
              className="flex cursor-not-allowed flex-col gap-0.5 rounded-xl border border-dashed border-white/15 bg-white/[0.04] p-4 text-white/50 select-none"
            >
              <span className="font-semibold">{st.name}</span>
              <span className="text-sm" lang={locale === "en" ? "hi" : locale}>
                {st.nameLocal}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs">
                <ClockIcon className="size-3" />
                {t("comingSoon")}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-2xl text-sm text-white/65">{t("note")}</p>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-x-10 gap-y-2 px-4 pb-5 sm:px-10">
        <p className="text-xs text-white/60">
          {APP_NAMES.en} ·{" "}
          {APP_NAMES[(locale === "en" ? "hi" : locale) as Locale]}
        </p>
        <p className="text-[11px] text-white/60">{tLogin("imageryCredit")}</p>
      </footer>
    </div>
  );
}

function MainSkeleton() {
  return (
    <div className="relative mx-auto grid min-h-svh w-full max-w-6xl content-center gap-4 px-4 sm:grid-cols-2 sm:px-10">
      <Skeleton className="h-56 w-full rounded-2xl bg-white/10" />
      <Skeleton className="h-56 w-full rounded-2xl bg-white/10" />
    </div>
  );
}
