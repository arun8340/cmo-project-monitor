import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordChangedToast } from "@/components/account/password-changed-toast";
import { StateMapPanel } from "@/components/state-map/state-map-panel";
import {
  DashboardBelow,
  DashboardSide,
} from "@/components/state-home/kpi-panel";
import { requireStateAccess, type CurrentUser } from "@/lib/auth/dal";
import { getStateOverview } from "@/lib/data/state-overview";
import { getNextMeeting, getPreviousMeeting } from "@/lib/data/meetings";
import { getImageryProjects, parseProjectFilters } from "@/lib/data/projects";
import { LiveImageryStrip } from "@/components/state-home/live-imagery-strip";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import { getLocale, getTranslations } from "next-intl/server";
import { localNames } from "@/lib/i18n/names";
import type { Locale } from "@/lib/i18n/config";

export default function StateHomePage({
  params,
}: PageProps<"/[locale]/[state]">) {
  // Wider than other pages: the map on the left, both meetings side by side on the right.
  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 py-7 lg:px-6">
      <Suspense>
        <PasswordChangedToast />
      </Suspense>
      <Suspense fallback={<HomeSkeleton />}>
        <StateHome params={params} />
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
}: {
  params: PageProps<"/[locale]/[state]">["params"];
}) {
  const { state: stateParam } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const [overview, nextMeeting, previousMeeting, imagery] = await Promise.all([
    getStateOverview(user, state),
    getNextMeeting(user, state),
    getPreviousMeeting(user, state),
    getImageryProjects(user, state, parseProjectFilters({})),
  ]);
  const [t, locale] = await Promise.all([
    getTranslations("home"),
    getLocale() as Promise<Locale>,
  ]);
  const title = localNames(locale, state.name, state.nameLocal);

  return (
    <div className="grid gap-5">
      {/* No visible heading: the map comes first. Screen readers still get one. */}
      <h1 className="sr-only">
        {title.primary} — {scopeText(user, title.primary, t)}
      </h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)]">
        <StateMapPanel
          geojsonUrl={state.geojson}
          geoCodeProperty={state.geoCodeProperty}
          center={state.mapCenter}
          zoom={state.mapZoom}
          basePath={basePath}
          districts={overview.districts}
          styleKey="all"
        />
        <DashboardSide
          overview={overview}
          basePath={basePath}
          nextMeeting={nextMeeting}
          previousMeeting={previousMeeting}
          canManageMeetings={canManageMeetings(user)}
        />
      </div>

      <LiveImageryStrip items={imagery.items} basePath={basePath} />

      <DashboardBelow overview={overview} basePath={basePath} />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)]">
      <Skeleton className="h-105 sm:h-140 lg:h-[46rem]" />
      <div className="grid content-start gap-4">
        <Skeleton className="h-20" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-[34rem]" />
        </div>
      </div>
    </div>
  );
}
