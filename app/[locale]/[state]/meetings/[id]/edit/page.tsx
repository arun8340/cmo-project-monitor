import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { requireStateAccess } from "@/lib/auth/dal";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import { getAgendaOptions, getMeeting } from "@/lib/data/meetings";
import { toDateInput, todayIST } from "@/lib/dates";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("edit") };
}

type Params = PageProps<"/[locale]/[state]/meetings/[id]/edit">;

export default function EditMeetingPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <EditMeeting params={params} />
      </Suspense>
    </main>
  );
}

const IST_TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

async function EditMeeting({ params }: { params: Params["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!canManageMeetings(user)) notFound();
  const [meeting, options, t, locale] = await Promise.all([
    getMeeting(user, state, id),
    getAgendaOptions(user, state),
    getTranslations("meetings"),
    getLocale(),
  ]);
  if (!meeting) notFound();
  const meetingPath = `${basePath}/meetings/${meeting.id}`;

  // Keep links to items no longer in the option lists (e.g. resolved issues) selectable.
  const keep = <T extends { id: string; label: string }>(
    list: T[],
    extra: { id: string; label: string }[],
    fill: Omit<T, "id" | "label">,
  ) => [
    ...list,
    ...extra
      .filter((e) => !list.some((o) => o.id === e.id))
      .map((e) => ({ ...fill, ...e }) as T),
  ];
  const opts = {
    projects: keep(
      options.projects,
      meeting.items.flatMap((i) =>
        i.project ? [{ id: i.project.id, label: i.project.name }] : [],
      ),
      { status: "ONGOING" as const },
    ),
    issues: keep(
      options.issues,
      meeting.items.flatMap((i) =>
        i.issue ? [{ id: i.issue.id, label: i.issue.title }] : [],
      ),
      { priority: "LOW" as const },
    ),
    directives: keep(
      options.directives,
      meeting.items.flatMap((i) =>
        i.directive
          ? [{ id: i.directive.id, label: i.directive.text.slice(0, 120) }]
          : [],
      ),
      { overdue: false },
    ),
  };

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("title"), href: `${basePath}/meetings` },
          { label: meeting.title, href: meetingPath },
          { label: t("edit") },
        ]}
      />
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">
        {t("edit")}
      </h1>
      <div className="rounded-xl border bg-card p-5">
        <MeetingForm
          stateSlug={state.code.toLowerCase()}
          options={opts}
          initial={{
            id: meeting.id,
            status: meeting.status,
            title: meeting.title,
            date: toDateInput(meeting.meetingAt),
            time: IST_TIME.format(meeting.meetingAt),
            venue: meeting.venue ?? "",
            chairedBy: meeting.chairedBy ?? "",
            notes: meeting.notes ?? "",
            items: meeting.items.map((i) => ({
              title: i.title,
              notes: i.notes ?? "",
              kind: i.project
                ? "project"
                : i.issue
                  ? "issue"
                  : i.directive
                    ? "directive"
                    : "",
              refId: i.project?.id ?? i.issue?.id ?? i.directive?.id ?? "",
            })),
          }}
          today={todayIST()}
          cancelHref={meetingPath}
        />
      </div>
    </div>
  );
}
