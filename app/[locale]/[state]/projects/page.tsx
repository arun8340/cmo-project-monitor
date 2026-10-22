import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/app-shell/page-parts";
import { ListControls } from "@/components/project/list-controls";
import { Chip, EmptyState, ProjectCards, ProjectTable } from "@/components/project/project-table";
import { MapHighlightProvider } from "@/components/district-map/highlight";
import { requireStateAccess } from "@/lib/auth/dal";
import { canCreateProject } from "@/lib/auth/project-permissions";
import { filtersQuery, getStateProjects, parseProjectFilters } from "@/lib/data/projects";
import type { ProjectStatus } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";
import { getLabels } from "@/lib/i18n/server";
import { STATUS_COLOR, type StatusCounts } from "@/lib/district-health";

type Params = PageProps<"/[locale]/[state]/projects">;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("projects"))("title") };
}

export default function ProjectsPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<ListSkeleton />}>
        <Projects params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const COUNT_KEY: Record<ProjectStatus, keyof Omit<StatusCounts, "total">> = {
  ONGOING: "ongoing",
  DELAYED: "delayed",
  STALLED: "stalled",
  COMPLETED: "completed",
  NOT_STARTED: "notStarted",
};
const CHIP_ORDER: ProjectStatus[] = ["ONGOING", "DELAYED", "STALLED", "COMPLETED", "NOT_STARTED"];

async function Projects({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const { options, filters, counts, rows } = await getStateProjects(user, state, parseProjectFilters(sp));
  const [t, tl, labels, locale] = await Promise.all([getTranslations("projects"), getTranslations("projectList"), getLabels(), getLocale()]);
  const path = `${basePath}/projects`;
  const stateName = localName(locale, state.name, state.nameLocal);
  const statusLabel = filters.statuses.map((s) => labels.projectStatus[s]).join(" + ");
  const filtered = !!(filters.statuses.length || filters.district || filters.dept || filters.q);

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: stateName, href: basePath || "/" }, { label: t("title") }]} />

      <PageHeader
        title={filters.statuses.length ? t("titleStatus", { status: statusLabel }) : t("title")}
        subtitle={
          <>
            {t("summary", { count: rows.length, state: stateName })}
            {filters.q && <> {tl("matching", { q: filters.q })}</>}
          </>
        }
        actions={
          canCreateProject(user) && (
            <Button nativeButton={false} render={<Link href={`${basePath}/project/new`} />}>
              <PlusIcon />
              {tl("addProject")}
            </Button>
          )
        }
      />

      <div className="grid gap-3">
        <nav aria-label={tl("filterByStatus")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip href={`${path}${filtersQuery(filters, { status: null })}`} active={!filters.statuses.length} label={tl("all")} count={counts.total} />
          {CHIP_ORDER.map((s) => (
            <Chip
              key={s}
              href={`${path}${filtersQuery(filters, { status: s.toLowerCase() })}`}
              active={filters.statuses.includes(s)}
              label={labels.projectStatus[s]}
              count={counts[COUNT_KEY[s]]}
              color={STATUS_COLOR[s]}
            />
          ))}
        </nav>
        <ListControls
          action={path}
          q={filters.q}
          sort={filters.sort}
          keep={filters.statuses.length ? { status: filters.statuses.map((s) => s.toLowerCase()).join(",") } : {}}
          selects={[
            {
              name: "district",
              label: t("district"),
              allLabel: t("allDistricts"),
              value: filters.district ?? "",
              options: options.districts.map((d) => ({ value: d.slug, label: localName(locale, d.name, d.nameLocal) })),
            },
            {
              name: "dept",
              label: t("department"),
              allLabel: tl("allDepartments"),
              value: filters.dept ?? "",
              options: options.departments.map((d) => ({ value: d.slug, label: localName(locale, d.name, d.nameLocal) })),
            },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState searched={filtered} clearHref={path} emptyText={t("none")} />
      ) : (
        <MapHighlightProvider>
          <ProjectTable rows={rows} basePath={basePath} showDepartment showDistrict />
          <ProjectCards rows={rows} basePath={basePath} showDepartment showDistrict />
        </MapHighlightProvider>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
