import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { ProjectForm } from "@/components/project/project-form";
import { db } from "@/lib/db";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { canEditProject } from "@/lib/auth/project-permissions";
import { getProjectFormOptions } from "@/lib/data/project";
import { districtSlug } from "@/lib/district-slug";
import { toDateInput } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit project" };

type Params = PageProps<"/[state]/project/[id]/edit">;

export default function EditProjectPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <EditProject params={params} />
      </Suspense>
    </main>
  );
}

async function EditProject({ params }: { params: Params["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code || !canEditProject(user)) notFound();

  const [project, options] = await Promise.all([
    db.project.findUnique({ where: { id }, include: { district: true, department: true } }),
    getProjectFormOptions(user, state),
  ]);
  if (!project) notFound();

  const projectPath = `${basePath}/project/${id}`;
  const dSlug = districtSlug(project.district.geoCode);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: project.district.name, href: `${basePath}/district/${dSlug}` },
          { label: project.name, href: projectPath },
          { label: "Edit" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Changes are recorded in the project&apos;s activity log.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <ProjectForm
          mode="edit"
          stateSlug={state.code.toLowerCase()}
          projectId={project.id}
          initial={{
            name: project.name,
            nameLocal: project.nameLocal ?? "",
            description: project.description ?? "",
            department: project.department.code.toLowerCase(),
            district: dSlug,
            latitude: String(project.latitude),
            longitude: String(project.longitude),
            budgetLakhs: project.budgetLakhs == null ? "" : String(project.budgetLakhs),
            startDate: toDateInput(project.startDate),
            plannedEndDate: toDateInput(project.plannedEndDate),
          }}
          districts={options.districts}
          departments={options.departments}
          cancelHref={projectPath}
          accent={state.theme.primary}
        />
      </div>
    </div>
  );
}
