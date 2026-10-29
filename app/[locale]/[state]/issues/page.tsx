import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CircleAlertIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { FilterChips, withParams } from "@/components/workflow/filter-chips";
import { IssueStatusBadge, PriorityBadge } from "@/components/workflow/badges";
import { AutoSubmitSelect } from "@/components/workflow/auto-submit-select";
import { requireStateAccess } from "@/lib/auth/dal";
import { isImageryDeskOnly } from "@/lib/auth/project-permissions";
import { listIssues, parseIssueFilters, type IssueFilters } from "@/lib/data/issues";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { getLabels } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";
import { formatDate, relativeDays } from "@/lib/format";
import { parseDateInput } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("issues"))("title") };
}

type Params = PageProps<"/[locale]/[state]/issues">;

export default function IssuesPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Issues params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const selectClass = "h-9 rounded-lg border bg-background px-2 text-sm";

async function Issues({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (isImageryDeskOnly(user)) notFound();
  const f = parseIssueFilters(sp);
  const { rows, counts, openCount, total, options } = await listIssues(user, state, f);
  const listPath = `${basePath}/issues`;
  const now = new Date();
  const [t, tc, labels, locale] = await Promise.all([getTranslations("issues"), getTranslations("common"), getLabels(), getLocale()]);
  const fmt = (d: Date) => formatDate(d, locale);

  const link = (over: Partial<IssueFilters>) => {
    const v = { ...f, ...over };
    return withParams(listPath, {
      status: v.status === "open" ? null : v.status,
      priority: v.priority?.toLowerCase(),
      district: v.district,
      dept: v.dept,
      meeting: v.meeting,
      q: v.q,
    });
  };
  const meetingLabel = (d: string) => (d === options.meetings[0] ? t("lastMeetingOption", { date: fmt(parseDateInput(d)!) }) : fmt(parseDateInput(d)!));

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: localName(locale, state.name, state.nameLocal), href: basePath || "/" }, { label: t("title") }]} />
      <div>
        <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight text-navy [&>svg]:hidden">
          <CircleAlertIcon className="size-6 text-muted-foreground" />
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("summary", { open: openCount, total })}
          {f.meeting && <> · {t("raisedAtMeeting", { date: fmt(parseDateInput(f.meeting)!) })}</>}. {t("raisedFromProject")}
        </p>
      </div>

      <FilterChips
        label={t("filterByStatus")}
        chips={[
          { key: "open", label: t("open"), count: openCount, href: link({ status: "open" }), active: f.status === "open" },
          ...ISSUE_STATUSES.map((s) => ({
            key: s,
            label: labels.issueStatus[s],
            count: counts[s],
            href: link({ status: s.toLowerCase() }),
            active: f.status === s.toLowerCase(),
          })),
          { key: "all", label: tc("all"), count: total, href: link({ status: "all" }), active: f.status === "all" },
        ]}
      />

      <Form action={listPath} className="flex flex-wrap items-center gap-2" role="search">
        {f.status !== "open" && <input type="hidden" name="status" value={f.status} />}
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-9 w-full rounded-lg border bg-background pr-3 pl-8 text-sm"
          />
        </div>
        <AutoSubmitSelect name="priority" defaultValue={f.priority?.toLowerCase() ?? ""} className={selectClass} aria-label={t("priority")}>
          <option value="">{t("allPriorities")}</option>
          {ISSUE_PRIORITIES.map((p) => (
            <option key={p} value={p.toLowerCase()}>
              {labels.priority[p]}
            </option>
          ))}
        </AutoSubmitSelect>
        {options.districts.length > 1 && (
          <AutoSubmitSelect name="district" defaultValue={f.district ?? ""} className={selectClass} aria-label={t("district")}>
            <option value="">{t("allDistricts")}</option>
            {options.districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </AutoSubmitSelect>
        )}
        {options.departments.length > 1 && (
          <AutoSubmitSelect name="dept" defaultValue={f.dept ?? ""} className={selectClass} aria-label={t("department")}>
            <option value="">{t("allDepartments")}</option>
            {options.departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </AutoSubmitSelect>
        )}
        {options.meetings.length > 0 && (
          <AutoSubmitSelect name="meeting" defaultValue={f.meeting ?? ""} className={selectClass} aria-label={t("meeting")}>
            <option value="">{t("anyMeeting")}</option>
            {options.meetings.map((m) => (
              <option key={m} value={m}>
                {meetingLabel(m)}
              </option>
            ))}
          </AutoSubmitSelect>
        )}
        <button type="submit" className="sr-only">
          {tc("apply")}
        </button>
      </Form>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
          <SearchXIcon className="size-6 text-muted-foreground" />
          <p className="font-medium">{t("noMatch")}</p>
          <Link href={listPath} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
            {tc("clearFilters")}
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-[#faf8f3] text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("issue")}</th>
                  <th className="px-4 py-3 font-semibold">{t("project")}</th>
                  <th className="px-4 py-3 font-semibold">{t("priority")}</th>
                  <th className="px-4 py-3 font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("raisedCol")}</th>
                  <th className="px-4 py-3 font-semibold">{t("meeting")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-[#faf8f3]">
                    <td className="max-w-80 px-4 py-3">
                      <Link href={`${listPath}/${r.id}`} className="font-semibold text-navy hover:underline">
                        {r.title}
                      </Link>
                      {r.raisedBy && <div className="text-xs text-muted-foreground">{tc("by", { name: r.raisedBy })}</div>}
                    </td>
                    <td className="max-w-72 px-4 py-3">
                      <Link href={`${basePath}/project/${r.project.id}`} className="font-semibold text-link hover:text-navy hover:underline">
                        {r.project.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {r.district} · {r.department}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <IssueStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground" title={fmt(r.createdAt)}>
                      {relativeDays(r.createdAt, now, locale)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{r.meetingDate ? fmt(r.meetingDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-2 rounded-xl border bg-card p-4">
                <Link href={`${listPath}/${r.id}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
                <div className="flex flex-wrap gap-1.5">
                  <PriorityBadge priority={r.priority} />
                  <IssueStatusBadge status={r.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.project.name} · {r.district} · {t("raisedAgo", { when: relativeDays(r.createdAt, now, locale) })}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
