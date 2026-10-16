import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader, AppHeaderSkeleton } from "@/components/app-shell/app-header";
import { StateNav } from "@/components/app-shell/state-nav";
import { getStateConfig, STATE_CODES, type StateConfig } from "@/config/states";
import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessState } from "@/lib/auth/scope";
import { getNavCounts } from "@/lib/data/directives";
import { stateBasePath } from "@/config/portals";
import { getCurrentPortal } from "@/lib/portal";

export function generateStaticParams() {
  return STATE_CODES.map((code) => ({ state: code.toLowerCase() }));
}

/**
 * Shell for everything inside a state (/rj, /mh). No auth check here — layouts
 * don't re-run on navigation. Each page authorizes via requireStateAccess().
 */
export default function StateLayout({ children, params }: LayoutProps<"/[state]">) {
  return (
    <>
      <Suspense fallback={<AppHeaderSkeleton />}>
        <StateHeader params={params} />
      </Suspense>
      <div className="flex-1 bg-muted/30">{children}</div>
    </>
  );
}

async function StateHeader({ params }: { params: LayoutProps<"/[state]">["params"] }) {
  const { state } = await params;
  const config = getStateConfig(state.toUpperCase());
  const portal = await getCurrentPortal();
  // A state portal only ever renders its own state.
  if (!config || !portal || (portal.kind === "state" && portal.stateCode !== config.code)) notFound();
  const base = stateBasePath(portal, config.code);
  return (
    <AppHeader
      state={config}
      homeHref={base || "/"}
      nav={
        <Suspense fallback={<StateNav items={navItems(base)} />}>
          <NavWithCounts base={base} state={config} />
        </Suspense>
      }
    />
  );
}

function navItems(base: string, counts?: { openIssues: number; overdueDirectives: number }) {
  return [
    { section: "overview" as const, href: base || "/", label: "Overview" },
    { section: "issues" as const, href: `${base}/issues`, label: "Issues", count: counts?.openIssues },
    { section: "directives" as const, href: `${base}/directives`, label: "Directives", count: counts?.overdueDirectives, danger: true },
  ];
}

/** Open issues and overdue directives in the user's scope, for the nav badges. */
async function NavWithCounts({ base, state }: { base: string; state: StateConfig }) {
  const user = await getCurrentUser();
  if (!user || !canAccessState(user, state.code)) return <StateNav items={navItems(base)} />;
  return <StateNav items={navItems(base, await getNavCounts(user, state))} />;
}
