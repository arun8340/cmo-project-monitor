import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMapPanel } from "@/components/state-map/state-map-panel";
import { KpiPanel } from "@/components/state-home/kpi-panel";
import { DepartmentFilter } from "@/components/state-home/department-filter";
import { requireStateAccess, type CurrentUser } from "@/lib/auth/dal";
import { getStateOverview } from "@/lib/data/state-overview";
import type { StateConfig } from "@/config/states";

export default function StateHomePage({ params, searchParams }: PageProps<"/[state]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<HomeSkeleton />}>
        <StateHome params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function scopeText(user: CurrentUser, state: StateConfig) {
  switch (user.roleKey) {
    case "DEPARTMENT_HEAD":
      return `${user.departmentName} projects across all districts`;
    case "DISTRICT_COLLECTOR":
      return `All departments in ${user.districtName} district`;
    case "FIELD_OFFICER":
      return `Projects assigned to you in ${user.districtName}`;
    default:
      return `All districts and departments in ${state.name}`;
  }
}

async function StateHome({
  params,
  searchParams,
}: {
  params: PageProps<"/[state]">["params"];
  searchParams: PageProps<"/[state]">["searchParams"];
}) {
  const [{ state: stateParam }, { dept }] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const overview = await getStateOverview(user, state, typeof dept === "string" ? dept : undefined);
  const allProjects = overview.departments.reduce((sum, d) => sum + d.projects, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {state.name} <span className="font-normal text-muted-foreground">{state.nameLocal}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {scopeText(user, state)}
            {overview.department && (
              <>
                {" "}· showing <span className="font-medium text-foreground">{overview.department.name}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <DepartmentFilter
        basePath={basePath}
        departments={overview.departments}
        selected={overview.department?.code ?? null}
        totalProjects={allProjects}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <StateMapPanel
          geojsonUrl={state.geojson}
          geoCodeProperty={state.geoCodeProperty}
          center={state.mapCenter}
          zoom={state.mapZoom}
          basePath={basePath}
          districts={overview.districts}
          styleKey={overview.department?.code ?? "all"}
        />
        <KpiPanel overview={overview} />
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-105 sm:h-140 lg:h-160" />
        <div className="grid content-start gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-36" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  );
}
