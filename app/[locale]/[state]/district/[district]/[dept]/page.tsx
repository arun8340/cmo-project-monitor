import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader, Panel } from "@/components/app-shell/page-parts";
import { DistrictMapPanel } from "@/components/district-map/district-map-panel";
import { MapHighlightProvider } from "@/components/district-map/highlight";
import { ListControls } from "@/components/project/list-controls";
import { Chip, EmptyState, ProjectCards, ProjectTable } from "@/components/project/project-table";
import { requireStateAccess } from "@/lib/auth/dal";
import { canCreateProject } from "@/lib/auth/project-permissions";
import { getProjectList } from "@/lib/data/district";
import type { ProjectStatus } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { localName, localNames } from "@/lib/i18n/names";
import { getLabels } from "@/lib/i18n/server";
import { STATUS_COLOR, type StatusCounts } from "@/lib/district-health";

type Params = PageProps<"/[locale]/[state]/district/[district]/[dept]">;

export default function ProjectListPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<ListSkeleton />}>
        <ProjectList params={params} searchParams={searchParams} />
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
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function ProjectList({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, district: districtSlug, dept: deptSlug }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const list = await getProjectList(user, state, districtSlug, deptSlug, {
    status: str(sp.status),
    q: str(sp.q),
    sort: str(sp.sort),
  });
  if (!list) notFound();

  const { district, department, counts, rows, filters } = list;
  const districtPath = `${basePath}/district/${districtSlug}`;
  const listPath = `${districtPath}/${deptSlug}`;
  const [t, labels, locale] = await Promise.all([getTranslations("projectList"), getLabels(), getLocale()]);
  const deptName = department ? localNames(locale, department.name, department.nameLocal) : null;
  const title = deptName ? deptName.primary : t("allDepartments");
  const districtName = localName(locale, district.name, district.nameLocal);

  const href = (status: ProjectStatus | null) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status.toLowerCase());
    if (filters.q) qs.set("q", filters.q);
    if (filters.sort !== "behind") qs.set("sort", filters.sort);
    const s = qs.toString();
    return s ? `${listPath}?${s}` : listPath;
  };

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: districtName, href: districtPath },
          { label: title },
        ]}
      />

      <PageHeader
        title={title}
        titleSecondary={deptName?.secondary}
        subtitle={
          <>
            {t("summary", { district: districtName, count: counts.total })}
            {filters.q && <> {t("matching", { q: filters.q })}</>}
          </>
        }
        actions={
          canCreateProject(user) && (
            <Button
              nativeButton={false}
              render={
                <Link href={`${basePath}/project/new?district=${districtSlug}${department ? `&dept=${department.code.toLowerCase()}` : ""}`} />
              }
            >
              <PlusIcon />
              {t("addProject")}
            </Button>
          )
        }
      />

      <div className="grid gap-3">
        <nav aria-label={t("filterByStatus")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip href={href(null)} active={!filters.status} label={t("all")} count={counts.total} />
          {CHIP_ORDER.map((s) => (
            <Chip
              key={s}
              href={href(s)}
              active={filters.status === s}
              label={labels.projectStatus[s]}
              count={counts[COUNT_KEY[s]]}
              color={STATUS_COLOR[s]}
            />
          ))}
        </nav>
        <ListControls action={listPath} q={filters.q} sort={filters.sort} keep={filters.status ? { status: filters.status.toLowerCase() } : {}} />
      </div>

      <MapHighlightProvider>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            {rows.length === 0 ? (
              <EmptyState searched={!!filters.q || !!filters.status} clearHref={listPath} emptyText={t("noneInDepartment")} />
            ) : (
              <>
                <ProjectTable rows={rows} basePath={basePath} showDepartment={!department} />
                <ProjectCards rows={rows} basePath={basePath} showDepartment={!department} />
              </>
            )}
          </div>
          <div className="order-first xl:sticky xl:top-32 xl:order-none">
            <Panel title={t("mapTitle")} description={t("mapHint")}>
              <DistrictMapPanel
                geojsonUrl={state.geojson}
                geoCodeProperty={state.geoCodeProperty}
                geoCode={district.geoCode}
                center={[district.latitude ?? state.mapCenter[0], district.longitude ?? state.mapCenter[1]]}
                pins={rows.map((r) => ({
                  id: r.id,
                  name: r.name,
                  nameLocal: r.nameLocal,
                  latitude: r.latitude,
                  longitude: r.longitude,
                  status: r.status,
                  progressPercent: r.progressPercent,
                  departmentCode: r.departmentCode,
                  departmentName: r.departmentName,
                  departmentNameLocal: r.departmentNameLocal,
                }))}
                basePath={basePath}
                mapClassName="h-80 xl:h-[calc(100svh-19rem)] xl:min-h-[420px]"
              />
            </Panel>
          </div>
        </div>
      </MapHighlightProvider>
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
