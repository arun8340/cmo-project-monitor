import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeftRightIcon, RadioIcon, SatelliteIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/app-shell/page-parts";
import { ListControls } from "@/components/project/list-controls";
import { EmptyState } from "@/components/project/project-table";
import { StatusBadge } from "@/components/project/status-badge";
import { SOURCE_META } from "@/components/imagery/source-meta";
import { requireStateAccess } from "@/lib/auth/dal";
import { canUploadImagery } from "@/lib/auth/project-permissions";
import { filtersQuery, getImageryProjects, parseProjectFilters } from "@/lib/data/projects";
import type { ImagerySource } from "@/lib/constants";
import { deptColor } from "@/lib/departments";
import { formatDate, relativeDays } from "@/lib/format";
import { imageryUrl } from "@/lib/imagery/url";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";
import { localName, localNames } from "@/lib/i18n/names";
import { getLabels } from "@/lib/i18n/server";

type Params = PageProps<"/[locale]/[state]/imagery">;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("imageryIndex"))("title") };
}

export default function ImageryPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<GridSkeleton />}>
        <Imagery params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Imagery({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const { options, filters, items, withoutImagery } = await getImageryProjects(user, state, parseProjectFilters(sp));
  const canUpload = canUploadImagery(user);
  const [t, tt, tp, tl, labels, locale] = await Promise.all([
    getTranslations("imageryIndex"),
    getTranslations("tracking"),
    getTranslations("projects"),
    getTranslations("projectList"),
    getLabels(),
    getLocale() as Promise<Locale>,
  ]);
  const path = `${basePath}/imagery`;
  const stateName = localName(locale, state.name, state.nameLocal);
  const now = new Date();

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: stateName, href: basePath || "/" }, { label: t("title") }]} />
      <PageHeader title={t("title")} subtitle={t("summary", { count: items.length })} />

      <ListControls
        action={path}
        q={filters.q}
        sort={filters.sort}
        hideSort
        selects={[
          {
            name: "district",
            label: tp("district"),
            allLabel: tp("allDistricts"),
            value: filters.district ?? "",
            options: options.districts.map((d) => ({ value: d.slug, label: localName(locale, d.name, d.nameLocal) })),
          },
          {
            name: "dept",
            label: tp("department"),
            allLabel: tl("allDepartments"),
            value: filters.dept ?? "",
            options: options.departments.map((d) => ({ value: d.slug, label: localName(locale, d.name, d.nameLocal) })),
          },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState searched={!!(filters.district || filters.dept || filters.q)} clearHref={path} emptyText={t("none")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const name = localNames(locale, p.name, p.nameLocal);
            const source = SOURCE_META[p.latest.source as ImagerySource];
            const SourceIcon = source?.icon ?? SatelliteIcon;
            const projectHref = `${basePath}/project/${p.id}`;
            return (
              <li key={p.id} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
                <Link href={`${projectHref}/live`} className="group relative block aspect-[4/3] overflow-hidden bg-muted">
                  {/* Access-checked API image (see app/api/imagery). */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageryUrl(p.latest.id, "thumb")}
                    alt={t("latestAlt", { name: name.primary, date: formatDate(p.latest.captureDate, locale) })}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-navy/85 px-2 py-1 text-xs font-semibold text-white">
                    <SourceIcon className="size-3.5" />
                    {labels.source[p.latest.source as ImagerySource] ?? p.latest.source}
                  </span>
                  <span className="absolute right-2 bottom-2 rounded-md bg-navy/85 px-2 py-1 text-xs font-semibold text-white">
                    {formatDate(p.latest.captureDate, locale)}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={projectHref} className="leading-snug font-semibold text-link hover:text-navy hover:underline">
                        {name.primary}
                      </Link>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: deptColor(p.department.code) }} />
                      {localName(locale, p.department.name, p.department.nameLocal)} · {localName(locale, p.district.name, p.district.nameLocal)}
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {t("captures", { count: p.captures })} · {t("latest", { when: relativeDays(p.latest.captureDate, now, locale) })}
                    {p.captures > 1 && <> · {t("since", { date: formatDate(p.first.captureDate, locale) })}</>}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button size="sm" nativeButton={false} render={<Link href={`${projectHref}/live`} />}>
                      <RadioIcon />
                      {tt("title")}
                    </Button>
                    {p.captures > 1 && (
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`${projectHref}/compare`} />}>
                        <ArrowLeftRightIcon />
                        {t("compare")}
                      </Button>
                    )}
                    {canUpload && (
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`${projectHref}/imagery/upload`} />}>
                        <UploadIcon />
                        {tt("addImages")}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {withoutImagery > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("withoutImagery", { count: withoutImagery })}{" "}
          <Link href={`${basePath}/projects${filtersQuery({ ...filters, statuses: [] })}`} className="font-semibold text-link hover:underline">
            {t("seeAllProjects")}
          </Link>
        </p>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}
