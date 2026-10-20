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
  UploadIcon,
} from "lucide-react";
import { OUTCOME_STYLE } from "@/components/compare/outcome-style";
import { DirectiveStatusBadge, IssueStatusBadge, pill, PriorityBadge, TONE_PILL } from "@/components/workflow/badges";
import { FactCard, PageHeader, Panel, PanelLink } from "@/components/app-shell/page-parts";
import { BEHIND_THRESHOLD } from "@/lib/progress";
import { RaiseIssueDialog } from "@/components/issues/raise-issue-dialog";
import { canIssueDirective, canRaiseIssue } from "@/lib/auth/project-permissions";
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
import { formatBudget, formatDate } from "@/lib/format";
import { imageryUrl } from "@/lib/imagery/url";
import { toDateInput, todayIST } from "@/lib/dates";
import type { DirectiveStatus, ImagerySource, IssuePriority, IssueStatus } from "@/lib/constants";
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
    db.issue.aggregate({ where: { project: { district: { state: { code: state.code } } } }, _max: { meetingDate: true } }),
  ]);
  const lastMeeting = lastMeetingRow._max.meetingDate;
  if (!detail) notFound();

  const { project, status, planned, behind, lastUpdate, directives, activity, can } = detail;
  const districtPath = `${basePath}/district/${districtSlug(project.district.geoCode)}`;
  const now = new Date();
  const timeElapsed = planned;
  const [t, labels, locale] = await Promise.all([getTranslations("project"), getLabels(), getLocale()]);
  const fmt = (d: Date | null | undefined) => formatDate(d, locale);
  const name = localNames(locale, project.name, project.nameLocal);
  const districtName = localName(locale, project.district.name, project.district.nameLocal);
  const deptName = localName(locale, project.department.name, project.department.nameLocal);

  const reportedBehind = behind > BEHIND_THRESHOLD;
  const compareHref = `${basePath}/project/${project.id}/compare?from=project`;
  const latestImageId = project.imagery[0]?.id ?? null;

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: districtName, href: districtPath },
          { label: deptName, href: `${districtPath}/${project.department.code.toLowerCase()}` },
          { label: name.primary },
        ]}
      />

      <PageHeader
        title={name.primary}
        badges={
          <>
            <StatusBadge status={status} />
            {reportedBehind && <span className={`${pill} ${TONE_PILL.bad}`}>{t("behindBadge")}</span>}
          </>
        }
        subtitle={
          <>
            {name.secondary && <span className="mr-2 text-foreground/80">{name.secondary} ·</span>}
            {t("deptDistrict", { department: deptName, district: districtName })}
          </>
        }
        actions={
          <>
            {can.edit && (
              <Button variant="outline" nativeButton={false} render={<Link href={`${basePath}/project/${project.id}/edit`} />}>
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
            {project._count.imagery >= 2 && (
              <Button nativeButton={false} render={<Link href={compareHref} />}>
                <ColumnsIcon />
                {t("compareImagery")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FactCard label={t("budget")} value={formatBudget(project.budgetLakhs, locale)} />
        <FactCard label={t("start")} value={fmt(project.startDate)} />
        <FactCard label={t("plannedEnd")} value={fmt(project.plannedEndDate)} />
        <FactCard label={t("lastUpdateLabel")} value={lastUpdate ? fmt(lastUpdate.date) : "—"} />
        <FactCard label={t("addedBy")} value={project.createdBy?.name ?? "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Panel title={t("plannedVsReported")}>
            <div className="grid gap-2.5">
              {planned != null && <Bar label={t("planned")} value={planned} color="var(--rust)" />}
              <Bar label={t("reported")} value={project.progressPercent} color="#2c4f7c" />
            </div>
            <p className={`mt-3 text-sm ${reportedBehind ? "font-semibold text-bad" : "text-muted-foreground"}`}>
              {reportedBehind ? t("pointsBehind", { points: behind }) : timeElapsed != null ? t("timeElapsed", { percent: timeElapsed }) : null}
            </p>
            {project.description && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{project.description}</p>}
          </Panel>

          <Panel
            title={t("siteImagery")}
            id="imagery-heading"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-muted-foreground">{t("captures", { count: project._count.imagery })}</span>
                {can.uploadImagery && (
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`${basePath}/project/${project.id}/imagery/upload`} />}>
                    <UploadIcon />
                    {t("uploadImagery")}
                  </Button>
                )}
                <PanelLink href={`${basePath}/project/${project.id}/imagery`}>{t("viewAll")}</PanelLink>
              </div>
            }
          >
            {project.imagery.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noImagery")}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {project.imagery.map((img) => (
                  <li key={img.id} className="grid gap-1.5">
                    <Link href={`${basePath}/project/${project.id}/imagery`} className="block overflow-hidden rounded-lg border hover:shadow-sm">
                      {/* Access-checked API image (see app/api/imagery). */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageryUrl(img.id, "thumb")}
                        alt={t("imageAlt", { source: labels.source[img.source as ImagerySource], date: fmt(img.captureDate) })}
                        loading="lazy"
                        className="aspect-4/3 w-full bg-muted object-cover"
                      />
                    </Link>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-[13px] leading-tight">
                        <div className="font-bold text-navy">{fmt(img.captureDate)}</div>
                        <div className="text-muted-foreground">{labels.source[img.source as ImagerySource]}</div>
                      </div>
                      {project._count.imagery >= 2 && latestImageId && (
                        <Link
                          href={img.id === latestImageId ? compareHref : `${compareHref}&images=${img.id},${latestImageId}`}
                          className="shrink-0 rounded-md border bg-card px-2 py-0.5 text-xs font-semibold text-navy hover:bg-muted"
                        >
                          {t("compareShort")}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("progressOverTime")} id="progress-heading">
            <ProgressChart
              start={project.startDate}
              plannedEnd={project.plannedEndDate}
              updates={project.progressUpdates.map((u) => ({ date: u.date, percent: u.progressPercent }))}
              now={now}
            />
          </Panel>

          <Panel
            title={
              <>
                {t("progressUpdates")}
                <span className="font-normal text-muted-foreground">{project.progressUpdates.length}</span>
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
                      {u.notes && <p className="font-semibold text-navy">{u.notes}</p>}
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
            <SiteMap latitude={project.latitude} longitude={project.longitude} color={STATUS_COLOR[status]} />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {project.latitude.toFixed(5)}, {project.longitude.toFixed(5)}
            </p>
          </Panel>

          <Panel
            title={
              <>
                <ClipboardCheckIcon className="size-4 text-muted-foreground" />
                {t("verifications")}
                <span className="font-normal text-muted-foreground">{verifications.length}</span>
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
                      <div className={`flex items-center gap-1.5 font-semibold ${style.className}`}>
                        <style.icon className="size-4" />
                        {labels.outcome[v.outcome]}
                      </div>
                      {v.notes && <p className="text-muted-foreground">{v.notes}</p>}
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span>
                          {v.byName} · {fmt(v.at)}
                        </span>
                        <Link
                          href={`${basePath}/project/${project.id}/compare?from=project&images=${v.imageIds.join(",")}`}
                          className="font-semibold text-link hover:underline"
                        >
                          {t("viewComparison", { from: v.fromLabel, to: v.toLabel })}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title={
              <>
                <CircleAlertIcon className="size-4 text-muted-foreground" />
                {t("issues")}
                <span className="font-normal text-muted-foreground">{project.issues.length}</span>
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
                      <Link href={`${basePath}/issues/${i.id}`} className="font-semibold text-navy hover:underline">
                        {i.title}
                      </Link>
                      <PriorityBadge priority={i.priority as IssuePriority} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <IssueStatusBadge status={i.status as IssueStatus} />
                      {i.meetingDate && <span>{t("reviewMeeting", { date: fmt(i.meetingDate) })}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={
              <>
                <ScrollTextIcon className="size-4 text-muted-foreground" />
                {t("directives")}
                <span className="font-normal text-muted-foreground">{directives.length}</span>
              </>
            }
            id="directives-heading"
            action={
              canIssueDirective(user) && (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`${basePath}/directives/new?project=${project.id}`} />}>
                  <PlusIcon />
                  {t("newDirective")}
                </Button>
              )
            }
          >
            {directives.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDirectives")}</p>
            ) : (
              <ul className="divide-y border-t">
                {directives.map((d) => {
                  const open = d.status === "OPEN" || d.status === "IN_PROGRESS";
                  const overdue = open && d.dueDate != null && d.dueDate < now;
                  return (
                    <li key={d.id} className="grid gap-1 py-2.5 text-sm">
                      <Link href={`${basePath}/directives/${d.id}`} className="font-semibold text-navy hover:underline">
                        {d.text}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <DirectiveStatusBadge status={d.status as DirectiveStatus} overdue={overdue} />
                        <span>{t("from", { name: d.fromUser.name })}</span>
                        {d.owner && <span>· {t("owner", { name: d.owner.name })}</span>}
                        {d.dueDate && <span className={overdue ? "font-semibold text-bad" : ""}>· {t("due", { date: fmt(d.dueDate) })}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

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
                      {a.userName && <span className="text-muted-foreground"> · {a.userName}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmt(a.at)}</span>
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

/** One horizontal bar of the planned vs reported comparison. */
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-[#ebe7dd]">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </span>
      <span className="text-right font-bold text-navy tabular-nums">{value}%</span>
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
