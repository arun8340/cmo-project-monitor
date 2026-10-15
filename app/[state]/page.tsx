import { Suspense } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { requireStateAccess } from "@/lib/auth/dal";
import { directiveScope, districtScope, issueScope, projectScope } from "@/lib/auth/scope";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/lib/constants";

/**
 * Temporary state home (step 2): proves login + role scoping end to end.
 * Replaced by the map dashboard in step 3.
 */
export default function StateHomePage({ params }: PageProps<"/[state]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview params={params} />
      </Suspense>
    </main>
  );
}

async function Overview({ params }: { params: PageProps<"/[state]">["params"] }) {
  const { state: stateParam } = await params;
  const { user, state } = await requireStateAccess(stateParam);

  const pScope = projectScope(user, state.code);
  const [byStatus, pendingIssues, openDirectives, districts] = await Promise.all([
    db.project.groupBy({ by: ["status"], where: pScope, _count: true }),
    db.issue.count({ where: { AND: [issueScope(user, state.code), { status: { in: ["PENDING", "IN_PROGRESS"] } }] } }),
    db.directive.count({ where: { AND: [directiveScope(user, state.code), { status: { in: ["OPEN", "IN_PROGRESS"] } }] } }),
    db.district.count({ where: districtScope(user, state.code) }),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count]));
  const total = byStatus.reduce((sum, r) => sum + r._count, 0);

  const scopeText: Record<string, string> = {
    ADMIN: `All data in ${state.name} (Admin — can switch states)`,
    CMO: `All districts and departments in ${state.name}`,
    DEPARTMENT_HEAD: `${user.departmentName} projects across all districts of ${state.name}`,
    DISTRICT_COLLECTOR: `All departments in ${user.districtName} district`,
    FIELD_OFFICER: `Projects assigned to you in ${user.districtName}`,
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome,</p>
        <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-emerald-600" />
            Your access
          </CardTitle>
          <CardDescription>
            {user.roleName} — {scopeText[user.roleKey]}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Stat label="Projects visible" value={total} />
          <Stat label="Districts accessible" value={districts} />
          <Stat label="Open issues" value={pendingIssues} />
          <Stat label="Open directives" value={openDirectives} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects by status</CardTitle>
          <CardDescription>Only projects within your scope are counted.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          {PROJECT_STATUSES.map((s) => (
            <Stat key={s} label={PROJECT_STATUS_LABELS[s]} value={counts[s] ?? 0} />
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        The interactive state map and dashboard will replace this page in the next build step.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-14 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
