import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { StateConfig } from "@/config/states";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCurrentPortal } from "@/lib/portal";
import { portalLocales } from "@/lib/i18n/config";
import { localNames } from "@/lib/i18n/names";
import { getLabels } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { UserMenu } from "./user-menu";
import { APP_NAMES, BrandMark } from "./brand";
import { DEMO_MODE } from "@/lib/demo";

/**
 * Top bar (navy): app mark and name, the state's government, and — streamed in,
 * since it reads the session — the language switch and user menu.
 * `homeHref` is where the app name links to; `nav` is an optional row of
 * section tabs under the bar.
 */
export function AppHeader({ state, homeHref = "/", nav }: { state?: StateConfig; homeHref?: string; nav?: ReactNode }) {
  const t = useTranslations("app");
  const locale = useLocale();
  const subtitle = locale === "en" ? APP_NAMES[state?.locale ?? "hi"] : APP_NAMES.en;
  const government = state ? localNames(locale, state.government.name, state.government.nameLocal) : null;
  return (
    <header className="sticky top-0 z-40 shadow-sm">
      <div className="bg-navy text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <BrandMark className="size-9 shrink-0" />
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-[15px] font-bold sm:text-base">{t("name")}</span>
              <span className="hidden truncate text-[11px] text-white/70 sm:block">{subtitle}</span>
            </span>
          </Link>
          {DEMO_MODE && <DemoBadge />}
          {government && (
            <span className="hidden items-center gap-2 rounded-lg bg-white/[0.07] px-3.5 py-1.5 text-sm lg:flex">
              <span className="font-semibold">{government.primary}</span>
              {government.secondary && <span className="text-white/70">{government.secondary}</span>}
            </span>
          )}
          <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />}>
            <HeaderUser />
          </Suspense>
        </div>
      </div>
      {nav && <div className="border-b bg-card">{nav}</div>}
    </header>
  );
}

/** Placeholder bar shown while the state-specific header streams in. */
export function AppHeaderSkeleton() {
  const t = useTranslations("app");
  return (
    <header className="sticky top-0 z-40 shadow-sm">
      <div className="bg-navy text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <span className="flex items-center gap-3">
            <BrandMark className="size-9" />
            <span className="text-[15px] font-bold sm:text-base">{t("name")}</span>
          </span>
          <div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="h-11 border-b bg-card" />
    </header>
  );
}

async function HeaderUser() {
  const [user, portal, t, labels] = await Promise.all([getCurrentUser(), getCurrentPortal(), getTranslations("header"), getLabels()]);
  if (!user) return null;

  const scopeLabel =
    user.roleKey === "ADMIN" ? t("allStates") : [user.districtName, user.departmentName].filter(Boolean).join(" · ") || t("wholeState");

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block">
        <LanguageSwitcher locales={portalLocales(portal)} />
      </div>
      <UserMenu
        name={user.name}
        roleName={user.designation ?? labels.role[user.roleKey]}
        scopeLabel={scopeLabel}
        isAdmin={user.roleKey === "ADMIN"}
        locales={portalLocales(portal)}
      />
    </div>
  );
}

/** Shown on demo deployments (DEMO_MODE): data is a sample and changes reset. */
export function DemoBadge({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const t = useTranslations("header");
  return (
    <span
      title={t("demoHint")}
      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${
        tone === "dark" ? "bg-amber/20 text-amber ring-1 ring-amber/40" : "bg-warn-soft text-warn"
      }`}
    >
      {t("demoBadge")}
    </span>
  );
}
