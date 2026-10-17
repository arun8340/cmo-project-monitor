import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ListIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { DistrictMapPanel } from "@/components/district-map/district-map-panel";
import { requireStateAccess } from "@/lib/auth/dal";
import { getDistrictView, type DepartmentCard } from "@/lib/data/district";
import { HEALTH_STYLE, PROJECT_STATUS_COLOR, type StatusCounts } from "@/lib/district-health";
import { getLocale, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { localName, localNames } from "@/lib/i18n/names";

export default function DistrictPage({ params }: PageProps<"/[locale]/[state]/district/[district]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<DistrictSkeleton />}>
        <District params={params} />
      </Suspense>
    </main>
  );
}

async function District({ params }: { params: PageProps<"/[locale]/[state]/district/[district]">["params"] }) {
  const { state: stateParam, district: slug } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const view = await getDistrictView(user, state, slug);
  if (!view) notFound();

  const { district, totals } = view;
  const districtPath = `${basePath}/district/${slug}`;
  const health = HEALTH_STYLE[view.health];
  const [t, tm, locale] = await Promise.all([getTranslations("district"), getTranslations("map"), getLocale()]);
  const name = localNames(locale, district.name, district.nameLocal);

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: localName(locale, state.name, state.nameLocal), href: basePath || "/" }, { label: name.primary }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {name.primary} {name.secondary && <span className="font-normal text-muted-foreground">{name.secondary}</span>}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: health.color }} />
            {tm(`health.${view.health}.label`)} · {t("inView", { count: totals.total })}
          </p>
        </div>
        <Link
          href={`${districtPath}/all`}
          className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted"
        >
          <ListIcon className="size-4" />
          {t("allProjects")}
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("total")} value={totals.total} />
        <Stat label={tm("completed")} value={totals.completed} color={PROJECT_STATUS_COLOR.completed} />
        <Stat label={tm("ongoing")} value={totals.ongoing} color={PROJECT_STATUS_COLOR.ongoing} />
        <Stat label={tm("delayedStalled")} value={totals.delayed + totals.stalled} color={PROJECT_STATUS_COLOR.stalled} />
        <Stat label={t("openIssues")} value={view.openIssues} href={`${basePath}/issues?district=${slug}`} />
        <Stat label={t("openDirectives")} value={view.openDirectives} href={`${basePath}/directives?district=${slug}`} />
      </dl>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section aria-labelledby="departments-heading">
          <h2 id="departments-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            {t("departments")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {view.departments.map((d) => (
              <li key={d.code}>
                <DepartmentCardLink dept={d} href={`${districtPath}/${d.slug}`} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sites-heading" className="flex min-h-96 flex-col">
          <h2 id="sites-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            {t("projectSites")}
          </h2>
          <div className="flex-1">
            <DistrictMapPanel
              geojsonUrl={state.geojson}
              geoCodeProperty={state.geoCodeProperty}
              geoCode={district.geoCode}
              center={[district.latitude ?? state.mapCenter[0], district.longitude ?? state.mapCenter[1]]}
              pins={view.pins}
              basePath={basePath}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, color, href }: { label: string; value: number; color?: string; href?: string }) {
  const body = (
    <>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
        {label}
      </dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </>
  );
  const cls = "flex flex-col-reverse rounded-lg border bg-background p-3";
  return href ? (
    <Link href={href} className={`${cls} transition hover:bg-muted/50 hover:shadow-sm`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const SEGMENTS = [
  { key: "completed", status: "COMPLETED" },
  { key: "ongoing", status: "ONGOING" },
  { key: "delayed", status: "DELAYED" },
  { key: "stalled", status: "STALLED" },
  { key: "notStarted", status: "NOT_STARTED" },
] as const satisfies { key: keyof Omit<StatusCounts, "total">; status: string }[];

function DepartmentCardLink({ dept, href }: { dept: DepartmentCard; href: string }) {
  const c = dept.counts;
  const empty = c.total === 0;
  const health = HEALTH_STYLE[dept.health];
  const t = useTranslations("district");
  const tm = useTranslations("map");
  const ts = useTranslations("enums.projectStatus");
  const name = localNames(useLocale(), dept.name, dept.nameLocal);
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        empty ? "opacity-60 hover:opacity-80" : "shadow-xs hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{name.primary}</div>
          {name.secondary && <div className="truncate text-xs text-muted-foreground">{name.secondary}</div>}
        </div>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      {empty ? (
        <p className="text-sm text-muted-foreground">{tm("health.none.label")}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-semibold">{c.total}</span>
            <span className="text-xs text-muted-foreground">
              {t("completedOngoing", { completed: c.completed, ongoing: c.ongoing })}
            </span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={t("byStatus")}>
            {SEGMENTS.filter((s) => c[s.key] > 0).map((s) => (
              <span
                key={s.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ flexGrow: c[s.key], backgroundColor: PROJECT_STATUS_COLOR[s.key] }}
                title={`${ts(s.status)}: ${c[s.key]}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ backgroundColor: health.color }} />
              {tm(`health.${dept.health}.label`)}
            </span>
            {c.delayed + c.stalled > 0 && (
              <span className="font-medium text-red-700">{t("behindCount", { count: c.delayed + c.stalled })}</span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}

function DistrictSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-18" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
