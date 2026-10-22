import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SatelliteIcon, ClipboardCheckIcon, MapIcon, ShieldIcon } from "lucide-react";
import { APP_NAMES, BrandMark } from "@/components/app-shell/brand";
import { DemoBadge } from "@/components/app-shell/app-header";
import { DEMO_MODE } from "@/lib/demo";
import { getLocale, getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { STATES, STATE_CODES } from "@/config/states";
import { DEMO_ACCOUNTS } from "@/config/demo-accounts";
import { getCurrentPortal } from "@/lib/portal";
import { portalLocales } from "@/lib/i18n/config";
import { localName } from "@/lib/i18n/names";
import { SatelliteStrip } from "@/components/landing/satellite-strip";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("login"))("title") };
}

const FEATURES = [
  { icon: MapIcon, key: "featureMap" },
  { icon: SatelliteIcon, key: "featureImagery" },
  { icon: ClipboardCheckIcon, key: "featureTracking" },
] as const;

export default function LoginPage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-navy text-white">
      <SatelliteStrip />
      {/* Darker on the left for the title, lighter on the right so the imagery shows */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/50 to-navy/5" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-navy/50" />
      <Suspense fallback={<LoginSkeleton />}>
        <PortalLogin />
      </Suspense>
    </main>
  );
}

/** Branding and demo accounts depend on which portal (address) this is. */
async function PortalLogin() {
  const portal = await getCurrentPortal();
  if (!portal) notFound();

  const [t, locale] = await Promise.all([getTranslations("login"), getLocale()]);
  const state = portal.kind === "state" ? STATES[portal.stateCode] : null;
  const stateName = state ? localName(locale, state.name, state.nameLocal) : "";
  const demoAccounts = DEMO_ACCOUNTS.filter((a) => a.portal === portal.id);

  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-10 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-9 shrink-0 sm:size-10" />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-bold sm:text-lg">{state ? t("cmOffice", { state: stateName }) : t("adminOffice")}</span>
            <span className="hidden truncate text-xs text-white/70 sm:block">
              {state ? `${APP_NAMES[state.locale]} · ${APP_NAMES.en}` : `${APP_NAMES.en} · ${APP_NAMES.hi}`}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {DEMO_MODE && (
            <span className="hidden sm:inline-flex">
              <DemoBadge />
            </span>
          )}
          <LanguageSwitcher locales={portalLocales(portal)} />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-4 py-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="max-w-2xl">
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-tight text-[#f3f1ea] [text-shadow:0_2px_12px_rgb(0_0_0/0.35)] sm:text-[40px] lg:text-[46px]">
            {t("heroTitle")} <span className="mt-1 block text-amber">{t("heroTitleImagery")}</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:mt-5 sm:text-lg">{t("heroBody")}</p>
          <ul className="mt-6 hidden gap-2.5 sm:grid">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3 text-[15px] text-white/85">
                <Icon className="mt-0.5 size-4 shrink-0 text-amber" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-sm justify-self-center rounded-2xl bg-card p-6 text-foreground shadow-2xl ring-1 ring-black/5 lg:justify-self-end">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-navy">
            {!state && <ShieldIcon className="size-5 text-muted-foreground" />}
            {state ? t("signIn") : t("adminSignIn")}
          </h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">{state ? t("useAccount", { state: stateName }) : t("adminOnly")}</p>
          <Suspense>
            <LoginForm demoAccounts={demoAccounts} />
          </Suspense>
        </div>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 px-4 pb-5 sm:px-10">
        <div className="flex gap-8">
          {(state ? [state] : STATE_CODES.map((c) => STATES[c])).map((st) => (
            <div key={st.code}>
              <div className="text-sm font-bold">{st.government.name}</div>
              <div className="text-xs text-white/70">{st.government.nameLocal}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/60">{t("imageryCredit")}</p>
      </footer>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="relative mx-auto flex min-h-svh w-full max-w-7xl items-center justify-center px-4 sm:px-10 lg:justify-end">
      <div className="grid w-full max-w-sm gap-4 rounded-2xl bg-card p-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
