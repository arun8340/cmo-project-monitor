import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarDaysIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader, PanelLink } from "@/components/app-shell/page-parts";
import {
  AgendaList,
  formatMeetingTime,
  MeetingStatusBadge,
} from "@/components/meetings/meeting-bits";
import { requireStateAccess } from "@/lib/auth/dal";
import { canManageMeetings, isImageryDeskOnly } from "@/lib/auth/project-permissions";
import { listMeetings } from "@/lib/data/meetings";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("title") };
}

type Params = PageProps<"/[locale]/[state]/meetings">;

export default function MeetingsPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <Meetings params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** CMO meetings: Upcoming / Past tabs, each meeting with its agenda. */
async function Meetings({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: Params["searchParams"];
}) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (isImageryDeskOnly(user)) notFound();
  const { upcoming, past } = await listMeetings(user, state);
  const [t, locale] = await Promise.all([
    getTranslations("meetings"),
    getLocale(),
  ]);
  const manage = canManageMeetings(user);
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const rows = tab === "past" ? past : upcoming;
  const path = `${basePath}/meetings`;

  const tabLink = (key: "upcoming" | "past", label: string, count: number) => (
    <Link
      href={`${path}?tab=${key}`}
      scroll={false}
      aria-current={tab === key ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
        tab === key
          ? "border-navy bg-navy font-semibold text-white"
          : "bg-card hover:bg-muted"
      }`}
    >
      {label}
      <span className={tab === key ? "text-white/70" : "text-muted-foreground"}>
        {count}
      </span>
    </Link>
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
            <Button nativeButton={false} render={<Link href={`${path}/new`} />}>
              <PlusIcon />
              {t("new")}
            </Button>
          )
        }
      />
      <nav aria-label={t("title")} className="flex flex-wrap gap-2">
        {tabLink("upcoming", t("upcoming"), upcoming.length)}
        {tabLink("past", t("past"), past.length)}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {tab === "past" ? t("noPast") : t("noUpcoming")}
        </p>
      ) : (
        <ul className="grid gap-4">
          {rows.map((m) => (
            <li
              key={m.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div
                className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${tab === "upcoming" ? "bg-navy text-white" : "border-b bg-[#faf8f3]"}`}
              >
                <div className="min-w-0">
                  <Link
                    href={`${path}/${m.id}`}
                    className={`text-lg leading-snug font-bold hover:underline ${tab === "upcoming" ? "text-white" : "text-navy"}`}
                  >
                    {m.title}
                  </Link>
                  <div
                    className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] ${tab === "upcoming" ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDaysIcon className="size-3.5" />
                      {formatMeetingTime(m.meetingAt, locale)}
                    </span>
                    {m.venue && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon className="size-3.5" />
                        {m.venue}
                      </span>
                    )}
                  </div>
                </div>
                <MeetingStatusBadge status={m.status} />
              </div>
              <div className="px-5 pt-3 pb-4">
                <p className="mb-1 text-[13px] font-semibold text-muted-foreground">
                  {t("agendaCount", { count: m.itemCount })}
                </p>
                <AgendaList items={m.items} basePath={basePath} compact />
                <div className="mt-1">
                  <PanelLink href={`${path}/${m.id}`}>
                    {t("openAgenda")}
                  </PanelLink>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
