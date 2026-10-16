import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader, AppHeaderSkeleton } from "@/components/app-shell/app-header";
import { getStateConfig, STATE_CODES } from "@/config/states";
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
  return <AppHeader state={config} homeHref={stateBasePath(portal, config.code) || "/"} />;
}
