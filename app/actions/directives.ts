"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { departmentScope, directiveScope, districtScope, projectScope } from "@/lib/auth/scope";
import { canIssueDirective } from "@/lib/auth/project-permissions";
import { getStateConfig } from "@/config/states";
import { stateBasePath } from "@/config/portals";
import { DIRECTIVE_STATUSES, type DirectiveStatus } from "@/lib/constants";
import { getActionT, getLabels } from "@/lib/i18n/server";
import { geoCodeFromSlug } from "@/lib/district-slug";
import { parseDateInput, todayIST } from "@/lib/dates";
import { directiveTransitions } from "@/lib/workflow";

export type DirectiveFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };


async function userAndState(formData: FormData) {
  const user = await getCurrentUser();
  const state = getStateConfig(String(formData.get("state") ?? "").toUpperCase());
  if (!user || !state) return null;
  if (user.portal.kind === "state" && user.portal.stateCode !== state.code) return null;
  return { user, state };
}

/** CMO / Admin: issue a directive to a district, department and/or project, with an owner and due date. */
export async function issueDirective(_prev: DirectiveFormState, formData: FormData): Promise<DirectiveFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  const NO_ACCESS = t("noAccess");
  if (!ctx || !canIssueDirective(ctx.user)) return { message: NO_ACCESS };
  const { user, state } = ctx;
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

  const text = (values.text ?? "").trim();
  const districtSlugValue = (values.district ?? "").toLowerCase();
  const deptCode = (values.department ?? "").toUpperCase();
  const projectId = values.project ?? "";
  const ownerId = values.owner ?? "";
  const dueStr = values.dueDate ?? "";
  const dueDate = parseDateInput(dueStr);

  const errors: Record<string, string> = {};
  if (text.length < 10) errors.text = t("v.directiveText");
  if (text.length > 2000) errors.text = t("v.tooLong", { max: 2000 });
  if (!dueDate) errors.dueDate = t("v.chooseDueDate");
  else if (dueStr < todayIST()) errors.dueDate = t("v.duePast");
  if (!districtSlugValue && !deptCode && !projectId) errors.target = t("v.chooseTarget");
  if (!ownerId) errors.owner = t("v.chooseOwner");

  // Targets must be inside the issuer's scope.
  const [district, department, project] = await Promise.all([
    districtSlugValue
      ? db.district.findFirst({ where: { AND: [districtScope(user, state.code), { geoCode: geoCodeFromSlug(state.code, districtSlugValue) }] } })
      : null,
    deptCode ? db.department.findFirst({ where: { AND: [departmentScope(user, state.code), { code: deptCode }] } }) : null,
    projectId ? db.project.findFirst({ where: { AND: [projectScope(user, state.code), { id: projectId }] } }) : null,
  ]);
  if (districtSlugValue && !district) errors.target = t("v.districtInState");
  if (deptCode && !department) errors.target = t("v.departmentInState");
  if (projectId && !project) errors.target = t("v.projectInState");
  if (project && district && project.districtId !== district.id) errors.target = t("v.projectNotInDistrict");
  if (project && department && project.departmentId !== department.id) errors.target = t("v.projectNotInDepartment");

  // Owner: an active Collector of the target district, or Department Head of the target department.
  const targetDistrictId = district?.id ?? project?.districtId ?? null;
  const targetDeptId = department?.id ?? project?.departmentId ?? null;
  if (ownerId) {
    const owner = await db.user.findFirst({ where: { id: ownerId, active: true, state: { code: state.code } }, include: { role: true } });
    const fits =
      owner &&
      ((owner.role.key === "DISTRICT_COLLECTOR" && targetDistrictId && owner.districtId === targetDistrictId) ||
        (owner.role.key === "DEPARTMENT_HEAD" && targetDeptId && owner.departmentId === targetDeptId));
    if (!fits) errors.owner = t("v.ownerFits");
  }
  if (Object.keys(errors).length) return { message: t("fixErrors"), fieldErrors: errors, values };

  const directive = await db.$transaction(async (tx) => {
    const d = await tx.directive.create({
      data: {
        fromUserId: user.id,
        ownerId,
        districtId: district?.id ?? project?.districtId ?? null,
        departmentId: department?.id ?? null,
        projectId: project?.id ?? null,
        text,
        dueDate: dueDate!,
        status: "OPEN",
        updates: { create: { fromStatus: null, toStatus: "OPEN", userId: user.id } },
      },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "directive.issue", entityType: "Directive", entityId: d.id, details: JSON.stringify({ ownerId, projectId: project?.id ?? null }) },
    });
    return d;
  });

  redirect(`${stateBasePath(user.portal, state.code)}/directives/${directive.id}?issued=1`);
}

/** Respond to (in progress / complied) or close / reopen a directive, per lib/workflow. */
export async function changeDirectiveStatus(_prev: DirectiveFormState, formData: FormData): Promise<DirectiveFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  const NO_ACCESS = t("noAccess");
  if (!ctx) return { message: NO_ACCESS };
  const id = String(formData.get("id") ?? "");
  const d = await db.directive.findFirst({ where: { AND: [{ id }, directiveScope(ctx.user, ctx.state.code)] } });
  if (!d) return { message: NO_ACCESS };

  const to = String(formData.get("to") ?? "") as DirectiveStatus;
  const note = String(formData.get("note") ?? "").trim();
  const transition = directiveTransitions(ctx.user, d.status as DirectiveStatus, d.ownerId).find((t) => t.to === to);
  if (!DIRECTIVE_STATUSES.includes(to) || !transition) return { message: t("directiveTransitionNotAllowed") };
  if (transition.noteRequired && note.length < 5) {
    return { message: t("fixErrors"), fieldErrors: { note: to === "COMPLIED" ? t("v.describeAction") : t("v.explainNote") } };
  }
  if (note.length > 1000) return { fieldErrors: { note: t("v.tooLong", { max: 1000 }) } };

  await db.$transaction([
    db.directive.update({ where: { id }, data: { status: to } }),
    db.directiveUpdate.create({ data: { directiveId: id, fromStatus: d.status, toStatus: to, note: note || null, userId: ctx.user.id } }),
    db.auditLog.create({
      data: { userId: ctx.user.id, action: "directive.status", entityType: "Directive", entityId: id, details: JSON.stringify({ from: d.status, to }) },
    }),
  ]);

  refresh();
  return { ok: true, message: t("directiveMarked", { status: (await getLabels()).directiveStatus[to].toLocaleLowerCase() }) };
}
