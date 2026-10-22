import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader, AppHeaderSkeleton } from "@/components/app-shell/app-header";
import { StateNav, type NavItem } from "@/components/app-shell/state-nav";
import { getStateConfig, STATE_CODES, type StateConfig } from "@/config/states";
import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessState } from "@/lib/auth/scope";
import { getNavCounts } from "@/lib/data/directives";
import { stateBasePath } from "@/config/portals";
import { getCurrentPortal } from "@/lib/portal";
import { getTranslations } from "next-intl/server";

export function generateStaticParams() {
  return STATE_CODES.map((code) => ({ state: code.toLowerCase() }));
}

/**
 * Shell for everything inside a state (/rj, /mh). No auth check here — layouts
 * don't re-run on navigation. Each page authorizes via requireStateAccess().
 */
export default function StateLayout({ children, params }: LayoutProps<"/[locale]/[state]">) {
  return (
    <>
      <Suspense fallback={<AppHeaderSkeleton />}>
        <StateHeader params={params} />
      </Suspense>
      <div className="app-backdrop flex-1 bg-background">{children}</div>
    </>
  );
}

async function StateHeader({ params }: { params: LayoutProps<"/[locale]/[state]">["params"] }) {
  const { state } = await params;
  const config = getStateConfig(state.toUpperCase());
  const portal = await getCurrentPortal();
  // A state portal only ever renders its own state.
  if (!config || !portal || (portal.kind === "state" && portal.stateCode !== config.code)) notFound();
  const base = stateBasePath(portal, config.code);
  const t = await getTranslations("nav");
  const labels = {
    overview: t("overview"),
    projects: t("projects"),
    imagery: t("imagery"),
    issues: t("issues"),
    directives: t("directives"),
    activity: t("activity"),
  };
  return (
    <AppHeader
      state={config}
      homeHref={base || "/"}
      nav={
        <Suspense fallback={<StateNav items={navItems(base, labels)} />}>
          <NavWithCounts base={base} state={config} labels={labels} />
        </Suspense>
      }
    />
  );
}

type NavLabels = Record<"overview" | "projects" | "imagery" | "issues" | "directives" | "activity", string>;

function navItems(base: string, l: NavLabels, counts?: { openIssues: number; overdueDirectives: number }, showActivity = false): NavItem[] {
  return [
    { key: "overview", href: base || "/", label: l.overview, fallback: true },
    { key: "projects", href: `${base}/projects`, label: l.projects },
    { key: "imagery", href: `${base}/imagery`, label: l.imagery },
    { key: "issues", href: `${base}/issues`, label: l.issues, count: counts?.openIssues },
    { key: "directives", href: `${base}/directives`, label: l.directives, count: counts?.overdueDirectives, danger: true },
    ...(showActivity ? [{ key: "activity", href: `${base}/activity`, label: l.activity }] : []),
  ];
}

/** Open issues and overdue directives in the user's scope, for the nav badges. */
async function NavWithCounts({ base, state, labels }: { base: string; state: StateConfig; labels: NavLabels }) {
  const user = await getCurrentUser();
  if (!user || !canAccessState(user, state.code)) return <StateNav items={navItems(base, labels)} />;
  return <StateNav items={navItems(base, labels, await getNavCounts(user, state), user.permissions.includes("audit.view"))} />;
}
