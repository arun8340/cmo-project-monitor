import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRightIcon, LandmarkIcon } from "lucide-react";
import { getPortals } from "@/config/portals";
import { STATES } from "@/config/states";

export const metadata: Metadata = { title: "Portals" };

/**
 * Development helper: plain http://localhost:3000 lists the portal addresses.
 * Proxy only routes here from localhost in development; in production it 404s.
 */
export default function PortalsPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <LandmarkIcon className="size-4" />
          CM Project Monitor · development
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each state has its own address. Users can only sign in on their own state&apos;s portal.
        </p>
        <Suspense>
          <PortalList />
        </Suspense>
      </div>
    </main>
  );
}

async function PortalList() {
  await connection();
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <ul className="mt-6 grid gap-3">
      {getPortals().map((p) => {
        const state = p.kind === "state" ? STATES[p.stateCode] : null;
        return (
          <li key={p.id}>
            <a
              href={`http://${p.host}/login`}
              className="group flex items-center justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-md"
              style={{ borderLeft: `4px solid ${state?.theme.primary ?? "#0f172a"}` }}
            >
              <span>
                <span className="block font-medium">{state ? `${state.name} portal` : "Admin portal"}</span>
                <span className="block font-mono text-xs text-muted-foreground">http://{p.host}</span>
              </span>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
