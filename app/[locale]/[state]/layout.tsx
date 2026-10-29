import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  AppHeader,
  AppHeaderSkeleton,
} from "@/components/app-shell/app-header";
import {
  StateNav,
  type NavItem,
  type NavSubItem,
} from "@/components/app-shell/state-nav";
import { getNavMenus } from "@/lib/data/projects";
import { getNavMeetings } from "@/lib/data/meetings";
import { getRequestBadge } from "@/lib/data/requests";
import { isImageryDeskOnly } from "@/lib/auth/project-permissions";

/** Sections DoIT (imagery only) does not see. */
const DOIT_HIDDEN = new Set(["meetings", "issues", "directives", "departments"]);
import { formatMeetingTime } from "@/components/meetings/meeting-bits";
import { localName } from "@/lib/i18n/names";
import { getStateConfig, STATE_CODES, type StateConfig } from "@/config/states";
import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessState } from "@/lib/auth/scope";
import { getNavCounts } from "@/lib/data/directives";
import { stateBasePath } from "@/config/portals";
import { getCurrentPortal } from "@/lib/portal";
import { getLocale, getTranslations } from "next-intl/server";

export function generateStaticParams() {
  return STATE_CODES.map((code) => ({ state: code.toLowerCase() }));
}

/**
 * Shell for everything inside a state (/rj, /mh). No auth check here — layouts
 * don't re-run on navigation. Each page authorizes via requireStateAccess().
 */
export default function StateLayout({
  children,
  params,
}: LayoutProps<"/[locale]/[state]">) {
  return (
    <>
      <Suspense fallback={<AppHeaderSkeleton />}>
        <StateHeader params={params} />
      </Suspense>
      {/* Page background image; a plain fixed layer so full-screen views (compare, live tracking) can still cover the header. */}
      <div aria-hidden className="app-backdrop" />
      <div className="flex-1">{children}</div>
    </>
  );
}

async function StateHeader({
  params,
}: {
  params: LayoutProps<"/[locale]/[state]">["params"];
}) {
  const { state } = await params;
  const config = getStateConfig(state.toUpperCase());
  const portal = await getCurrentPortal();
  // A state portal only ever renders its own state.
  if (
    !config ||
    !portal ||
    (portal.kind === "state" && portal.stateCode !== config.code)
  )
    notFound();
  const base = stateBasePath(portal, config.code);
  const t = await getTranslations("nav");
  const labels = {
    overview: t("overview"),
    projects: t("projects"),
    districts: t("districts"),
    imagery: t("imagery"),
    issues: t("issues"),
    directives: t("directives"),
    meetings: t("meetings"),
    activity: t("activity"),
    departments: t("departments"),
    allProjects: t("allProjects"),
    allDistricts: t("allDistricts"),
    allMeetings: t("allMeetings"),
    requests: t("requests"),
    allDepartments: t("allDepartments"),
  };
  return (
    <AppHeader
      state={config}
      homeHref={base || "/"}
      nav={
        <Suspense fallback={<StateNav items={navItems(base, labels)} />}>
          <NavWithCounts base={base} state={config} labels={labels} />
        </Suspense>
      }
    />
  );
}

type NavLabels = Record<
  | "overview"
  | "projects"
  | "districts"
  | "imagery"
  | "issues"
  | "directives"
  | "meetings"
  | "activity"
  | "departments"
  | "allProjects"
  | "allDistricts"
  | "allDepartments"
  | "allMeetings"
  | "requests",
  string
>;
type NavMenus = {
  meetings: NavSubItem[];
  projects: NavSubItem[];
  districts: NavSubItem[];
  departments: NavSubItem[];
};

function navItems(
  base: string,
  l: NavLabels,
  counts?: { openIssues: number; overdueDirectives: number; requests?: number },
  showActivity = false,
  menus?: NavMenus,
): NavItem[] {
  return [
    { key: "overview", href: base || "/", label: l.overview, fallback: true },
    {
      key: "meetings",
      href: `${base}/meetings`,
      label: l.meetings,
      children: menus?.meetings,
      allLabel: l.allMeetings,
    },
    { key: "imagery", href: `${base}/imagery`, label: l.imagery },
    {
      key: "requests",
      href: `${base}/requests`,
      label: l.requests,
      count: counts?.requests,
    },
    {
      key: "projects",
      href: `${base}/projects`,
      label: l.projects,
      also: [`${base}/project`],
      children: menus?.projects,
      allLabel: l.allProjects,
    },
    {
      key: "districts",
      href: `${base}/districts`,
      label: l.districts,
      also: [`${base}/district`],
      children: menus?.districts,
      allLabel: l.allDistricts,
    },
    {
      key: "issues",
      href: `${base}/issues`,
      label: l.issues,
      count: counts?.openIssues,
    },
    {
      key: "directives",
      href: `${base}/directives`,
      label: l.directives,
      count: counts?.overdueDirectives,
      danger: true,
    },
    ...(showActivity
      ? [{ key: "activity", href: `${base}/activity`, label: l.activity }]
      : []),
    {
      key: "departments",
      href: `${base}/departments`,
      label: l.departments,
      children: menus?.departments,
      allLabel: l.allDepartments,
    },
  ];
}

/** Open issues and overdue directives in the user's scope, for the nav badges. */
async function NavWithCounts({
  base,
  state,
  labels,
}: {
  base: string;
  state: StateConfig;
  labels: NavLabels;
}) {
  const user = await getCurrentUser();
  if (!user || !canAccessState(user, state.code))
    return <StateNav items={navItems(base, labels)} />;
  const [navCounts, requestBadge, menus, meetings, locale, tn] =
    await Promise.all([
      getNavCounts(user, state),
      getRequestBadge(user, state),
      getNavMenus(user, state),
      getNavMeetings(user, state),
      getLocale(),
      getTranslations("nav"),
    ]);
  const counts = { ...navCounts, requests: requestBadge };
  const ln = (n: { name: string; nameLocal: string | null }) =>
    localName(locale, n.name, n.nameLocal);
  const meeting = (m: {
    id: string;
    title: string;
    meetingAt: Date;
    status: string;
  }) => ({
    href: `${base}/meetings/${m.id}`,
    label: formatMeetingTime(m.meetingAt, locale),
    hint: m.status === "DRAFT" ? `${m.title} · ${tn("draft")}` : m.title,
  });
  const sub: NavMenus = {
    meetings: [
      {
        href: `${base}/meetings?tab=upcoming`,
        label: tn("upcomingMeetings"),
        heading: true,
      },
      ...meetings.upcoming.map(meeting),
      {
        href: `${base}/meetings?tab=past`,
        label: tn("pastMeetings"),
        heading: true,
      },
      ...meetings.past.map(meeting),
    ],
    projects: menus.projects.map((p) => ({
      href: `${base}/project/${p.id}`,
      label: ln(p),
      hint: `${ln(p.district)}${p.imagery ? "" : ` · ${tn("noImagery")}`}`,
    })),
    districts: menus.districts.map((d) => ({
      href: `${base}/district/${d.slug}`,
      label: ln(d),
      hint: tn("projectCount", { count: d.projects }),
    })),
    departments: menus.departments.map((d) => ({
      href: `${base}/projects?dept=${d.slug}`,
      label: ln(d),
    })),
  };
  return (
    <StateNav
      items={navItems(
        base,
        labels,
        counts,
        user.permissions.includes("audit.view"),
        sub,
      ).filter((it) => !(isImageryDeskOnly(user) && DOIT_HIDDEN.has(it.key)))}
    />
  );
}
