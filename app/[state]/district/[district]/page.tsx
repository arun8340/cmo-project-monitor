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

export default function DistrictPage({ params }: PageProps<"/[state]/district/[district]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<DistrictSkeleton />}>
        <District params={params} />
      </Suspense>
    </main>
  );
}

async function District({ params }: { params: PageProps<"/[state]/district/[district]">["params"] }) {
  const { state: stateParam, district: slug } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const view = await getDistrictView(user, state, slug);
  if (!view) notFound();

  const { district, totals } = view;
  const districtPath = `${basePath}/district/${slug}`;
  const health = HEALTH_STYLE[view.health];

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: state.name, href: basePath || "/" }, { label: district.name }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {district.name} <span className="font-normal text-muted-foreground">{district.nameLocal}</span>
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: health.color }} />
            {health.label} · {totals.total} projects in your view
          </p>
        </div>
        <Link
          href={`${districtPath}/all`}
          className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted"
        >
          <ListIcon className="size-4" />
          All projects
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={totals.total} />
        <Stat label="Completed" value={totals.completed} color={PROJECT_STATUS_COLOR.completed} />
        <Stat label="On-going" value={totals.ongoing} color={PROJECT_STATUS_COLOR.ongoing} />
        <Stat label="Delayed / stalled" value={totals.delayed + totals.stalled} color={PROJECT_STATUS_COLOR.stalled} />
        <Stat label="Open issues" value={view.openIssues} href={`${basePath}/issues?district=${slug}`} />
        <Stat label="Open directives" value={view.openDirectives} href={`${basePath}/directives?district=${slug}`} />
      </dl>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section aria-labelledby="departments-heading">
          <h2 id="departments-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Departments
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
            Project sites
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

const SEGMENTS: { key: keyof Omit<StatusCounts, "total">; label: string }[] = [
  { key: "completed", label: "Completed" },
  { key: "ongoing", label: "On-going" },
  { key: "delayed", label: "Delayed" },
  { key: "stalled", label: "Stalled" },
  { key: "notStarted", label: "Not started" },
];

function DepartmentCardLink({ dept, href }: { dept: DepartmentCard; href: string }) {
  const c = dept.counts;
  const empty = c.total === 0;
  const health = HEALTH_STYLE[dept.health];
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        empty ? "opacity-60 hover:opacity-80" : "shadow-xs hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{dept.name}</div>
          <div className="truncate text-xs text-muted-foreground">{dept.nameLocal}</div>
        </div>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      {empty ? (
        <p className="text-sm text-muted-foreground">No projects</p>
      ) : (
        <>
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-semibold">{c.total}</span>
            <span className="text-xs text-muted-foreground">
              {c.completed} completed · {c.ongoing} on-going
            </span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Projects by status">
            {SEGMENTS.filter((s) => c[s.key] > 0).map((s) => (
              <span
                key={s.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ flexGrow: c[s.key], backgroundColor: PROJECT_STATUS_COLOR[s.key] }}
                title={`${s.label}: ${c[s.key]}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ backgroundColor: health.color }} />
              {health.label}
            </span>
            {c.delayed + c.stalled > 0 && (
              <span className="font-medium text-red-700">{c.delayed + c.stalled} delayed / stalled</span>
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
