import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  CalendarClockIcon,
  CircleAlertIcon,
  ClipboardCheckIcon,
  ColumnsIcon,
  HistoryIcon,
  ImageIcon,
  PencilIcon,
  ScrollTextIcon,
  UploadIcon,
} from "lucide-react";
import { OUTCOME_STYLE } from "@/components/compare/outcome-style";
import { getVerifications } from "@/lib/data/compare";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { StatusBadge } from "@/components/project/status-badge";
import { ProgressCell } from "@/components/project/progress-cell";
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
import {
  DIRECTIVE_STATUS_LABELS,
  VERIFICATION_OUTCOME_LABELS,
  IMAGERY_SOURCE_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type DirectiveStatus,
  type ImagerySource,
  type IssuePriority,
  type IssueStatus,
} from "@/lib/constants";

type Params = PageProps<"/[state]/project/[id]">;

export default function ProjectPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<ProjectSkeleton />}>
        <Project params={params} />
      </Suspense>
    </main>
  );
}

const PRIORITY_STYLE: Record<IssuePriority, string> = {
  CRITICAL: "border-red-300 bg-red-50 text-red-800",
  HIGH: "border-orange-300 bg-orange-50 text-orange-800",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-800",
  LOW: "border-slate-300 bg-slate-50 text-slate-700",
};

async function Project({ params }: { params: Params["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code) notFound();
  const [detail, verifications] = await Promise.all([getProjectDetail(user, id, state.code), getVerifications(id)]);
  if (!detail) notFound();

  const { project, status, planned, behind, lastUpdate, directives, activity, can } = detail;
  const districtPath = `${basePath}/district/${districtSlug(project.district.geoCode)}`;
  const now = new Date();
  const timeElapsed = planned;

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: project.district.name, href: districtPath },
          { label: project.department.name, href: `${districtPath}/${project.department.code.toLowerCase()}` },
          { label: project.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge status={status} />
          </div>
          {project.nameLocal && <p className="text-muted-foreground">{project.nameLocal}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            {project.department.name} · {project.district.name} district
          </p>
        </div>
        {(can.updateProgress || can.edit) && (
          <div className="flex gap-2">
            {can.edit && (
              <Button variant="outline" nativeButton={false} render={<Link href={`${basePath}/project/${project.id}/edit`} />}>
                <PencilIcon />
                Edit project
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
          </div>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <section className="grid gap-5 rounded-xl border bg-card p-5" aria-label="Overview">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="grid gap-3">
                <ProgressCell actual={project.progressPercent} planned={planned} behind={behind} className="text-base" />
                {timeElapsed != null && (
                  <p className="text-xs text-muted-foreground">
                    {timeElapsed}% of the planned time has elapsed
                    {lastUpdate && <> · last update {formatDate(lastUpdate.date)}</>}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Budget" value={formatBudget(project.budgetLakhs)} />
                <Fact label="Start" value={formatDate(project.startDate)} />
                <Fact label="Planned end" value={formatDate(project.plannedEndDate)} />
                <Fact label="Added by" value={project.createdBy?.name ?? "—"} />
              </dl>
            </div>
            {project.description && <p className="border-t pt-4 text-sm text-muted-foreground">{project.description}</p>}
          </section>

          <section className="rounded-xl border bg-card p-5" aria-labelledby="progress-heading">
            <h2 id="progress-heading" className="mb-3 font-medium">
              Progress over time
            </h2>
            <ProgressChart
              start={project.startDate}
              plannedEnd={project.plannedEndDate}
              updates={project.progressUpdates.map((u) => ({ date: u.date, percent: u.progressPercent }))}
              now={now}
            />
          </section>

          <section className="rounded-xl border bg-card p-5" aria-labelledby="updates-heading">
            <h2 id="updates-heading" className="mb-3 flex items-center gap-2 font-medium">
              <CalendarClockIcon className="size-4 text-muted-foreground" />
              Progress updates
              <span className="font-normal text-muted-foreground">{project.progressUpdates.length}</span>
            </h2>
            {project.progressUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            ) : (
              <ol className="relative grid gap-4 border-l pl-5">
                {[...project.progressUpdates].reverse().map((u) => (
                  <li key={u.id} className="relative">
                    <span className="absolute top-1.5 -left-6.25 size-2.5 rounded-full border-2 border-card bg-slate-500" />
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium tabular-nums">{u.progressPercent}%</span>
                      <span className="text-muted-foreground">{formatDate(u.date)}</span>
                      {u.updatedBy && <span className="text-xs text-muted-foreground">· {u.updatedBy.name}</span>}
                    </div>
                    {u.notes && <p className="mt-0.5 text-sm text-muted-foreground">{u.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-xl border bg-card p-4" aria-labelledby="site-heading">
            <h2 id="site-heading" className="mb-3 font-medium">
              Site
            </h2>
            <SiteMap latitude={project.latitude} longitude={project.longitude} color={STATUS_COLOR[status]} />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {project.latitude.toFixed(5)}, {project.longitude.toFixed(5)}
            </p>
          </section>

          <section className="rounded-xl border bg-card p-4" aria-labelledby="imagery-heading">
            <h2 id="imagery-heading" className="mb-3 flex items-center gap-2 font-medium">
              <ImageIcon className="size-4 text-muted-foreground" />
              Latest imagery
              <span className="font-normal text-muted-foreground">{project._count.imagery}</span>
              <Link href={`${basePath}/project/${project.id}/imagery`} className="ml-auto text-sm font-normal text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </h2>
            {project.imagery.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imagery uploaded yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {project.imagery.map((img) => (
                  <li key={img.id}>
                    <Link href={`${basePath}/project/${project.id}/imagery`} className="block overflow-hidden rounded-lg border hover:shadow-sm">
                      {/* Access-checked API image (see app/api/imagery). */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageryUrl(img.id, "thumb")}
                        alt={`${IMAGERY_SOURCE_LABELS[img.source as ImagerySource]} image, ${formatDate(img.captureDate)}`}
                        loading="lazy"
                        className="aspect-3/2 w-full bg-muted object-cover"
                      />
                      <div className="px-2 py-1.5 text-xs">
                        <div className="font-medium">{formatDate(img.captureDate)}</div>
                        <div className="text-muted-foreground">{IMAGERY_SOURCE_LABELS[img.source as ImagerySource]}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {project._count.imagery >= 2 && (
                <Button size="sm" nativeButton={false} render={<Link href={`${basePath}/project/${project.id}/compare?from=project`} />}>
                  <ColumnsIcon />
                  Compare imagery
                </Button>
              )}
              {can.uploadImagery && (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`${basePath}/project/${project.id}/imagery/upload`} />}>
                  <UploadIcon />
                  Upload imagery
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4" aria-labelledby="verifications-heading">
            <h2 id="verifications-heading" className="mb-3 flex items-center gap-2 font-medium">
              <ClipboardCheckIcon className="size-4 text-muted-foreground" />
              Verifications
              <span className="font-normal text-muted-foreground">{verifications.length}</span>
            </h2>
            {verifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No verifications yet.{project._count.imagery >= 2 && " Compare the imagery to record one."}
              </p>
            ) : (
              <ul className="grid gap-3">
                {verifications.slice(0, 5).map((v) => {
                  const style = OUTCOME_STYLE[v.outcome];
                  return (
                    <li key={v.id} className="grid gap-1 text-sm">
                      <div className={`flex items-center gap-1.5 font-medium ${style.className}`}>
                        <style.icon className="size-4" />
                        {VERIFICATION_OUTCOME_LABELS[v.outcome]}
                      </div>
                      {v.notes && <p className="text-muted-foreground">{v.notes}</p>}
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span>
                          {v.byName} · {formatDate(v.at)}
                        </span>
                        <Link
                          href={`${basePath}/project/${project.id}/compare?from=project&images=${v.imageIds.join(",")}`}
                          className="underline-offset-2 hover:text-foreground hover:underline"
                        >
                          View comparison ({v.fromLabel} → {v.toLabel})
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4" aria-labelledby="issues-heading">
            <h2 id="issues-heading" className="mb-3 flex items-center gap-2 font-medium">
              <CircleAlertIcon className="size-4 text-muted-foreground" />
              Issues
              <span className="font-normal text-muted-foreground">{project.issues.length}</span>
            </h2>
            {project.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues raised.</p>
            ) : (
              <ul className="grid gap-3">
                {project.issues.map((i) => (
                  <li key={i.id} className="grid gap-1 text-sm">
                    <div className="font-medium">{i.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`rounded-full border px-1.5 py-0.5 ${PRIORITY_STYLE[i.priority as IssuePriority]}`}>
                        {ISSUE_PRIORITY_LABELS[i.priority as IssuePriority]}
                      </span>
                      <span className="rounded-full border px-1.5 py-0.5">{ISSUE_STATUS_LABELS[i.status as IssueStatus]}</span>
                      {i.meetingDate && <span className="text-muted-foreground">Review meeting {formatDate(i.meetingDate)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4" aria-labelledby="directives-heading">
            <h2 id="directives-heading" className="mb-3 flex items-center gap-2 font-medium">
              <ScrollTextIcon className="size-4 text-muted-foreground" />
              Directives
              <span className="font-normal text-muted-foreground">{directives.length}</span>
            </h2>
            {directives.length === 0 ? (
              <p className="text-sm text-muted-foreground">No directives for this project.</p>
            ) : (
              <ul className="grid gap-3">
                {directives.map((d) => {
                  const open = d.status === "OPEN" || d.status === "IN_PROGRESS";
                  const overdue = open && d.dueDate != null && d.dueDate < now;
                  return (
                    <li key={d.id} className="grid gap-1 text-sm">
                      <p>{d.text}</p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>From {d.fromUser.name}</span>
                        <span>· {DIRECTIVE_STATUS_LABELS[d.status as DirectiveStatus]}</span>
                        {d.dueDate && (
                          <span className={overdue ? "font-medium text-red-700" : ""}>
                            · {overdue ? "Overdue since" : "Due"} {formatDate(d.dueDate)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4" aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="mb-3 flex items-center gap-2 font-medium">
              <HistoryIcon className="size-4 text-muted-foreground" />
              Recent activity
            </h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span>
                      {a.summary}
                      {a.userName && <span className="text-muted-foreground"> · {a.userName}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
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
