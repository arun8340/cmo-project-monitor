import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ScrollTextIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { AuditLogView } from "@/components/audit/audit-log-view";
import { can, requireStateAccess } from "@/lib/auth/dal";
import { parseAuditFilters } from "@/lib/audit";

export const metadata: Metadata = { title: "Activity log" };

type Params = PageProps<"/[state]/activity">;

export default function ActivityPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Activity params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Activity({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!can(user, "audit.view")) notFound();
  const filters = { ...parseAuditFilters(sp), state: null };

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: state.name, href: basePath || "/" }, { label: "Activity log" }]} />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ScrollTextIcon className="size-6 text-muted-foreground" />
          Activity log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign-ins, project changes, uploads, issues and directives in {state.name}, with who did it and when.
        </p>
      </div>
      <AuditLogView
        filters={filters}
        scopeState={state.code}
        portal={user.portal}
        listPath={`${basePath}/activity`}
        csvPath="/api/audit/csv"
      />
    </div>
  );
}
