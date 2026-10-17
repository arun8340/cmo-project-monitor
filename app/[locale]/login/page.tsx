import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LandmarkIcon, SatelliteIcon, ClipboardCheckIcon, MapIcon, ShieldIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { STATES, STATE_CODES } from "@/config/states";
import { DEMO_ACCOUNTS } from "@/config/demo-accounts";
import { getCurrentPortal } from "@/lib/portal";
import { portalLocales } from "@/lib/i18n/config";
import { localName } from "@/lib/i18n/names";
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
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
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
  const accent = state?.theme.primary ?? "#0f172a";
  const demoAccounts = DEMO_ACCOUNTS.filter((a) => a.portal === portal.id);

  return (
    <>
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 text-slate-100 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent }} />
        <div className="relative flex items-center gap-2.5 text-sm font-medium tracking-wide">
          <LandmarkIcon className="size-5" />
          {state ? (
            <>
              {t("cmOffice", { state: stateName })}
              {locale === "en" && <span className="font-normal text-slate-400">{state.nameLocal}</span>}
            </>
          ) : (
            t("adminOffice")
          )}
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">{state ? t("headlineState", { state: stateName }) : t("headline")}</h1>
          <p className="mt-3 text-slate-300">{t("tagline")}</p>
          <ul className="mt-8 grid gap-4">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3 text-sm text-slate-200">
                <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex gap-6 text-sm text-slate-400">
          {state ? (
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
              {state.name} · {state.nameLocal}
            </span>
          ) : (
            STATE_CODES.map((code) => (
              <span key={code} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATES[code].theme.primary }} />
                {STATES[code].name}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex min-h-7 justify-end">
          <LanguageSwitcher locales={portalLocales(portal)} tone="light" />
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-6 flex items-center gap-2 text-sm font-medium lg:hidden" style={{ color: accent }}>
                <LandmarkIcon className="size-4" />
                {state ? t("brandState", { state: stateName }) : t("brandAdmin")}
              </div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                {!state && <ShieldIcon className="size-5 text-muted-foreground" />}
                {state ? t("signIn") : t("adminSignIn")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{state ? t("useAccount", { state: stateName }) : t("adminOnly")}</p>
            </div>
            <Suspense>
              <LoginForm demoAccounts={demoAccounts} />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}

function LoginSkeleton() {
  return (
    <>
      <section className="hidden bg-slate-900 lg:block" />
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="grid w-full max-w-sm gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </section>
    </>
  );
}
