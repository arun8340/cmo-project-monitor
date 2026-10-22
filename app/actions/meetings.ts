"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { directiveScope, issueScope, projectScope } from "@/lib/auth/scope";
import { canManageMeetings } from "@/lib/auth/project-permissions";
import { getStateConfig } from "@/config/states";
import { stateBasePath } from "@/config/portals";
import type { MeetingStatus } from "@/lib/constants";
import { getActionT } from "@/lib/i18n/server";
import { parseDateInput, todayIST } from "@/lib/dates";

export type MeetingFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/** One agenda row as sent by the form (JSON in the "items" field). */
type ItemInput = {
  title?: unknown;
  notes?: unknown;
  kind?: unknown;
  refId?: unknown;
};

const MAX_ITEMS = 40;

async function userAndState(formData: FormData) {
  const user = await getCurrentUser();
  const state = getStateConfig(
    String(formData.get("state") ?? "").toUpperCase(),
  );
  if (!user || !state) return null;
  if (user.portal.kind === "state" && user.portal.stateCode !== state.code)
    return null;
  if (!canManageMeetings(user)) return null;
  return { user, state };
}

/** CMO / Admin: create or edit a review meeting and its agenda; save as draft or publish. */
export async function saveMeeting(
  _prev: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx) return { message: t("noAccess") };
  const { user, state } = ctx;
  const values = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const id = values.id || null;
  const existing = id
    ? await db.meeting.findFirst({ where: { id, state: { code: state.code } } })
    : null;
  if (id && !existing) return { message: t("noAccess") };

  const title = (values.title ?? "").trim();
  const dateStr = values.date ?? "";
  const timeStr = values.time ?? "";
  const venue = (values.venue ?? "").trim();
  const chairedBy = (values.chairedBy ?? "").trim();
  const notes = (values.notes ?? "").trim();
  const publish = values.intent === "publish";

  let rawItems: ItemInput[] = [];
  try {
    const parsed = JSON.parse(values.items || "[]");
    if (Array.isArray(parsed)) rawItems = parsed;
  } catch {}
  const items = rawItems.map((i) => ({
    title: String(i.title ?? "").trim(),
    notes: String(i.notes ?? "").trim(),
    kind:
      i.kind === "project" || i.kind === "issue" || i.kind === "directive"
        ? i.kind
        : null,
    refId: typeof i.refId === "string" ? i.refId : "",
  }));

  const errors: Record<string, string> = {};
  if (title.length < 5) errors.title = t("v.meetingTitle");
  if (title.length > 150) errors.title = t("v.tooLong", { max: 150 });
  const day = parseDateInput(dateStr);
  if (!day) errors.date = t("v.meetingDate");
  else if (
    dateStr < todayIST() &&
    (!existing ||
      existing.meetingAt.getTime() !==
        new Date(`${dateStr}T${timeStr}:00+05:30`).getTime())
  ) {
    // Past dates only when editing a meeting that already had that date and time.
    errors.date = t("v.meetingPast");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr))
    errors.time = t("v.meetingTime");
  if (venue.length > 150) errors.venue = t("v.tooLong", { max: 150 });
  if (chairedBy.length > 150) errors.chairedBy = t("v.tooLong", { max: 150 });
  if (notes.length > 2000) errors.notes = t("v.tooLong", { max: 2000 });
  if (items.length > MAX_ITEMS)
    errors.items = t("v.agendaTooMany", { max: MAX_ITEMS });
  else if (
    items.some(
      (i) =>
        i.title.length < 3 || i.title.length > 300 || i.notes.length > 1000,
    )
  )
    errors.items = t("v.agendaItemTitle");
  const willBePublished = publish || existing?.status === "PUBLISHED";
  if (willBePublished && items.length === 0) errors.items = t("v.agendaEmpty");

  // Linked projects / issues / directives must be in the user's scope in this state.
  const refs = (kind: string) =>
    items.filter((i) => i.kind === kind && i.refId).map((i) => i.refId);
  const [projects, issues, directives] = await Promise.all([
    db.project.findMany({
      where: {
        AND: [projectScope(user, state.code), { id: { in: refs("project") } }],
      },
      select: { id: true },
    }),
    db.issue.findMany({
      where: {
        AND: [issueScope(user, state.code), { id: { in: refs("issue") } }],
      },
      select: { id: true },
    }),
    db.directive.findMany({
      where: {
        AND: [
          directiveScope(user, state.code),
          { id: { in: refs("directive") } },
        ],
      },
      select: { id: true },
    }),
  ]);
  const allowed = new Set(
    [...projects, ...issues, ...directives].map((r) => r.id),
  );
  if (items.some((i) => i.kind && i.refId && !allowed.has(i.refId)))
    errors.items = t("v.agendaRef");
  if (Object.keys(errors).length)
    return { message: t("fixErrors"), fieldErrors: errors, values };

  const meetingAt = new Date(`${dateStr}T${timeStr}:00+05:30`);
  const status: MeetingStatus = existing
    ? publish
      ? "PUBLISHED"
      : (existing.status as MeetingStatus)
    : publish
      ? "PUBLISHED"
      : "DRAFT";
  const data = {
    title,
    meetingAt,
    venue: venue || null,
    chairedBy: chairedBy || null,
    notes: notes || null,
    status,
  };
  const itemRows = items.map((i, n) => ({
    position: n + 1,
    title: i.title,
    notes: i.notes || null,
    projectId: i.kind === "project" && i.refId ? i.refId : null,
    issueId: i.kind === "issue" && i.refId ? i.refId : null,
    directiveId: i.kind === "directive" && i.refId ? i.refId : null,
  }));

  const meeting = await db.$transaction(async (tx) => {
    const stateRow = await tx.state.findUniqueOrThrow({
      where: { code: state.code },
    });
    const publishedAt =
      status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : null;
    const m = existing
      ? await tx.meeting.update({
          where: { id: existing.id },
          data: { ...data, publishedAt },
        })
      : await tx.meeting.create({
          data: {
            ...data,
            publishedAt,
            stateId: stateRow.id,
            createdById: user.id,
          },
        });
    await tx.meetingAgendaItem.deleteMany({ where: { meetingId: m.id } });
    await tx.meetingAgendaItem.createMany({
      data: itemRows.map((r) => ({ ...r, meetingId: m.id })),
    });
    const action = !existing
      ? "meeting.create"
      : existing.status !== status && status === "PUBLISHED"
        ? "meeting.publish"
        : "meeting.update";
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action,
        entityType: "Meeting",
        entityId: m.id,
        details: JSON.stringify({ title, items: itemRows.length, status }),
      },
    });
    return m;
  });

  redirect(
    `${stateBasePath(user.portal, state.code)}/meetings/${meeting.id}?saved=1`,
  );
}

/** Publish a draft, cancel a meeting, or bring a cancelled meeting back as a draft. */
export async function changeMeetingStatus(
  _prev: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx) return { message: t("noAccess") };
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "") as MeetingStatus;
  const m = await db.meeting.findFirst({
    where: { id, state: { code: ctx.state.code } },
    include: { _count: { select: { items: true } } },
  });
  if (!m) return { message: t("noAccess") };

  const allowed: Record<string, MeetingStatus[]> = {
    DRAFT: ["PUBLISHED", "CANCELLED"],
    PUBLISHED: ["CANCELLED"],
    CANCELLED: ["DRAFT"],
  };
  if (!allowed[m.status]?.includes(to))
    return { message: t("meetingTransitionNotAllowed") };
  if (to === "PUBLISHED" && m._count.items === 0)
    return { message: t("v.agendaEmpty") };

  const action =
    to === "PUBLISHED"
      ? "meeting.publish"
      : to === "CANCELLED"
        ? "meeting.cancel"
        : "meeting.restore";
  await db.$transaction([
    db.meeting.update({
      where: { id },
      data: {
        status: to,
        publishedAt:
          to === "PUBLISHED"
            ? new Date()
            : to === "DRAFT"
              ? null
              : m.publishedAt,
      },
    }),
    db.auditLog.create({
      data: {
        userId: ctx.user.id,
        action,
        entityType: "Meeting",
        entityId: id,
        details: JSON.stringify({ from: m.status, to }),
      },
    }),
  ]);
  refresh();
  return {
    ok: true,
    message: t(
      to === "PUBLISHED"
        ? "meetingPublished"
        : to === "CANCELLED"
          ? "meetingCancelled"
          : "meetingRestored",
    ),
  };
}
