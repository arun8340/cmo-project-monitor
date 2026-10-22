import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { requireStateAccess } from "@/lib/auth/dal";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import { getAgendaOptions } from "@/lib/data/meetings";
import { todayIST } from "@/lib/dates";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("new") };
}

type Params = PageProps<"/[locale]/[state]/meetings/new">;

export default function NewMeetingPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <NewMeeting params={params} />
      </Suspense>
    </main>
  );
}

async function NewMeeting({ params }: { params: Params["params"] }) {
  const { state: stateParam } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!canManageMeetings(user)) notFound();
  const [options, t, locale] = await Promise.all([
    getAgendaOptions(user, state),
    getTranslations("meetings"),
    getLocale(),
  ]);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("title"), href: `${basePath}/meetings` },
          { label: t("new") },
        ]}
      />
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">
          {t("new")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("newIntro")}</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <MeetingForm
          stateSlug={state.code.toLowerCase()}
          options={options}
          initial={{
            title: t("defaultTitle"),
            date: "",
            time: "11:00",
            venue: "",
            chairedBy: t("defaultChair"),
            notes: "",
            items: [],
          }}
          today={todayIST()}
          cancelHref={`${basePath}/meetings`}
        />
      </div>
    </div>
  );
}
