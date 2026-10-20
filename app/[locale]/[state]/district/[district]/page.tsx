import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader, Panel, StatCard } from "@/components/app-shell/page-parts";
import { pill } from "@/components/workflow/badges";
import { DistrictMapPanel } from "@/components/district-map/district-map-panel";
import { Highlight, MapHighlightProvider } from "@/components/district-map/highlight";
import { deptColor, deptShort } from "@/lib/departments";
import { requireStateAccess } from "@/lib/auth/dal";
import { getDistrictView, type DepartmentCard } from "@/lib/data/district";
import { HEALTH_STYLE, PROJECT_STATUS_COLOR, type StatusCounts } from "@/lib/district-health";
import { formatBudget } from "@/lib/format";
import { localName, localNames } from "@/lib/i18n/names";

export default function DistrictPage({ params }: PageProps<"/[locale]/[state]/district/[district]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7">
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
  const [t, tm, tk, locale] = await Promise.all([getTranslations("district"), getTranslations("map"), getTranslations("kpi"), getLocale()]);
  const name = localNames(locale, district.name, district.nameLocal);
  const withProjects = view.departments.filter((d) => d.counts.total > 0).length;
  const pct = (n: number) => (totals.total ? Math.round((n / totals.total) * 100) : 0);

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: localName(locale, state.name, state.nameLocal), href: basePath || "/" }, { label: name.primary }]} />

      <PageHeader
        title={t("title", { district: name.primary })}
        titleSecondary={name.secondary}
        badges={<span className={`${pill} ${HEALTH_STYLE[view.health].pill}`}>{tm(`health.${view.health}.label`)}</span>}
        subtitle={
          <>
            {view.collector && <>{t("collector", { name: view.collector })} · </>}
            {t("projectsAcross", { count: totals.total, departments: withProjects })}
          </>
        }
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`${districtPath}/all`} />}>
            <ListIcon />
            {t("allProjects")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("total")} value={totals.total} />
        <StatCard label={tk("completed")} value={totals.completed} tone="ok" hint={tk("ofTotal", { percent: pct(totals.completed) })} />
        <StatCard label={tk("ongoing")} value={totals.ongoing} tone="info" hint={tk("ofTotal", { percent: pct(totals.ongoing) })} />
        <StatCard label={tk("delayedStalled")} value={totals.delayed + totals.stalled} tone="bad" />
        <StatCard label={t("openIssues")} value={view.openIssues} tone="warn" href={`${basePath}/issues?district=${slug}`} />
        <StatCard label={t("openDirectives")} value={view.openDirectives} href={`${basePath}/directives?district=${slug}`} />
      </div>

      <MapHighlightProvider>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <section aria-labelledby="departments-heading">
            <h2 id="departments-heading" className="mb-3 text-lg font-bold text-navy">
              {t("departments")}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {view.departments.map((d) => (
                <Highlight key={d.code} as="li" dept={d.code}>
                  <DepartmentCardLink dept={d} href={`${districtPath}/${d.slug}`} />
                </Highlight>
              ))}
            </ul>
          </section>

          <div className="lg:sticky lg:top-32">
            <Panel title={t("projectSites")} description={t("projectSitesHint")} id="sites-heading">
              <DistrictMapPanel
                geojsonUrl={state.geojson}
                geoCodeProperty={state.geoCodeProperty}
                geoCode={district.geoCode}
                center={[district.latitude ?? state.mapCenter[0], district.longitude ?? state.mapCenter[1]]}
                pins={view.pins}
                basePath={basePath}
                mapClassName="h-[420px] lg:h-[calc(100svh-19rem)] lg:min-h-[420px]"
              />
            </Panel>
          </div>
        </div>
      </MapHighlightProvider>
    </div>
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
  const t = useTranslations("district");
  const tm = useTranslations("map");
  const ts = useTranslations("enums.projectStatus");
  const locale = useLocale();
  const name = localNames(locale, dept.name, dept.nameLocal);
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        empty ? "opacity-70 hover:opacity-90" : "hover:border-input hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg text-[13px] font-bold"
          style={{ backgroundColor: `${deptColor(dept.code)}1f`, color: deptColor(dept.code) }}
        >
          {deptShort(dept.code)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="leading-snug font-bold text-navy group-hover:underline">{name.primary}</div>
          <div className="text-[13px] text-muted-foreground">
            {t("deptMeta", { count: c.total })}
            {dept.budgetLakhs > 0 && <> · {formatBudget(dept.budgetLakhs, locale)}</>}
          </div>
        </div>
        {!empty && <span className={`${pill} shrink-0 ${HEALTH_STYLE[dept.health].pill}`}>{tm(`health.${dept.health}.label`)}</span>}
      </div>

      {empty ? (
        <p className="text-sm text-muted-foreground">{tm("health.none.label")}</p>
      ) : (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={t("byStatus")}>
            {SEGMENTS.filter((s) => c[s.key] > 0).map((s) => (
              <span key={s.key} className="h-full" style={{ flexGrow: c[s.key], backgroundColor: PROJECT_STATUS_COLOR[s.key] }} title={`${ts(s.status)}: ${c[s.key]}`} />
            ))}
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <Count label={ts("COMPLETED")} value={c.completed} className="text-ok" />
            <Count label={ts("ONGOING")} value={c.ongoing} className="text-info" />
            <Count label={ts("DELAYED")} value={c.delayed + c.stalled} className="text-bad" />
          </dl>
        </>
      )}
    </Link>
  );
}

function Count({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="truncate text-[13px] text-muted-foreground">{label}</dt>
      <dd className={`text-lg leading-tight font-bold ${className}`}>{value}</dd>
    </div>
  );
}

function DistrictSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
