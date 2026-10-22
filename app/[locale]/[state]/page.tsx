import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordChangedToast } from "@/components/account/password-changed-toast";
import { StateMapPanel } from "@/components/state-map/state-map-panel";
import {
  DashboardBelow,
  DashboardSide,
  KpiRow,
} from "@/components/state-home/kpi-panel";
import { PageHeader } from "@/components/app-shell/page-parts";
import { DepartmentFilter } from "@/components/state-home/department-filter";
import { requireStateAccess, type CurrentUser } from "@/lib/auth/dal";
import { getStateOverview } from "@/lib/data/state-overview";
import { getNextMeeting } from "@/lib/data/meetings";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import { getLocale, getTranslations } from "next-intl/server";
import { localName, localNames } from "@/lib/i18n/names";
import type { Locale } from "@/lib/i18n/config";

export default function StateHomePage({
  params,
  searchParams,
}: PageProps<"/[locale]/[state]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7">
      <Suspense>
        <PasswordChangedToast />
      </Suspense>
      <Suspense fallback={<HomeSkeleton />}>
        <StateHome params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function scopeText(
  user: CurrentUser,
  stateName: string,
  t: Awaited<ReturnType<typeof getTranslations<"home">>>,
) {
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
  const [{ state: stateParam }, { dept }] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const [overview, nextMeeting] = await Promise.all([
    getStateOverview(user, state, typeof dept === "string" ? dept : undefined),
    getNextMeeting(user, state),
  ]);
  const allProjects = overview.departments.reduce(
    (sum, d) => sum + d.projects,
    0,
  );
  const [t, locale] = await Promise.all([
    getTranslations("home"),
    getLocale() as Promise<Locale>,
  ]);
  const title = localNames(locale, state.name, state.nameLocal);

  return (
    <div className="grid gap-5">
      <PageHeader
        title={title.primary}
        titleSecondary={title.secondary}
        subtitle={
          <>
            {scopeText(user, title.primary, t)}
            {overview.department && (
              <>
                {" "}
                · {t("showing")}{" "}
                <span className="font-semibold text-foreground">
                  {localName(
                    locale,
                    overview.department.name,
                    overview.department.nameLocal,
                  )}
                </span>
              </>
            )}
          </>
        }
      />

      <KpiRow overview={overview} basePath={basePath} />

      <DepartmentFilter
        basePath={basePath}
        departments={overview.departments}
        selected={overview.department?.code ?? null}
        totalProjects={allProjects}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <StateMapPanel
          geojsonUrl={state.geojson}
          geoCodeProperty={state.geoCodeProperty}
          center={state.mapCenter}
          zoom={state.mapZoom}
          basePath={basePath}
          districts={overview.districts}
          styleKey={overview.department?.code ?? "all"}
        />
        <DashboardSide
          overview={overview}
          basePath={basePath}
          nextMeeting={nextMeeting}
          canManageMeetings={canManageMeetings(user)}
        />
      </div>

      <DashboardBelow overview={overview} basePath={basePath} />
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
