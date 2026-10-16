import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ConstructionIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { StatusBadge } from "@/components/project/status-badge";
import { ProgressCell } from "@/components/project/progress-cell";
import { db } from "@/lib/db";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { districtSlug } from "@/lib/district-slug";
import { formatBudget, formatDate } from "@/lib/format";
import { behindBy, plannedPercent } from "@/lib/progress";
import type { ProjectStatus } from "@/lib/constants";

/** Placeholder project page (step 4). Step 5 builds the full project detail. */
export default function ProjectPage({ params }: PageProps<"/[state]/project/[id]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Project params={params} />
      </Suspense>
    </main>
  );
}

async function Project({ params }: { params: PageProps<"/[state]/project/[id]">["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code) notFound();

  const project = await db.project.findUnique({
    where: { id },
    include: { district: true, department: true },
  });
  if (!project) notFound();

  const status = project.status as ProjectStatus;
  const planned = plannedPercent(project.startDate, project.plannedEndDate);
  const dSlug = districtSlug(project.district.geoCode);
  const districtPath = `${basePath}/district/${dSlug}`;

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: project.district.name, href: districtPath },
          { label: project.department.name, href: `${districtPath}/${project.department.code.toLowerCase()}` },
          { label: project.name },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.nameLocal && <p className="text-muted-foreground">{project.nameLocal}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressCell actual={project.progressPercent} planned={planned} behind={behindBy(status, project.progressPercent, planned)} />
        <Fact label="Budget" value={formatBudget(project.budgetLakhs)} />
        <Fact label="Start" value={formatDate(project.startDate)} />
        <Fact label="Planned end" value={formatDate(project.plannedEndDate)} />
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
        <ConstructionIcon className="size-5 shrink-0" />
        The full project page — site map, progress timeline, imagery, issues and directives — arrives in the next build step.
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
