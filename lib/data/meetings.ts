import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { directiveScope, issueScope, projectScope } from "@/lib/auth/scope";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import type {
  DirectiveStatus,
  IssuePriority,
  IssueStatus,
  MeetingStatus,
  ProjectStatus,
} from "@/lib/constants";
import { todayIST, parseDateInput, toDateInput } from "@/lib/dates";
import { slotDate, slotOnOrAfter } from "@/lib/meeting-slots";

const OPEN_ISSUE = { in: ["PENDING", "IN_PROGRESS"] };
const OPEN_DIRECTIVE = { in: ["OPEN", "IN_PROGRESS"] };

/**
 * Meetings of the state the user may see: everyone sees published and
 * cancelled meetings; drafts only those who manage meetings.
 */
export function meetingScope(
  user: CurrentUser,
  state: StateConfig,
): Prisma.MeetingWhereInput {
  return {
    state: { code: state.code },
    ...(canManageMeetings(user) ? {} : { status: { not: "DRAFT" } }),
  };
}

const PROJECT_SELECT = {
  select: {
    id: true,
    name: true,
    nameLocal: true,
    status: true,
    progressPercent: true,
    district: { select: { name: true, nameLocal: true } },
  },
} as const;

const ITEM_INCLUDE = {
  project: PROJECT_SELECT,
  issue: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      project: PROJECT_SELECT,
    },
  },
  directive: {
    select: {
      id: true,
      text: true,
      status: true,
      dueDate: true,
      project: PROJECT_SELECT,
    },
  },
} satisfies Prisma.MeetingAgendaItemInclude;

type AgendaProject = {
  id: string;
  name: string;
  nameLocal: string | null;
  status: ProjectStatus;
  progressPercent: number;
  district: { name: string; nameLocal: string | null };
  /** The viewer may open it. */
  linked: boolean;
};

export type AgendaItemView = {
  id: string;
  position: number;
  title: string;
  notes: string | null;
  /** The project this point is about: linked directly, or through its issue or directive. */
  about: AgendaProject | null;
  project: AgendaProject | null;
  issue: {
    id: string;
    title: string;
    status: IssueStatus;
    priority: IssuePriority;
    linked: boolean;
  } | null;
  directive: {
    id: string;
    text: string;
    status: DirectiveStatus;
    dueDate: Date | null;
    linked: boolean;
  } | null;
};

/** Agenda items with their linked project / issue / directive; `linked` = the user may open it. */
async function toItemViews(
  user: CurrentUser,
  state: StateConfig,
  items: Prisma.MeetingAgendaItemGetPayload<{ include: typeof ITEM_INCLUDE }>[],
) {
  const ids = (k: "projectId" | "issueId" | "directiveId") =>
    items.map((i) => i[k]).filter((x): x is string => !!x);
  const aboutOf = (i: (typeof items)[number]) =>
    i.project ?? i.issue?.project ?? i.directive?.project ?? null;
  const projectIds = items.map(aboutOf).flatMap((p) => (p ? [p.id] : []));
  const [projects, issues, directives] = await Promise.all([
    db.project.findMany({
      where: {
        AND: [projectScope(user, state.code), { id: { in: projectIds } }],
      },
      select: { id: true },
    }),
    db.issue.findMany({
      where: {
        AND: [issueScope(user, state.code), { id: { in: ids("issueId") } }],
      },
      select: { id: true },
    }),
    db.directive.findMany({
      where: {
        AND: [
          directiveScope(user, state.code),
          { id: { in: ids("directiveId") } },
        ],
      },
      select: { id: true },
    }),
  ]);
  const can = new Set([...projects, ...issues, ...directives].map((r) => r.id));
  const view = (p: NonNullable<ReturnType<typeof aboutOf>>): AgendaProject => ({
    ...p,
    status: p.status as ProjectStatus,
    linked: can.has(p.id),
  });
  return items.map((i): AgendaItemView => ({
    id: i.id,
    position: i.position,
    title: i.title,
    notes: i.notes,
    about: aboutOf(i) ? view(aboutOf(i)!) : null,
    project: i.project ? view(i.project) : null,
    issue: i.issue
      ? {
          id: i.issue.id,
          title: i.issue.title,
          status: i.issue.status as IssueStatus,
          priority: i.issue.priority as IssuePriority,
          linked: can.has(i.issue.id),
        }
      : null,
    directive: i.directive
      ? {
          ...i.directive,
          status: i.directive.status as DirectiveStatus,
          linked: can.has(i.directive.id),
        }
      : null,
  }));
}

/** Upcoming (soonest first) and past (latest first) meetings. */
export async function listMeetings(user: CurrentUser, state: StateConfig) {
  const today = parseDateInput(todayIST())!;
  const rows = await db.meeting.findMany({
    where: meetingScope(user, state),
    include: {
      _count: { select: { items: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { meetingAt: "asc" },
  });
  const list = rows.map((m) => ({
    ...m,
    status: m.status as MeetingStatus,
    itemCount: m._count.items,
  }));
  return {
    upcoming: list.filter((m) => m.meetingAt >= today),
    past: list.filter((m) => m.meetingAt < today).reverse(),
  };
}

export async function getMeeting(
  user: CurrentUser,
  state: StateConfig,
  id: string,
) {
  const m = await db.meeting.findFirst({
    where: { AND: [{ id }, meetingScope(user, state)] },
    include: {
      createdBy: { select: { name: true } },
      items: { include: ITEM_INCLUDE, orderBy: { position: "asc" } },
    },
  });
  if (!m) return null;
  return {
    ...m,
    status: m.status as MeetingStatus,
    items: await toItemViews(user, state, m.items),
  };
}

/**
 * The next meeting for the home page: the soonest from today that isn't
 * cancelled (drafts only for those who manage meetings), with its agenda.
 */
export async function getNextMeeting(user: CurrentUser, state: StateConfig) {
  const m = await db.meeting.findFirst({
    where: {
      AND: [
        meetingScope(user, state),
        { status: { not: "CANCELLED" } },
        { meetingAt: { gte: parseDateInput(todayIST())! } },
      ],
    },
    include: { items: { include: ITEM_INCLUDE, orderBy: { position: "asc" } } },
    orderBy: { meetingAt: "asc" },
  });
  if (!m) return null;
  return {
    ...m,
    status: m.status as MeetingStatus,
    items: await toItemViews(user, state, m.items),
  };
}
export type NextMeeting = NonNullable<
  Awaited<ReturnType<typeof getNextMeeting>>
>;

/** The most recent published meeting before today (the last review), with its agenda. */
export async function getPreviousMeeting(
  user: CurrentUser,
  state: StateConfig,
) {
  const m = await db.meeting.findFirst({
    where: {
      AND: [
        meetingScope(user, state),
        { status: "PUBLISHED" },
        { meetingAt: { lt: parseDateInput(todayIST())! } },
      ],
    },
    include: { items: { include: ITEM_INCLUDE, orderBy: { position: "asc" } } },
    orderBy: { meetingAt: "desc" },
  });
  if (!m) return null;
  return {
    ...m,
    status: m.status as MeetingStatus,
    items: await toItemViews(user, state, m.items),
  };
}

/**
 * What can go on an agenda: projects, open issues and open directives in the
 * user's scope, plus suggestions (delayed/stalled projects, high-priority open
 * issues, overdue directives).
 */
export async function getAgendaOptions(user: CurrentUser, state: StateConfig) {
  const now = new Date();
  const [projects, issues, directives] = await Promise.all([
    db.project.findMany({
      where: projectScope(user, state.code),
      select: {
        id: true,
        name: true,
        nameLocal: true,
        status: true,
        district: { select: { name: true } },
      },
      orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
    }),
    db.issue.findMany({
      where: { AND: [issueScope(user, state.code), { status: OPEN_ISSUE }] },
      select: {
        id: true,
        title: true,
        priority: true,
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.directive.findMany({
      where: {
        AND: [directiveScope(user, state.code), { status: OPEN_DIRECTIVE }],
      },
      select: { id: true, text: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  const PRIORITY: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return {
    projects: projects.map((p) => ({
      id: p.id,
      label: `${p.name} (${p.district.name})`,
      status: p.status as ProjectStatus,
    })),
    issues: issues
      .sort((a, b) => (PRIORITY[a.priority] ?? 9) - (PRIORITY[b.priority] ?? 9))
      .map((i) => ({
        id: i.id,
        title: i.title,
        label: `${i.title} – ${i.project.name}`,
        priority: i.priority as IssuePriority,
      })),
    directives: directives.map((d) => ({
      id: d.id,
      label: d.text.length > 120 ? `${d.text.slice(0, 120)}…` : d.text,
      overdue: !!d.dueDate && d.dueDate < now,
    })),
  };
}
export type AgendaOptions = Awaited<ReturnType<typeof getAgendaOptions>>;

/** The first 15th / 30th from today without a (non-cancelled) meeting in this state, as "YYYY-MM-DD". */
export async function nextFreeMeetingDay(state: StateConfig) {
  const now = new Date();
  const taken = await db.meeting.findMany({
    where: {
      state: { code: state.code },
      status: { not: "CANCELLED" },
      meetingAt: { gte: parseDateInput(todayIST())! },
    },
    select: { meetingAt: true },
  });
  const takenDays = new Set(taken.map((m) => toDateInput(m.meetingAt)));
  let slot = slotOnOrAfter(now);
  while (takenDays.has(toDateInput(slotDate(slot)))) slot += 1;
  return toDateInput(slotDate(slot));
}
