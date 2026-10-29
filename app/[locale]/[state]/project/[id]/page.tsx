import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  CircleAlertIcon,
  ClipboardCheckIcon,
  ColumnsIcon,
  HistoryIcon,
  PencilIcon,
  ScrollTextIcon,
  PlusIcon,
  RadioIcon,
  SatelliteDishIcon,
  SatelliteIcon,
  UploadIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DateCompare } from "@/components/imagery/date-compare";
import { FullscreenButton } from "@/components/imagery/image-viewer";
import { OUTCOME_STYLE } from "@/components/compare/outcome-style";
import {
  DirectiveStatusBadge,
  IssueStatusBadge,
  pill,
  PriorityBadge,
  TONE_PILL,
} from "@/components/workflow/badges";
import {
  FactCard,
  PageHeader,
  Panel,
  PanelLink,
} from "@/components/app-shell/page-parts";
import { BEHIND_THRESHOLD } from "@/lib/progress";
import { RaiseIssueDialog } from "@/components/issues/raise-issue-dialog";
import {
  canIssueDirective,
  canRaiseIssue,
  canRequestImagery,
  isImageryDeskOnly,
} from "@/lib/auth/project-permissions";
import { db } from "@/lib/db";
import { getVerifications } from "@/lib/data/compare";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { StatusBadge } from "@/components/project/status-badge";
import { ProgressChart } from "@/components/project/progress-chart";
import { ProgressDialog } from "@/components/project/progress-dialog";
import { SiteMap } from "@/components/project/site-map";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { getProjectDetail } from "@/lib/data/project";
import { districtSlug } from "@/lib/district-slug";
import { STATUS_COLOR } from "@/lib/district-health";
import { formatBudget, formatDate, relativeDays } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { imageryUrl } from "@/lib/imagery/url";
import { toDateInput, todayIST } from "@/lib/dates";
import type {
  DirectiveStatus,
  ImagerySource,
  IssuePriority,
  IssueStatus,
} from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { getLabels } from "@/lib/i18n/server";
import { localName, localNames } from "@/lib/i18n/names";

type Params = PageProps<"/[locale]/[state]/project/[id]">;

export default function ProjectPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7">
      <Suspense fallback={<ProjectSkeleton />}>
        <Project params={params} />
      </Suspense>
    </main>
  );
}

async function Project({ params }: { params: Params["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code) notFound();
  const [detail, verifications, lastMeetingRow] = await Promise.all([
    getProjectDetail(user, id, state.code),
    getVerifications(id),
    db.issue.aggregate({
      where: { project: { district: { state: { code: state.code } } } },
      _max: { meetingDate: true },
    }),
  ]);
  const lastMeeting = lastMeetingRow._max.meetingDate;
  if (!detail) notFound();

  const {
    project,
    status,
    planned,
    behind,
    lastUpdate,
    directives,
    activity,
    can,
  } = detail;
  const deskOnly = isImageryDeskOnly(user);
  const districtPath = `${basePath}/district/${districtSlug(project.district.geoCode)}`;
  const now = new Date();
  const timeElapsed = planned;
  const [t, labels, locale] = await Promise.all([
    getTranslations("project"),
    getLabels(),
    getLocale(),
  ]);
  const fmt = (d: Date | null | undefined) => formatDate(d, locale);
  const name = localNames(locale, project.name, project.nameLocal);
  const districtName = localName(
    locale,
    project.district.name,
    project.district.nameLocal,
  );
  const deptName = localName(
    locale,
    project.department.name,
    project.department.nameLocal,
  );

  const reportedBehind = behind > BEHIND_THRESHOLD;
  const compareHref = `${basePath}/project/${project.id}/compare?from=project`;
  const hasImagery = project._count.imagery > 0;
  const livePath = `${basePath}/project/${project.id}/live`;
  const uploadHref = `${basePath}/project/${project.id}/imagery/upload`;
  const tt = await getTranslations("tracking");

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: districtName, href: districtPath },
          {
            label: deptName,
            href: `${districtPath}/${project.department.code.toLowerCase()}`,
          },
          { label: name.primary },
        ]}
      />

      <PageHeader
        title={name.primary}
        badges={
          <>
            <StatusBadge status={status} />
            {reportedBehind && (
              <span className={`${pill} ${TONE_PILL.bad}`}>
                {t("behindBadge")}
              </span>
            )}
          </>
        }
        subtitle={
          <>
            {name.secondary && (
              <span className="mr-2 text-foreground/80">
                {name.secondary} ·
              </span>
            )}
            {t("deptDistrict", {
              department: deptName,
              district: districtName,
            })}
          </>
        }
        actions={
          <>
            {hasImagery && (
              <Button nativeButton={false} render={<Link href={livePath} />}>
                <RadioIcon />
                {tt("title")}
              </Button>
            )}
            {project._count.imagery >= 2 && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={compareHref} />}
              >
                <ColumnsIcon />
                {t("compareImagery")}
              </Button>
            )}
            {can.uploadImagery && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={uploadHref} />}
              >
                <UploadIcon />
                {tt("addImages")}
              </Button>
            )}
            {canRequestImagery(user) && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={`${basePath}/requests/new?project=${project.id}`}
                  />
                }
              >
                <SatelliteDishIcon />
                {tt("requestImagery")}
              </Button>
            )}
            {can.edit && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`${basePath}/project/${project.id}/edit`} />
                }
              >
                <PencilIcon />
                {t("edit")}
              </Button>
            )}
            {can.updateProgress && (
              <ProgressDialog
                projectId={project.id}
                stateSlug={state.code.toLowerCase()}
                current={{ progress: project.progressPercent, status }}
                plannedToday={planned}
                minDate={lastUpdate ? toDateInput(lastUpdate.date) : null}
                today={todayIST(now)}
              />
            )}
          </>
        }
      />

      <LatestImagery
        images={project.imagery.map((i) => ({
          id: i.id,
          date: i.captureDate,
          source: labels.source[i.source as ImagerySource],
        }))}
        livePath={livePath}
        compareHref={compareHref}
        uploadHref={can.uploadImagery ? uploadHref : null}
        galleryHref={`${basePath}/project/${project.id}/imagery`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FactCard
          label={t("budget")}
          value={formatBudget(project.budgetLakhs, locale)}
        />
        <FactCard label={t("start")} value={fmt(project.startDate)} />
        <FactCard label={t("plannedEnd")} value={fmt(project.plannedEndDate)} />
        <FactCard
          label={t("lastUpdateLabel")}
          value={lastUpdate ? fmt(lastUpdate.date) : "—"}
        />
        <FactCard label={t("addedBy")} value={project.createdBy?.name ?? "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Panel title={t("plannedVsReported")}>
            <div className="grid gap-2.5">
              {planned != null && (
                <Bar label={t("planned")} value={planned} color="var(--rust)" />
              )}
              <Bar
                label={t("reported")}
                value={project.progressPercent}
                color="#2c4f7c"
              />
            </div>
            <p
              className={`mt-3 text-sm ${reportedBehind ? "font-semibold text-bad" : "text-muted-foreground"}`}
            >
              {reportedBehind
                ? t("pointsBehind", { points: behind })
                : timeElapsed != null
                  ? t("timeElapsed", { percent: timeElapsed })
                  : null}
            </p>
            {project.description && (
              <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </Panel>

          <Panel title={t("progressOverTime")} id="progress-heading">
            <ProgressChart
              start={project.startDate}
              plannedEnd={project.plannedEndDate}
              updates={project.progressUpdates.map((u) => ({
                date: u.date,
                percent: u.progressPercent,
              }))}
              now={now}
            />
          </Panel>

          <Panel
            title={
              <>
                {t("progressUpdates")}
                <span className="font-normal text-muted-foreground">
                  {project.progressUpdates.length}
                </span>
              </>
            }
            id="updates-heading"
          >
            {project.progressUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noUpdates")}</p>
            ) : (
              <ol className="divide-y border-t">
                {[...project.progressUpdates].reverse().map((u) => (
                  <li key={u.id} className="flex items-start gap-4 py-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-info-soft text-sm font-bold text-info tabular-nums">
                      {u.progressPercent}%
                    </span>
                    <div className="min-w-0 pt-1">
                      {u.notes && (
                        <p className="font-semibold text-navy">{u.notes}</p>
                      )}
                      <p className="text-[13px] text-muted-foreground">
                        {fmt(u.date)}
                        {u.updatedBy && <> · {u.updatedBy.name}</>}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <aside className="grid content-start gap-5">
          <Panel title={t("site")} id="site-heading">
            <SiteMap
              latitude={project.latitude}
              longitude={project.longitude}
              color={STATUS_COLOR[status]}
            />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {project.latitude.toFixed(5)}, {project.longitude.toFixed(5)}
            </p>
          </Panel>

          <Panel
            title={
              <>
                <ClipboardCheckIcon className="size-4 text-muted-foreground" />
                {t("verifications")}
                <span className="font-normal text-muted-foreground">
                  {verifications.length}
                </span>
              </>
            }
            id="verifications-heading"
          >
            {verifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noVerifications")}
                {project._count.imagery >= 2 && <> {t("compareToRecord")}</>}
              </p>
            ) : (
              <ul className="divide-y border-t">
                {verifications.slice(0, 5).map((v) => {
                  const style = OUTCOME_STYLE[v.outcome];
                  return (
                    <li key={v.id} className="grid gap-1 py-2.5 text-sm">
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${style.className}`}
                      >
                        <style.icon className="size-4" />
                        {labels.outcome[v.outcome]}
                      </div>
                      {v.notes && (
                        <p className="text-muted-foreground">{v.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span>
                          {v.byName} · {fmt(v.at)}
                        </span>
                        <Link
                          href={`${basePath}/project/${project.id}/compare?from=project&images=${v.imageIds.join(",")}`}
                          className="font-semibold text-link hover:underline"
                        >
                          {t("viewComparison", {
                            from: v.fromLabel,
                            to: v.toLabel,
                          })}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {!deskOnly && (
            <Panel
              title={
                <>
                  <CircleAlertIcon className="size-4 text-muted-foreground" />
                  {t("issues")}
                  <span className="font-normal text-muted-foreground">
                    {project.issues.length}
                  </span>
                </>
              }
              id="issues-heading"
              action={
                canRaiseIssue(user) && (
                  <RaiseIssueDialog
                    projectId={project.id}
                    projectName={name.primary}
                    stateSlug={state.code.toLowerCase()}
                    lastMeeting={lastMeeting ? fmt(lastMeeting) : null}
                  />
                )
              }
            >
              {project.issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noIssues")}</p>
              ) : (
                <ul className="divide-y border-t">
                  {project.issues.map((i) => (
                    <li key={i.id} className="grid gap-1 py-2.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`${basePath}/issues/${i.id}`}
                          className="font-semibold text-navy hover:underline"
                        >
                          {i.title}
                        </Link>
                        <PriorityBadge priority={i.priority as IssuePriority} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <IssueStatusBadge status={i.status as IssueStatus} />
                        {i.meetingDate && (
                          <span>
                            {t("reviewMeeting", { date: fmt(i.meetingDate) })}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {!deskOnly && (
            <Panel
              title={
                <>
                  <ScrollTextIcon className="size-4 text-muted-foreground" />
                  {t("directives")}
                  <span className="font-normal text-muted-foreground">
                    {directives.length}
                  </span>
                </>
              }
              id="directives-heading"
              action={
                canIssueDirective(user) && (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        href={`${basePath}/directives/new?project=${project.id}`}
                      />
                    }
                  >
                    <PlusIcon />
                    {t("newDirective")}
                  </Button>
                )
              }
            >
              {directives.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noDirectives")}
                </p>
              ) : (
                <ul className="divide-y border-t">
                  {directives.map((d) => {
                    const open =
                      d.status === "OPEN" || d.status === "IN_PROGRESS";
                    const overdue =
                      open && d.dueDate != null && d.dueDate < now;
                    return (
                      <li key={d.id} className="grid gap-1 py-2.5 text-sm">
                        <Link
                          href={`${basePath}/directives/${d.id}`}
                          className="font-semibold text-navy hover:underline"
                        >
                          {d.text}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <DirectiveStatusBadge
                            status={d.status as DirectiveStatus}
                            overdue={overdue}
                          />
                          <span>{t("from", { name: d.fromUser.name })}</span>
                          {d.owner && (
                            <span>· {t("owner", { name: d.owner.name })}</span>
                          )}
                          {d.dueDate && (
                            <span
                              className={
                                overdue ? "font-semibold text-bad" : ""
                              }
                            >
                              · {t("due", { date: fmt(d.dueDate) })}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          <Panel
            title={
              <>
                <HistoryIcon className="size-4 text-muted-foreground" />
                {t("recentActivity")}
              </>
            }
            id="activity-heading"
          >
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span>
                      {a.summary}
                      {a.userName && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {a.userName}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmt(a.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/**
 * The latest satellite image of the site, at the top of the project page: the
 * tracking view. Lists every capture date (opening Live tracking at that
 * date) and a two-date compare; prompts for imagery when there is none.
 */
function LatestImagery({
  images,
  livePath,
  compareHref,
  uploadHref,
  galleryHref,
}: {
  /** Newest first. */
  images: { id: string; date: Date; source: string }[];
  livePath: string;
  compareHref: string;
  uploadHref: string | null;
  galleryHref: string;
}) {
  const t = useTranslations("tracking");
  const locale = useLocale();
  const latest = images[0];
  const now = new Date();

  if (!latest) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center">
        <SatelliteIcon className="size-8 text-muted-foreground" />
        <div>
          <p className="font-semibold text-navy">{t("noImagery")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noImageryHint")}
          </p>
        </div>
        {uploadHref && (
          <Button nativeButton={false} render={<Link href={uploadHref} />}>
            <UploadIcon />
            {t("addImages")}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label={t("latestImage")}
      className="grid overflow-hidden rounded-xl border bg-card lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
    >
      <div className="relative">
        <Link
          href={livePath}
          className="group relative block aspect-[16/10] bg-[#0d1726]"
        >
          {/* Access-checked API image (see app/api/imagery). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageryUrl(latest.id, "display")}
            alt={t("imageAlt", { date: formatDate(latest.date, locale) })}
            className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-95"
          />
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber px-2 py-1 text-xs font-bold text-navy uppercase">
              {t("latest")}
            </span>
            <span className="rounded-md bg-black/65 px-2.5 py-1 text-sm font-semibold text-white">
              {formatDate(latest.date, locale)} · {latest.source}
            </span>
            <span className="rounded-md bg-black/65 px-2.5 py-1 text-xs text-white/85">
              {relativeDays(latest.date, now, locale as Locale)}
            </span>
          </div>
          <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-md bg-navy/90 px-3 py-1.5 text-sm font-semibold text-white shadow">
            <RadioIcon className="size-4 text-amber" />
            {t("openLive")}
          </span>
        </Link>
        {/* Full-screen viewer (works on phones); newest first, like the date list. */}
        <FullscreenButton
          images={images.map((i) => ({
            id: i.id,
            caption: `${formatDate(i.date, locale)} · ${i.source}`,
          }))}
          className="absolute bottom-3 left-3"
          label
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-navy">
              {t("availableDates", { count: images.length })}
            </h2>
            <PanelLink href={galleryHref}>{t("viewAll")}</PanelLink>
          </div>
          <ul className="grid max-h-56 gap-1 overflow-y-auto">
            {images.map((img, i) => (
              <li key={img.id}>
                <Link
                  href={`${livePath}?image=${img.id}`}
                  className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageryUrl(img.id, "thumb")}
                    alt=""
                    loading="lazy"
                    className="h-11 w-14 shrink-0 rounded bg-muted object-cover"
                  />
                  <span className="min-w-0 text-sm leading-tight">
                    <span className="block font-semibold text-navy">
                      {formatDate(img.date, locale)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {img.source}
                      {i === 0 && <> · {t("latest")}</>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {images.length > 1 && (
          <div className="mt-auto border-t pt-4">
            <h2 className="mb-2 font-bold text-navy">{t("compareDates")}</h2>
            <DateCompare
              options={[...images]
                .reverse()
                .map((i) => ({ id: i.id, label: formatDate(i.date, locale) }))}
              compareHref={compareHref}
            />
          </div>
        )}
        {uploadHref && (
          <Button
            variant="outline"
            className={images.length > 1 ? "" : "mt-auto"}
            nativeButton={false}
            render={<Link href={uploadHref} />}
          >
            <UploadIcon />
            {t("addImages")}
          </Button>
        )}
      </div>
    </section>
  );
}

/** One horizontal bar of the planned vs reported comparison. */
function Bar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-[#ebe7dd]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </span>
      <span className="text-right font-bold text-navy tabular-nums">
        {value}%
      </span>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-5 w-80" />
      <Skeleton className="h-14 w-96" />
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-5">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
        <div className="grid gap-5">
          <Skeleton className="h-72" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}
