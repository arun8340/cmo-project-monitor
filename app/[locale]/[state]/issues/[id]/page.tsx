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
import type { IssuePriority, IssueStatus } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { getLabels } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";
import { districtSlug } from "@/lib/district-slug";
import { formatDate, relativeDays } from "@/lib/format";
import { issueTransitions } from "@/lib/workflow";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("issues"))("issue") };
}

type Params = PageProps<"/[locale]/[state]/issues/[id]">;

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
  const [t, labels, locale] = await Promise.all([getTranslations("issues"), getLabels(), getLocale()]);
  const fmt = (d: Date) => formatDate(d, locale);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[{ label: localName(locale, state.name, state.nameLocal), href: basePath || "/" }, { label: t("title"), href: `${basePath}/issues` }, { label: issue.title }]}
      />

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={issue.priority as IssuePriority} />
          <IssueStatusBadge status={status} />
        </div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">{issue.title}</h1>
        <p className="text-sm text-muted-foreground">
          <Link href={`${basePath}/project/${p.id}`} className="font-medium text-foreground hover:underline">
            {localName(locale, p.name, p.nameLocal)}
          </Link>{" "}
          ·{" "}
          <Link href={districtPath} className="hover:underline">
            {localName(locale, p.district.name, p.district.nameLocal)}
          </Link>{" "}
          · {localName(locale, p.department.name, p.department.nameLocal)}
        </p>
      </div>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        {issue.description && <p className="text-sm">{issue.description}</p>}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label={t("raisedCol")} value={`${fmt(issue.createdAt)} (${relativeDays(issue.createdAt, new Date(), locale)})`} />
          <Fact label={t("raisedBy")} value={issue.createdBy?.name ?? "—"} />
          <Fact label={t("meeting")} value={issue.meetingDate ? fmt(issue.meetingDate) : "—"} />
          <Fact label={t("resolved")} value={issue.resolvedAt ? fmt(issue.resolvedAt) : "—"} />
        </dl>
        {canUpdateIssue(user) && (
          <div className="border-t pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">{t("updateStatus")}</div>
            <StatusChange kind="issue" id={issue.id} stateSlug={state.code.toLowerCase()} transitions={issueTransitions(status)} />
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 text-lg font-bold text-navy">
          {t("history")}
        </h2>
        <Timeline entries={issue.updates} labels={labels.issueStatus} createdVerb={t("raised")} />
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
