import Link from "next/link";
import { Suspense } from "react";
import { LandmarkIcon } from "lucide-react";
import type { StateConfig } from "@/config/states";
import { getCurrentUser } from "@/lib/auth/dal";
import { UserMenu } from "./user-menu";

/**
 * Top bar. The state band is static; the user menu streams in (it reads the session).
 * `homeHref` is where the app name links to (the state's map on its portal).
 */
export function AppHeader({ state, homeHref = "/" }: { state?: StateConfig; homeHref?: string }) {
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
          <span className="truncate text-sm font-semibold sm:text-base">CM Project Monitor</span>
          {state && (
            <span className="hidden items-center gap-2 text-sm text-white/80 sm:flex">
              <span className="text-white/40">|</span>
              {state.name}
              <span className="text-white/60">{state.nameLocal}</span>
            </span>
          )}
        </Link>
        <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />}>
          <HeaderUser />
        </Suspense>
      </div>
    </header>
  );
}

/** Placeholder bar shown while the state-specific header streams in. */
export function AppHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <span className="flex items-center gap-2.5">
          <LandmarkIcon className="size-5" />
          <span className="text-sm font-semibold sm:text-base">CM Project Monitor</span>
        </span>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" />
      </div>
    </header>
  );
}

async function HeaderUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const scopeLabel =
    user.roleKey === "ADMIN"
      ? "All states"
      : [user.districtName, user.departmentName].filter(Boolean).join(" · ") || "Whole state";

  return (
    <UserMenu
      name={user.name}
      roleName={user.designation ?? user.roleName}
      scopeLabel={scopeLabel}
      isAdmin={user.roleKey === "ADMIN"}
    />
  );
}
