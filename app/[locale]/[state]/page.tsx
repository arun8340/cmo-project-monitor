import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordChangedToast } from "@/components/account/password-changed-toast";
import { StateMapPanel } from "@/components/state-map/state-map-panel";
import { KpiPanel } from "@/components/state-home/kpi-panel";
import { DepartmentFilter } from "@/components/state-home/department-filter";
import { requireStateAccess, type CurrentUser } from "@/lib/auth/dal";
import { getStateOverview } from "@/lib/data/state-overview";
import { getLocale, getTranslations } from "next-intl/server";
import { localName, localNames } from "@/lib/i18n/names";
import type { Locale } from "@/lib/i18n/config";

export default function StateHomePage({ params, searchParams }: PageProps<"/[locale]/[state]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense>
        <PasswordChangedToast />
      </Suspense>
      <Suspense fallback={<HomeSkeleton />}>
        <StateHome params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function scopeText(user: CurrentUser, stateName: string, t: Awaited<ReturnType<typeof getTranslations<"home">>>) {
  switch (user.roleKey) {
    case "DEPARTMENT_HEAD":
      return t("scopeDepartment", { department: user.departmentName ?? "" });
    case "DISTRICT_COLLECTOR":
      return t("scopeDistrict", { district: user.districtName ?? "" });
    case "FIELD_OFFICER":
      return t("scopeAssigned", { district: user.districtName ?? "" });
    default:
      return t("scopeState", { state: stateName });
  }
}

async function StateHome({
  params,
  searchParams,
}: {
  params: PageProps<"/[locale]/[state]">["params"];
  searchParams: PageProps<"/[locale]/[state]">["searchParams"];
}) {
  const [{ state: stateParam }, { dept }] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const overview = await getStateOverview(user, state, typeof dept === "string" ? dept : undefined);
  const allProjects = overview.departments.reduce((sum, d) => sum + d.projects, 0);
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale() as Promise<Locale>]);
  const title = localNames(locale, state.name, state.nameLocal);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {title.primary} {title.secondary && <span className="font-normal text-muted-foreground">{title.secondary}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {scopeText(user, title.primary, t)}
            {overview.department && (
              <>
                {" "}· {t("showing")}{" "}
                <span className="font-medium text-foreground">{localName(locale, overview.department.name, overview.department.nameLocal)}</span>
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
        <KpiPanel overview={overview} basePath={basePath} />
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
