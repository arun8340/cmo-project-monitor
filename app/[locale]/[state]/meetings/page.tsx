import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDaysIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader, Panel } from "@/components/app-shell/page-parts";
import {
  formatMeetingTime,
  MeetingStatusBadge,
} from "@/components/meetings/meeting-bits";
import { requireStateAccess } from "@/lib/auth/dal";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import { listMeetings } from "@/lib/data/meetings";
import type { MeetingStatus } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("title") };
}

type Params = PageProps<"/[locale]/[state]/meetings">;

export default function MeetingsPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <Meetings params={params} />
      </Suspense>
    </main>
  );
}

type Row = {
  id: string;
  title: string;
  meetingAt: Date;
  venue: string | null;
  status: MeetingStatus;
  itemCount: number;
};

async function Meetings({ params }: { params: Params["params"] }) {
  const { state: stateParam } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const { upcoming, past } = await listMeetings(user, state);
  const [t, locale] = await Promise.all([
    getTranslations("meetings"),
    getLocale(),
  ]);
  const manage = canManageMeetings(user);

  const list = (rows: Row[], empty: string) =>
    rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{empty}</p>
    ) : (
      <ul className="divide-y border-t">
        {rows.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <Link
                href={`${basePath}/meetings/${m.id}`}
                className="font-semibold text-navy hover:underline"
              >
                {m.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDaysIcon className="size-3.5" />
                  {formatMeetingTime(m.meetingAt, locale)}
                </span>
                {m.venue && (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="size-3.5" />
                    {m.venue}
                  </span>
                )}
                <span>{t("itemCount", { count: m.itemCount })}</span>
              </div>
            </div>
            <MeetingStatusBadge status={m.status} />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("title") },
        ]}
      />
      <PageHeader
        title={t("title")}
        subtitle={t("intro")}
        actions={
          manage && (
            <Button
              nativeButton={false}
              render={<Link href={`${basePath}/meetings/new`} />}
            >
              <PlusIcon />
              {t("new")}
            </Button>
          )
        }
      />
      <Panel title={t("upcoming")}>{list(upcoming, t("noUpcoming"))}</Panel>
      <Panel title={t("past")}>{list(past, t("noPast"))}</Panel>
    </div>
  );
}
