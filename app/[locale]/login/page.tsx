import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SatelliteIcon, ClipboardCheckIcon, MapIcon, ShieldIcon } from "lucide-react";
import { APP_NAMES, BrandMark } from "@/components/app-shell/brand";
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
  const demoAccounts = DEMO_ACCOUNTS.filter((a) => a.portal === portal.id);

  return (
    <>
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div className="relative flex items-center gap-3">
          <BrandMark className="size-10" />
          <span className="text-lg font-bold">{state ? t("cmOffice", { state: stateName }) : t("adminOffice")}</span>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-[44px] leading-[1.1] font-bold tracking-tight text-[#f3f1ea]">{t("heroTitle")}</h1>
          <p className="mt-5 text-lg leading-relaxed text-white/80">{t("heroBody")}</p>
          <p className="mt-4 font-semibold text-amber">{state ? `${APP_NAMES[state.locale]} · ${APP_NAMES.en}` : `${APP_NAMES.hi} · ${APP_NAMES.mr}`}</p>
          <ul className="mt-8 grid gap-3">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3 text-[15px] text-white/85">
                <Icon className="mt-0.5 size-4 shrink-0 text-amber" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex gap-10">
          {(state ? [state] : STATE_CODES.map((c) => STATES[c])).map((st) => (
            <div key={st.code}>
              <div className="font-bold">{st.government.name}</div>
              <div className="text-sm text-white/70">{st.government.nameLocal}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col bg-background px-4 py-6 sm:px-8">
        <div className="flex min-h-7 justify-end">
          <LanguageSwitcher locales={portalLocales(portal)} tone="light" />
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-8 flex items-center gap-3 rounded-xl bg-navy p-3 text-white lg:hidden">
                <BrandMark className="size-9" />
                <span className="text-sm font-bold">{state ? t("brandState", { state: stateName }) : t("brandAdmin")}</span>
              </div>
              <h2 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight text-navy [&>svg]:hidden">
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
      <section className="hidden bg-navy lg:block" />
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
