import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LandmarkIcon } from "lucide-react";
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

/**
 * Top bar. The state band is static; the user menu streams in (it reads the session).
 * `homeHref` is where the app name links to (the state's map on its portal);
 * `nav` is an optional row of section links under the bar.
 */
export function AppHeader({ state, homeHref = "/", nav }: { state?: StateConfig; homeHref?: string; nav?: ReactNode }) {
  const t = useTranslations("app");
  const locale = useLocale();
  const stateName = state ? localNames(locale, state.name, state.nameLocal) : null;
  return (
    <header
      className="sticky top-0 z-40 text-white shadow-sm"
      style={{ backgroundColor: state?.theme.primary ?? "#0f172a" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <LandmarkIcon className="size-5 shrink-0" />
          <span className="truncate text-sm font-semibold sm:text-base">{t("name")}</span>
          {stateName && (
            <span className="hidden items-center gap-2 text-sm text-white/80 sm:flex">
              <span className="text-white/40">|</span>
              {stateName.primary}
              {stateName.secondary && <span className="text-white/60">{stateName.secondary}</span>}
            </span>
          )}
        </Link>
        <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />}>
          <HeaderUser />
        </Suspense>
      </div>
      {nav && <div className="border-t border-white/10">{nav}</div>}
    </header>
  );
}

/** Placeholder bar shown while the state-specific header streams in. */
export function AppHeaderSkeleton() {
  const t = useTranslations("app");
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <span className="flex items-center gap-2.5">
          <LandmarkIcon className="size-5" />
          <span className="text-sm font-semibold sm:text-base">{t("name")}</span>
        </span>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />
      </div>
    </header>
  );
}

async function HeaderUser() {
  const [user, portal, t, labels] = await Promise.all([getCurrentUser(), getCurrentPortal(), getTranslations("header"), getLabels()]);
  if (!user) return null;

  const scopeLabel =
    user.roleKey === "ADMIN" ? t("allStates") : [user.districtName, user.departmentName].filter(Boolean).join(" · ") || t("wholeState");

  return (
    <div className="flex items-center gap-2">
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
