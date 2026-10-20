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
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("projectForm"))("editTitle") };
}

type Params = PageProps<"/[locale]/[state]/project/[id]/edit">;

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
  const [t, locale] = await Promise.all([getTranslations("projectForm"), getLocale()]);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: localName(locale, project.district.name, project.district.nameLocal), href: `${basePath}/district/${dSlug}` },
          { label: localName(locale, project.name, project.nameLocal), href: projectPath },
          { label: t("edit") },
        ]}
      />
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">{t("editTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("editIntro")}</p>
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
