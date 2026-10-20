"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { findAccessibleProject, getCurrentUser } from "@/lib/auth/dal";
import { issueScope } from "@/lib/auth/scope";
import { canRaiseIssue, canUpdateIssue } from "@/lib/auth/project-permissions";
import { getStateConfig } from "@/config/states";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, type IssuePriority, type IssueStatus } from "@/lib/constants";
import { getActionT, getLabels } from "@/lib/i18n/server";
import { parseDateInput } from "@/lib/dates";
import { issueTransitions } from "@/lib/workflow";

export type IssueFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };


async function userAndState(formData: FormData) {
  const user = await getCurrentUser();
  const state = getStateConfig(String(formData.get("state") ?? "").toUpperCase());
  if (!user || !state) return null;
  if (user.portal.kind === "state" && user.portal.stateCode !== state.code) return null;
  return { user, state };
}

/** Raise an issue on a project the user can access. */
export async function raiseIssue(_prev: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  const NO_ACCESS = t("noAccess");
  if (!ctx || !canRaiseIssue(ctx.user)) return { message: NO_ACCESS };
  const projectId = String(formData.get("projectId") ?? "");
  const access = await findAccessibleProject(ctx.user, projectId);
  if (!access || access.stateCode !== ctx.state.code) return { message: NO_ACCESS };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "") as IssuePriority;
  const meetingStr = String(formData.get("meetingDate") ?? "").trim();
  const meetingDate = meetingStr ? parseDateInput(meetingStr) : null;

  const errors: Record<string, string> = {};
  if (title.length < 5) errors.title = t("v.issueTitle");
  if (title.length > 200) errors.title = t("v.tooLong", { max: 200 });
  if (description.length > 2000) errors.description = t("v.tooLong", { max: 2000 });
  if (!ISSUE_PRIORITIES.includes(priority)) errors.priority = t("v.choosePriority");
  if (meetingStr && !meetingDate) errors.meetingDate = t("v.validDate");
  if (Object.keys(errors).length) return { message: t("fixErrors"), fieldErrors: errors };

  await db.$transaction(async (tx) => {
    const issue = await tx.issue.create({
      data: {
        projectId,
        title,
        description: description || null,
        priority,
        status: "PENDING",
        meetingDate,
        createdById: ctx.user.id,
        updates: { create: { fromStatus: null, toStatus: "PENDING", userId: ctx.user.id } },
      },
    });
    await tx.auditLog.create({
      data: { userId: ctx.user.id, action: "issue.create", entityType: "Project", entityId: projectId, details: JSON.stringify({ issueId: issue.id, title, priority }) },
    });
  });

  refresh();
  return { ok: true, message: t("issueRaised") };
}

/** Move an issue to another status (note required when resolving or reopening). */
export async function changeIssueStatus(_prev: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  const NO_ACCESS = t("noAccess");
  if (!ctx || !canUpdateIssue(ctx.user)) return { message: NO_ACCESS };
  const id = String(formData.get("id") ?? "");
  const issue = await db.issue.findFirst({ where: { AND: [{ id }, issueScope(ctx.user, ctx.state.code)] } });
  if (!issue) return { message: NO_ACCESS };

  const to = String(formData.get("to") ?? "") as IssueStatus;
  const note = String(formData.get("note") ?? "").trim();
  const transition = issueTransitions(issue.status as IssueStatus).find((t) => t.to === to);
  if (!ISSUE_STATUSES.includes(to) || !transition) return { message: t("transitionNotAllowed") };
  if (transition.noteRequired && note.length < 5) {
    return { message: t("fixErrors"), fieldErrors: { note: to === "RESOLVED" ? t("v.describeResolution") : t("v.explainReopen") } };
  }
  if (note.length > 1000) return { fieldErrors: { note: t("v.tooLong", { max: 1000 }) } };

  await db.$transaction([
    db.issue.update({
      where: { id },
      data: { status: to, resolvedAt: to === "RESOLVED" ? new Date() : to === "ARCHIVED" ? issue.resolvedAt : null },
    }),
    db.issueUpdate.create({ data: { issueId: id, fromStatus: issue.status, toStatus: to, note: note || null, userId: ctx.user.id } }),
    db.auditLog.create({
      data: {
        userId: ctx.user.id,
        action: "issue.status",
        entityType: "Project",
        entityId: issue.projectId,
        details: JSON.stringify({ issueId: id, from: issue.status, to }),
      },
    }),
  ]);

  refresh();
  return { ok: true, message: t("issueMarked", { status: (await getLabels()).issueStatus[to].toLocaleLowerCase() }) };
}
