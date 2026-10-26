import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { imageryRequestScope, projectScope } from "@/lib/auth/scope";
import {
  OPEN_REQUEST_STATUSES,
  type ImagerySource,
  type IssuePriority,
  type RequestStatus,
} from "@/lib/constants";
import { parseDateInput, todayIST } from "@/lib/dates";

export const REQUEST_TABS = [
  "open",
  "new",
  "review",
  "approved",
  "closed",
  "all",
] as const;
export type RequestTab = (typeof REQUEST_TABS)[number];

const TAB_STATUSES: Record<RequestTab, RequestStatus[] | null> = {
  open: OPEN_REQUEST_STATUSES,
  new: ["SUBMITTED"],
  review: ["UNDER_REVIEW"],
  approved: ["APPROVED", "ORDERED", "DELIVERED"],
  closed: ["REJECTED", "CANCELLED", "CLOSED"],
  all: null,
};

export type RequestFilters = {
  tab: RequestTab;
  mine: boolean;
  type: ImagerySource | null;
};

export function parseRequestFilters(
  sp: Record<string, string | string[] | undefined>,
): RequestFilters {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const tab = REQUEST_TABS.find((t) => t === str(sp.tab)) ?? "open";
  const type =
    (["SATELLITE", "DRONE", "FIELD_PHOTO"] as const).find(
      (t) => t === str(sp.type).toUpperCase(),
    ) ?? null;
  return { tab, mine: str(sp.mine) === "1", type };
}

const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** Overdue: still waiting and past the needed-by date. */
export const isOverdue = (
  r: { status: string; neededBy: Date },
  today = parseDateInput(todayIST())!,
) =>
  (OPEN_REQUEST_STATUSES as string[]).includes(r.status) && r.neededBy < today;

const ROW_SELECT = {
  id: true,
  type: true,
  purpose: true,
  neededBy: true,
  priority: true,
  status: true,
  createdAt: true,
  requestedById: true,
  requestedBy: { select: { name: true, role: { select: { key: true } } } },
  project: {
    select: {
      id: true,
      name: true,
      nameLocal: true,
      district: { select: { name: true, nameLocal: true } },
      department: { select: { name: true, nameLocal: true, code: true } },
    },
  },
} satisfies Prisma.ImageryRequestSelect;

type RowSource = Prisma.ImageryRequestGetPayload<{ select: typeof ROW_SELECT }>;
const toRow = (r: RowSource) => ({
  ...r,
  type: r.type as ImagerySource,
  priority: r.priority as IssuePriority,
  status: r.status as RequestStatus,
  overdue: isOverdue(r),
});
export type RequestRow = ReturnType<typeof toRow>;

/** Requests in scope for the list / DoIT queue: open ones by priority then needed-by; others newest first. */
export async function listRequests(
  user: CurrentUser,
  state: StateConfig,
  f: RequestFilters,
) {
  const base: Prisma.ImageryRequestWhereInput[] = [
    imageryRequestScope(user, state.code),
  ];
  if (f.mine) base.push({ requestedById: user.id });
  if (f.type) base.push({ type: f.type });
  const statuses = TAB_STATUSES[f.tab];
  const [rows, groups] = await Promise.all([
    db.imageryRequest.findMany({
      where: {
        AND: [...base, ...(statuses ? [{ status: { in: statuses } }] : [])],
      },
      select: ROW_SELECT,
    }),
    db.imageryRequest.groupBy({
      by: ["status"],
      where: { AND: base },
      _count: true,
    }),
  ]);
  const byStatus = new Map(groups.map((g) => [g.status, g._count]));
  const counts = Object.fromEntries(
    REQUEST_TABS.map((t) => [
      t,
      (TAB_STATUSES[t] ?? [...byStatus.keys()]).reduce(
        (n, s) => n + (byStatus.get(s) ?? 0),
        0,
      ),
    ]),
  ) as Record<RequestTab, number>;
  const list = rows.map(toRow);
  const openFirst = f.tab === "open" || f.tab === "new" || f.tab === "review";
  list.sort((a, b) =>
    openFirst
      ? (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
        a.neededBy.getTime() - b.neededBy.getTime()
      : b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return { rows: list, counts };
}

export async function getRequest(
  user: CurrentUser,
  state: StateConfig,
  id: string,
) {
  const r = await db.imageryRequest.findFirst({
    where: { AND: [{ id }, imageryRequestScope(user, state.code)] },
    select: {
      ...ROW_SELECT,
      project: {
        select: {
          ...ROW_SELECT.project.select,
          latitude: true,
          longitude: true,
          imagery: {
            select: { id: true, captureDate: true, source: true },
            orderBy: { captureDate: "desc" },
            take: 1,
          },
        },
      },
      updates: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return r ? { ...toRow(r), project: r.project, updates: r.updates } : null;
}

/** Projects the user may request imagery for (with whether they already have imagery). */
export async function getRequestableProjects(
  user: CurrentUser,
  state: StateConfig,
) {
  const projects = await db.project.findMany({
    where: projectScope(user, state.code),
    select: {
      id: true,
      name: true,
      nameLocal: true,
      district: { select: { name: true } },
      _count: { select: { imagery: true } },
    },
    orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    nameLocal: p.nameLocal,
    district: p.district.name,
    hasImagery: p._count.imagery > 0,
  }));
}

/**
 * Menu badge: for DoIT, requests waiting on them (submitted or under review);
 * for everyone else, their own requests still open.
 */
export async function getRequestBadge(user: CurrentUser, state: StateConfig) {
  const doit = user.permissions.includes("imagery.process");
  return db.imageryRequest.count({
    where: {
      AND: [
        imageryRequestScope(user, state.code),
        doit
          ? { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }
          : { requestedById: user.id, status: { in: OPEN_REQUEST_STATUSES } },
      ],
    },
  });
}

/** Open requests for one project (shown on the project page). */
export async function getProjectRequests(projectId: string) {
  const rows = await db.imageryRequest.findMany({
    where: { projectId, status: { in: OPEN_REQUEST_STATUSES } },
    select: ROW_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}
