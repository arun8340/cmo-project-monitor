import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { IssueStatusBadge, PriorityBadge } from "@/components/workflow/badges";
import { StatusChange } from "@/components/workflow/status-change";
import { Timeline } from "@/components/workflow/timeline";
import { requireStateAccess } from "@/lib/auth/dal";
import { canUpdateIssue } from "@/lib/auth/project-permissions";
import { getIssue } from "@/lib/data/issues";
import { ISSUE_STATUS_LABELS, type IssuePriority, type IssueStatus } from "@/lib/constants";
import { districtSlug } from "@/lib/district-slug";
import { formatDate, relativeDays } from "@/lib/format";
import { issueTransitions } from "@/lib/workflow";

export const metadata: Metadata = { title: "Issue" };

type Params = PageProps<"/[state]/issues/[id]">;

export default function IssuePage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Issue params={params} />
      </Suspense>
    </main>
  );
}

async function Issue({ params }: { params: Params["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const issue = await getIssue(user, state, id);
  if (!issue) notFound();

  const status = issue.status as IssueStatus;
  const p = issue.project;
  const districtPath = `${basePath}/district/${districtSlug(p.district.geoCode)}`;

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: state.name, href: basePath || "/" }, { label: "Issues", href: `${basePath}/issues` }, { label: issue.title }]} />

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={issue.priority as IssuePriority} />
          <IssueStatusBadge status={status} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{issue.title}</h1>
        <p className="text-sm text-muted-foreground">
          <Link href={`${basePath}/project/${p.id}`} className="font-medium text-foreground hover:underline">
            {p.name}
          </Link>{" "}
          ·{" "}
          <Link href={districtPath} className="hover:underline">
            {p.district.name}
          </Link>{" "}
          · {p.department.name}
        </p>
      </div>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        {issue.description && <p className="text-sm">{issue.description}</p>}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Raised" value={`${formatDate(issue.createdAt)} (${relativeDays(issue.createdAt)})`} />
          <Fact label="Raised by" value={issue.createdBy?.name ?? "—"} />
          <Fact label="Review meeting" value={issue.meetingDate ? formatDate(issue.meetingDate) : "—"} />
          <Fact label="Resolved" value={issue.resolvedAt ? formatDate(issue.resolvedAt) : "—"} />
        </dl>
        {canUpdateIssue(user) && (
          <div className="border-t pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Update status</div>
            <StatusChange kind="issue" id={issue.id} stateSlug={state.code.toLowerCase()} transitions={issueTransitions(status)} />
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 font-medium">
          History
        </h2>
        <Timeline entries={issue.updates} labels={ISSUE_STATUS_LABELS} createdVerb="Issue raised" />
      </section>
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
