import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CircleAlertIcon,
  RadioIcon,
  SatelliteDishIcon,
  SatelliteIcon,
  UploadIcon,
} from "lucide-react";
import { Highlight } from "@/components/district-map/highlight";
import { StatusBadge } from "@/components/project/status-badge";
import { ProgressCell } from "@/components/project/progress-cell";
import { deptColor } from "@/lib/departments";
import type { ProjectRow } from "@/lib/data/district";
import { formatBudget, formatDate } from "@/lib/format";
import { imageryUrl } from "@/lib/imagery/url";
import { localName, localNames } from "@/lib/i18n/names";

/** Decorative satellite backdrops for projects still awaiting imagery (picked per project). */
const BACKDROPS = [
  "/landing/01.webp",
  "/landing/03.webp",
  "/landing/05.webp",
  "/landing/06.webp",
  "/landing/02.webp",
];
const backdropFor = (id: string) =>
  BACKDROPS[
    [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % BACKDROPS.length
  ];

/**
 * A project as a card: its latest satellite image (opening Live tracking) or,
 * without imagery, an invitation to add some; then status, progress and key
 * facts. Hovering a card highlights the project's pin on the map.
 */
export function ProjectCard({
  row,
  basePath,
  showDepartment = true,
  showDistrict = false,
  canUpload = false,
}: {
  row: ProjectRow;
  basePath: string;
  showDepartment?: boolean;
  showDistrict?: boolean;
  canUpload?: boolean;
}) {
  const t = useTranslations("projectCard");
  const tl = useTranslations("projectList");
  const locale = useLocale();
  const name = localNames(locale, row.name, row.nameLocal);
  const projectPath = `${basePath}/project/${row.id}`;
  const meta = [
    showDepartment &&
      localName(locale, row.departmentName, row.departmentNameLocal),
    showDistrict && localName(locale, row.districtName, row.districtNameLocal),
  ].filter(Boolean);

  return (
    <Highlight
      as="li"
      project={row.id}
      className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition hover:shadow-md"
    >
      {row.latestImageId ? (
        <Link
          href={`${projectPath}/live`}
          className="group relative block aspect-[16/10] overflow-hidden bg-[#0d1726]"
        >
          {/* Access-checked API image (see app/api/imagery). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageryUrl(row.latestImageId, "thumb")}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <span className="absolute top-2 left-2">
            <StatusBadge status={row.status} />
          </span>
          {row.latestImagery && (
            <span className="absolute bottom-2 left-2 rounded-md bg-navy/85 px-2 py-0.5 text-xs font-semibold text-white">
              {formatDate(row.latestImagery, locale)}
            </span>
          )}
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-amber px-2 py-0.5 text-xs font-bold text-navy opacity-90 transition group-hover:opacity-100">
            <RadioIcon className="size-3.5" />
            {t("live")}
          </span>
        </Link>
      ) : (
        <div className="relative aspect-[16/10] overflow-hidden bg-[#0d1726]">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative backdrop */}
          <img
            src={backdropFor(row.id)}
            alt=""
            aria-hidden
            className="size-full scale-110 object-cover opacity-90 blur-[2px] saturate-[0.8]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/45 to-navy/10"
          />
          <span className="absolute top-2 left-2">
            <StatusBadge status={row.status} />
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white">
            <span className="grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
              <SatelliteIcon className="size-5" />
            </span>
            <span className="text-sm font-semibold">{t("awaiting")}</span>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={`${basePath}/requests/new?project=${row.id}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber px-3 py-1.5 text-xs font-bold text-navy shadow hover:brightness-105"
              >
                <SatelliteDishIcon className="size-3.5" />
                {t("requestImagery")}
              </Link>
              {canUpload && (
                <Link
                  href={`${projectPath}/imagery/upload`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/30 hover:bg-white/25"
                >
                  <UploadIcon className="size-3.5" />
                  {t("addImages")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <Link
            href={projectPath}
            className="leading-snug font-bold text-navy hover:underline"
          >
            {name.primary}
          </Link>
          {name.secondary && (
            <div className="truncate text-xs text-muted-foreground">
              {name.secondary}
            </div>
          )}
          {meta.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {showDepartment && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: deptColor(row.departmentCode) }}
                />
              )}
              {meta.join(" · ")}
            </div>
          )}
        </div>
        <ProgressCell
          actual={row.progressPercent}
          planned={row.plannedPercent}
          behind={row.behind}
        />
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <div>
            <dt className="text-muted-foreground">{tl("colBudget")}</dt>
            <dd className="font-semibold text-navy">
              {formatBudget(row.budgetLakhs, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tl("plannedEnd")}</dt>
            <dd className="font-semibold text-navy">
              {formatDate(row.plannedEndDate, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tl("colIssues")}</dt>
            <dd
              className={`flex items-center gap-1 font-semibold ${row.openIssues > 0 ? "text-bad" : "text-navy"}`}
            >
              {row.openIssues > 0 && <CircleAlertIcon className="size-3.5" />}
              {row.openIssues}
            </dd>
          </div>
        </dl>
        {row.latestImageId && canUpload && (
          <Link
            href={`${projectPath}/imagery/upload`}
            className="inline-flex items-center gap-1 self-start text-xs font-semibold text-link hover:underline"
          >
            <UploadIcon className="size-3.5" />
            {t("addImages")}
          </Link>
        )}
      </div>
    </Highlight>
  );
}
