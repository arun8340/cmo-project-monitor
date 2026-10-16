import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CircleAlertIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { StatusBadge } from "@/components/project/status-badge";
import { ProgressCell } from "@/components/project/progress-cell";
import { ListControls } from "@/components/project/list-controls";
import { requireStateAccess } from "@/lib/auth/dal";
import { canCreateProject } from "@/lib/auth/project-permissions";
import { getProjectList, type ProjectRow } from "@/lib/data/district";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/constants";
import { STATUS_COLOR, type StatusCounts } from "@/lib/district-health";
import { formatBudget, formatDate } from "@/lib/format";

type Params = PageProps<"/[state]/district/[district]/[dept]">;

export default function ProjectListPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<ListSkeleton />}>
        <ProjectList params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const COUNT_KEY: Record<ProjectStatus, keyof Omit<StatusCounts, "total">> = {
  ONGOING: "ongoing",
  DELAYED: "delayed",
  STALLED: "stalled",
  COMPLETED: "completed",
  NOT_STARTED: "notStarted",
};
const CHIP_ORDER: ProjectStatus[] = ["ONGOING", "DELAYED", "STALLED", "COMPLETED", "NOT_STARTED"];
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function ProjectList({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, district: districtSlug, dept: deptSlug }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const list = await getProjectList(user, state, districtSlug, deptSlug, {
    status: str(sp.status),
    q: str(sp.q),
    sort: str(sp.sort),
  });
  if (!list) notFound();

  const { district, department, counts, rows, filters } = list;
  const districtPath = `${basePath}/district/${districtSlug}`;
  const listPath = `${districtPath}/${deptSlug}`;
  const title = department ? department.name : "All departments";

  const href = (status: ProjectStatus | null) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status.toLowerCase());
    if (filters.q) qs.set("q", filters.q);
    if (filters.sort !== "behind") qs.set("sort", filters.sort);
    const s = qs.toString();
    return s ? `${listPath}?${s}` : listPath;
  };

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: district.name, href: districtPath },
          { label: title },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {title}
            {department && <span className="ml-2 font-normal text-muted-foreground">{department.nameLocal}</span>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {district.name} district · {counts.total} project{counts.total === 1 ? "" : "s"}
            {filters.q && <> matching “{filters.q}”</>}
          </p>
        </div>
        {canCreateProject(user) && (
          <Button
            nativeButton={false}
            render={
              <Link href={`${basePath}/project/new?district=${districtSlug}${department ? `&dept=${department.code.toLowerCase()}` : ""}`} />
            }
          >
            <PlusIcon />
            Add project
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        <nav aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip href={href(null)} active={!filters.status} label="All" count={counts.total} />
          {CHIP_ORDER.map((s) => (
            <Chip
              key={s}
              href={href(s)}
              active={filters.status === s}
              label={PROJECT_STATUS_LABELS[s]}
              count={counts[COUNT_KEY[s]]}
              color={STATUS_COLOR[s]}
            />
          ))}
        </nav>
        <ListControls action={listPath} q={filters.q} status={filters.status} sort={filters.sort} />
      </div>

      {rows.length === 0 ? (
        <EmptyState searched={!!filters.q || !!filters.status} clearHref={listPath} />
      ) : (
        <>
          <ProjectTable rows={rows} basePath={basePath} showDepartment={!department} />
          <ProjectCards rows={rows} basePath={basePath} showDepartment={!department} />
        </>
      )}
    </div>
  );
}

function Chip({ href, active, label, count, color }: { href: string; active: boolean; label: string; count: number; color?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted"
      } ${count === 0 && !active ? "opacity-50" : ""}`}
    >
      {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span className={active ? "text-background/70" : "text-muted-foreground"}>{count}</span>
    </Link>
  );
}

function ProjectName({ row, basePath, showDepartment }: { row: ProjectRow; basePath: string; showDepartment: boolean }) {
  return (
    <div className="min-w-0">
      <Link href={`${basePath}/project/${row.id}`} className="font-medium hover:underline">
        {row.name}
      </Link>
      {row.nameLocal && <div className="truncate text-xs text-muted-foreground">{row.nameLocal}</div>}
      {showDepartment && <div className="text-xs text-muted-foreground">{row.departmentName}</div>}
    </div>
  );
}

function ProjectTable({ rows, basePath, showDepartment }: { rows: ProjectRow[]; basePath: string; showDepartment: boolean }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Project</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Progress</th>
            <th className="px-4 py-2.5 text-right font-medium">Budget</th>
            <th className="px-4 py-2.5 font-medium">Timeline</th>
            <th className="px-4 py-2.5 font-medium">Latest imagery</th>
            <th className="px-4 py-2.5 text-right font-medium">Open issues</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="align-top hover:bg-muted/30">
              <td className="max-w-80 px-4 py-3">
                <ProjectName row={r} basePath={basePath} showDepartment={showDepartment} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3">
                <ProgressCell actual={r.progressPercent} planned={r.plannedPercent} behind={r.behind} />
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatBudget(r.budgetLakhs)}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                <div>Start {formatDate(r.startDate)}</div>
                <div>End {formatDate(r.plannedEndDate)}</div>
              </td>
              <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{formatDate(r.latestImagery)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.openIssues > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-red-700">
                    <CircleAlertIcon className="size-3.5" />
                    {r.openIssues}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectCards({ rows, basePath, showDepartment }: { rows: ProjectRow[]; basePath: string; showDepartment: boolean }) {
  return (
    <ul className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <li key={r.id} className="grid gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <ProjectName row={r} basePath={basePath} showDepartment={showDepartment} />
            <StatusBadge status={r.status} />
          </div>
          <ProgressCell actual={r.progressPercent} planned={r.plannedPercent} behind={r.behind} />
          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Budget</dt>
              <dd className="font-medium">{formatBudget(r.budgetLakhs)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Planned end</dt>
              <dd className="font-medium">{formatDate(r.plannedEndDate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Open issues</dt>
              <dd className={`font-medium ${r.openIssues > 0 ? "text-red-700" : ""}`}>{r.openIssues}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ searched, clearHref }: { searched: boolean; clearHref: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
      <SearchXIcon className="size-6 text-muted-foreground" />
      <p className="font-medium">{searched ? "No projects match" : "No projects in this department"}</p>
      {searched && (
        <Link href={clearHref} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
          Clear filters
        </Link>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
