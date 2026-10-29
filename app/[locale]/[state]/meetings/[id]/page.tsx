import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  CalendarDaysIcon,
  MapPinIcon,
  PencilIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { Panel } from "@/components/app-shell/page-parts";
import {
  AgendaList,
  formatMeetingTime,
  MeetingStatusBadge,
} from "@/components/meetings/meeting-bits";
import {
  MeetingStatusActions,
  PrintButton,
} from "@/components/meetings/meeting-actions";
import { requireStateAccess } from "@/lib/auth/dal";
import { canManageMeetings, isImageryDeskOnly } from "@/lib/auth/project-permissions";
import { getMeeting } from "@/lib/data/meetings";
import { formatDateTime } from "@/lib/format";
import { getLocale, getTranslations } from "next-intl/server";
import { localName, localNames } from "@/lib/i18n/names";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("agenda") };
}

type Params = PageProps<"/[locale]/[state]/meetings/[id]">;

export default function MeetingPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Meeting params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Meeting({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: Params["searchParams"];
}) {
  const [{ state: stateParam, id }, sp] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (isImageryDeskOnly(user)) notFound();
  const meeting = await getMeeting(user, state, id);
  if (!meeting) notFound();
  const [t, locale] = await Promise.all([
    getTranslations("meetings"),
    getLocale() as Promise<Locale>,
  ]);
  const manage = canManageMeetings(user);
  const government = localNames(
    locale,
    state.government.name,
    state.government.nameLocal,
  );
  const held = meeting.meetingAt < new Date();

  return (
    <div className="grid gap-5">
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            {
              label: localName(locale, state.name, state.nameLocal),
              href: basePath || "/",
            },
            { label: t("title"), href: `${basePath}/meetings` },
            { label: meeting.title },
          ]}
        />
      </div>

      {sp.saved === "1" && (
        <p
          role="status"
          className="rounded-lg border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ok print:hidden"
        >
          {meeting.status === "PUBLISHED"
            ? t("savedPublished")
            : t("savedDraft")}
        </p>
      )}

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-rust uppercase">
              {government.primary}
              {government.secondary && <> · {government.secondary}</>}
            </p>
            <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-tight text-navy">
              {meeting.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {held && meeting.status === "PUBLISHED" && (
              <span className="text-xs font-semibold text-muted-foreground">
                {t("held")}
              </span>
            )}
            <MeetingStatusBadge status={meeting.status} />
          </div>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <Fact
            icon={CalendarDaysIcon}
            label={t("when")}
            value={formatMeetingTime(meeting.meetingAt, locale)}
          />
          <Fact
            icon={MapPinIcon}
            label={t("fVenue")}
            value={meeting.venue ?? "—"}
          />
          <Fact
            icon={UserRoundIcon}
            label={t("fChairedBy")}
            value={meeting.chairedBy ?? "—"}
          />
        </dl>
        {meeting.notes && (
          <p className="mt-4 border-t pt-4 text-sm whitespace-pre-line text-muted-foreground">
            {meeting.notes}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4 print:hidden">
          <PrintButton />
          {manage && (
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`${basePath}/meetings/${meeting.id}/edit`} />
                }
              >
                <PencilIcon />
                {t("edit")}
              </Button>
              <MeetingStatusActions
                id={meeting.id}
                status={meeting.status}
                stateSlug={state.code.toLowerCase()}
              />
            </>
          )}
        </div>
      </section>

      <Panel title={t("agendaCount", { count: meeting.items.length })}>
        <AgendaList items={meeting.items} basePath={basePath} />
      </Panel>

      <p className="text-xs text-muted-foreground">
        {meeting.publishedAt
          ? t("publishedBy", {
              name: meeting.createdBy.name,
              date: formatDateTime(meeting.publishedAt, locale),
            })
          : t("createdBy", { name: meeting.createdBy.name })}
      </p>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPinIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold text-navy">{value}</dd>
      </div>
    </div>
  );
}
