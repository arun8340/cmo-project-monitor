"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { findAccessibleProject, getCurrentUser } from "@/lib/auth/dal";
import { imageryRequestScope } from "@/lib/auth/scope";
import { canProcessRequests, canRequestImagery } from "@/lib/auth/project-permissions";
import { getStateConfig } from "@/config/states";
import { stateBasePath } from "@/config/portals";
import {
  IMAGERY_SOURCES,
  ISSUE_PRIORITIES,
  REQUEST_STATUSES,
  type ImagerySource,
  type IssuePriority,
  type RequestStatus,
} from "@/lib/constants";
import { getActionT, getLabels } from "@/lib/i18n/server";
import { parseDateInput, todayIST } from "@/lib/dates";
import { requestTransitions } from "@/lib/workflow";

export type RequestFormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

async function userAndState(formData: FormData) {
  const user = await getCurrentUser();
  const state = getStateConfig(
    String(formData.get("state") ?? "").toUpperCase(),
  );
  if (!user || !state) return null;
  if (user.portal.kind === "state" && user.portal.stateCode !== state.code)
    return null;
  return { user, state };
}

/** Anyone may ask DoIT for imagery of a project they can see; CMO requests are always Critical. */
export async function createRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx || !canRequestImagery(ctx.user)) return { message: t("noAccess") };
  const { user, state } = ctx;
  const values = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const projectId = values.project ?? "";
  const type = values.type as ImagerySource;
  const purpose = (values.purpose ?? "").trim();
  const neededStr = values.neededBy ?? "";
  const neededBy = parseDateInput(neededStr);
  const cmo = user.roleKey === "CMO";
  const priority = (cmo ? "CRITICAL" : values.priority) as IssuePriority;

  const errors: Record<string, string> = {};
  const access = projectId
    ? await findAccessibleProject(user, projectId)
    : null;
  if (!access || access.stateCode !== state.code)
    errors.project = t("v.projectInState");
  if (!IMAGERY_SOURCES.includes(type)) errors.type = t("v.chooseSource");
  if (purpose.length < 10) errors.purpose = t("v.requestPurpose");
  if (purpose.length > 1000) errors.purpose = t("v.tooLong", { max: 1000 });
  if (!neededBy) errors.neededBy = t("v.chooseDueDate");
  else if (neededStr < todayIST()) errors.neededBy = t("v.duePast");
  if (!ISSUE_PRIORITIES.includes(priority))
    errors.priority = t("v.choosePriority");
  if (Object.keys(errors).length)
    return { message: t("fixErrors"), fieldErrors: errors, values };

  const request = await db.$transaction(async (tx) => {
    const r = await tx.imageryRequest.create({
      data: {
        projectId,
        type,
        purpose,
        neededBy: neededBy!,
        priority,
        status: "SUBMITTED",
        requestedById: user.id,
        updates: {
          create: { fromStatus: null, toStatus: "SUBMITTED", userId: user.id },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "request.create",
        entityType: "Project",
        entityId: projectId,
        details: JSON.stringify({ requestId: r.id, type, priority }),
      },
    });
    return r;
  });

  redirect(
    `${stateBasePath(user.portal, state.code)}/requests/${request.id}?created=1`,
  );
}

/** DoIT review (approve / reject), the requester cancelling, or a note from either (to = current status). */
export async function changeRequestStatus(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx) return { message: t("noAccess") };
  const id = String(formData.get("id") ?? "");
  const r = await db.imageryRequest.findFirst({
    where: { AND: [{ id }, imageryRequestScope(ctx.user, ctx.state.code)] },
  });
  if (!r) return { message: t("noAccess") };

  const to = String(formData.get("to") ?? "") as RequestStatus;
  const note = String(formData.get("note") ?? "").trim();
  const transition = requestTransitions(
    ctx.user,
    r.status as RequestStatus,
    r.requestedById,
  ).find((x) => x.to === to);
  if (!REQUEST_STATUSES.includes(to) || !transition)
    return { message: t("transitionNotAllowed") };
  if (transition.noteRequired && note.length < 5)
    return {
      message: t("fixErrors"),
      fieldErrors: { note: t("v.explainNote") },
    };
  if (note.length > 1000)
    return { fieldErrors: { note: t("v.tooLong", { max: 1000 }) } };

  const isNote = to === r.status;
  await db.$transaction([
    ...(isNote
      ? []
      : [db.imageryRequest.update({ where: { id }, data: { status: to } })]),
    db.imageryRequestUpdate.create({
      data: {
        requestId: id,
        fromStatus: r.status,
        toStatus: to,
        note: note || null,
        userId: ctx.user.id,
      },
    }),
    db.auditLog.create({
      data: {
        userId: ctx.user.id,
        action: isNote ? "request.note" : "request.status",
        entityType: "Project",
        entityId: r.projectId,
        details: JSON.stringify({ requestId: id, from: r.status, to }),
      },
    }),
  ]);

  refresh();
  if (isNote) return { ok: true, message: t("requestNoteAdded") };
  return {
    ok: true,
    message: t("requestMarked", {
      status: (await getLabels()).requestStatus[to].toLocaleLowerCase(),
    }),
  };
}

/** DoIT: order approved imagery from a supplier (APPROVED → ORDERED). */
export async function placeOrder(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx || !canProcessRequests(ctx.user)) return { message: t("noAccess") };
  const { user, state } = ctx;
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const id = values.id ?? "";
  const r = await db.imageryRequest.findFirst({ where: { AND: [{ id }, imageryRequestScope(user, state.code)] } });
  if (!r) return { message: t("noAccess") };
  if (r.status !== "APPROVED") return { message: t("transitionNotAllowed") };

  const vendorId = values.vendor ?? "";
  const orderRef = (values.orderRef ?? "").trim();
  const expectedStr = values.expectedBy ?? "";
  const expectedBy = parseDateInput(expectedStr);
  const note = (values.note ?? "").trim();

  const errors: Record<string, string> = {};
  const vendor = vendorId
    ? await db.vendor.findFirst({ where: { id: vendorId, active: true, state: { code: state.code } } })
    : null;
  if (!vendor) errors.vendor = t("v.chooseVendor");
  if (orderRef.length > 80) errors.orderRef = t("v.tooLong", { max: 80 });
  if (!expectedBy) errors.expectedBy = t("v.chooseDueDate");
  else if (expectedStr < todayIST()) errors.expectedBy = t("v.duePast");
  if (note.length > 1000) errors.note = t("v.tooLong", { max: 1000 });
  if (Object.keys(errors).length) return { message: t("fixErrors"), fieldErrors: errors, values };

  const now = new Date();
  await db.$transaction([
    db.imageryRequest.update({
      where: { id },
      data: { status: "ORDERED", vendorId: vendor!.id, orderRef: orderRef || null, orderedAt: now, expectedBy: expectedBy! },
    }),
    db.imageryRequestUpdate.create({
      data: { requestId: id, fromStatus: "APPROVED", toStatus: "ORDERED", note: note || null, userId: user.id },
    }),
    db.auditLog.create({
      data: {
        userId: user.id,
        action: "request.order",
        entityType: "Project",
        entityId: r.projectId,
        details: JSON.stringify({ requestId: id, vendor: vendor!.name, orderRef: orderRef || null }),
      },
    }),
  ]);
  refresh();
  return { ok: true, message: t("orderPlaced", { vendor: vendor!.name }) };
}

/** DoIT / Admin: add or edit a supplier. */
export async function saveVendor(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx || !canProcessRequests(ctx.user)) return { message: t("noAccess") };
  const { user, state } = ctx;
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const id = values.id || null;
  const name = (values.name ?? "").trim();
  const type = values.type as ImagerySource;
  const turnaround = Number(values.turnaroundDays);
  const contact = (values.contact ?? "").trim();

  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) errors.name = t("v.vendorName");
  if (!IMAGERY_SOURCES.includes(type)) errors.type = t("v.chooseSource");
  if (!Number.isInteger(turnaround) || turnaround < 1 || turnaround > 90) errors.turnaroundDays = t("v.turnaround");
  if (contact.length > 200) errors.contact = t("v.tooLong", { max: 200 });
  if (Object.keys(errors).length) return { message: t("fixErrors"), fieldErrors: errors, values };

  const existing = id ? await db.vendor.findFirst({ where: { id, state: { code: state.code } } }) : null;
  if (id && !existing) return { message: t("noAccess") };
  const data = { name, type, turnaroundDays: turnaround, contact: contact || null };
  const stateRow = await db.state.findUniqueOrThrow({ where: { code: state.code } });
  const v = existing
    ? await db.vendor.update({ where: { id: existing.id }, data })
    : await db.vendor.create({ data: { ...data, stateId: stateRow.id } });
  await db.auditLog.create({
    data: { userId: user.id, action: existing ? "vendor.update" : "vendor.create", entityType: "Vendor", entityId: v.id, details: JSON.stringify({ name, type }) },
  });
  refresh();
  return { ok: true, message: t("vendorSaved", { name }) };
}

/** DoIT / Admin: stop or resume ordering from a supplier (past orders keep it). */
export async function toggleVendor(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const [ctx, t] = await Promise.all([userAndState(formData), getActionT()]);
  if (!ctx || !canProcessRequests(ctx.user)) return { message: t("noAccess") };
  const id = String(formData.get("id") ?? "");
  const v = await db.vendor.findFirst({ where: { id, state: { code: ctx.state.code } } });
  if (!v) return { message: t("noAccess") };
  await db.$transaction([
    db.vendor.update({ where: { id }, data: { active: !v.active } }),
    db.auditLog.create({
      data: { userId: ctx.user.id, action: v.active ? "vendor.deactivate" : "vendor.activate", entityType: "Vendor", entityId: id, details: JSON.stringify({ name: v.name }) },
    }),
  ]);
  refresh();
  return { ok: true };
}
