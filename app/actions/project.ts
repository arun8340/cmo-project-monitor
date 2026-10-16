"use server";

/**
 * Project mutations. Each action re-checks, on the server: the signed-in user,
 * the portal, the user's permission, and that the district / department /
 * project is inside the user's scope. Never trust hidden form fields alone.
 */
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, findAccessibleProject, type CurrentUser } from "@/lib/auth/dal";
import { canAccessState, departmentScope, districtScope } from "@/lib/auth/scope";
import { canCreateProject, canEditProject, canUpdateProgress } from "@/lib/auth/project-permissions";
import { getStateConfig, type StateConfig } from "@/config/states";
import { stateBasePath } from "@/config/portals";
import { geoCodeFromSlug } from "@/lib/district-slug";
import { toDateInput, todayIST } from "@/lib/dates";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/constants";
import {
  createStatusSchema,
  fieldErrors,
  progressSchema,
  projectSchema,
  type FormState,
  type ProgressFormValues,
  type ProjectFormValues,
} from "@/lib/validation/project";

type ProjectFormState = FormState<ProjectFormValues & { status: string }>;
type ProgressFormState = FormState<ProgressFormValues>;

const NO_ACCESS = "You don't have permission to do this.";

/** Signed-in user + the state named by the form, if this portal serves it and the user may access it. */
async function userAndState(formData: FormData): Promise<{ user: CurrentUser; state: StateConfig } | null> {
  const user = await getCurrentUser();
  const state = getStateConfig(String(formData.get("state") ?? "").toUpperCase());
  if (!user || !state) return null;
  if (user.portal.kind === "state" && user.portal.stateCode !== state.code) return null;
  if (!canAccessState(user, state.code)) return null;
  return { user, state };
}

const formValues = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, v as string]),
  );

async function resolveDistrictAndDepartment(user: CurrentUser, state: StateConfig, districtSlug: string, deptCode: string) {
  const [district, department] = await Promise.all([
    db.district.findFirst({ where: { AND: [districtScope(user, state.code), { geoCode: geoCodeFromSlug(state.code, districtSlug) }] } }),
    db.department.findFirst({ where: { AND: [departmentScope(user, state.code), { code: deptCode.toUpperCase() }] } }),
  ]);
  return { district, department };
}

export async function createProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const values = formValues(formData);
  const ctx = await userAndState(formData);
  if (!ctx || !canCreateProject(ctx.user)) return { message: NO_ACCESS, values };
  const { user, state } = ctx;

  const parsed = projectSchema.safeParse(values);
  const status = createStatusSchema.safeParse(values.status);
  if (!parsed.success || !status.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: { ...(parsed.success ? {} : fieldErrors(parsed.error)), ...(status.success ? {} : { status: status.error.issues[0].message }) },
      values,
    };
  }
  const v = parsed.data;
  const { district, department } = await resolveDistrictAndDepartment(user, state, v.district, v.department);
  if (!district || !department) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: { ...(district ? {} : { district: "Choose a district you manage" }), ...(department ? {} : { department: "Choose a department you manage" }) },
      values,
    };
  }

  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: v.name,
        nameLocal: v.nameLocal,
        description: v.description,
        districtId: district.id,
        departmentId: department.id,
        latitude: v.latitude,
        longitude: v.longitude,
        budgetLakhs: v.budgetLakhs,
        startDate: v.startDate,
        plannedEndDate: v.plannedEndDate,
        status: status.data,
        progressPercent: 0,
        createdById: user.id,
      },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "project.create", entityType: "Project", entityId: created.id, details: JSON.stringify({ name: v.name }) },
    });
    return created;
  });

  redirect(`${stateBasePath(user.portal, state.code)}/project/${project.id}`);
}

const EDITABLE = ["name", "nameLocal", "description", "latitude", "longitude", "budgetLakhs", "startDate", "plannedEndDate"] as const;

export async function updateProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const values = formValues(formData);
  const ctx = await userAndState(formData);
  const projectId = String(formData.get("id") ?? "");
  const access = ctx ? await findAccessibleProject(ctx.user, projectId) : null;
  if (!ctx || !access || access.stateCode !== ctx.state.code || !canEditProject(ctx.user)) return { message: NO_ACCESS, values };
  const { user, state } = ctx;

  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
  const v = parsed.data;

  const { district, department } = await resolveDistrictAndDepartment(user, state, v.district, v.department);
  if (!district || !department) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: { ...(district ? {} : { district: "Choose a district you manage" }), ...(department ? {} : { department: "Choose a department you manage" }) },
      values,
    };
  }

  const before = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: { district: true, department: true } });
  const after = { ...v, districtId: district.id, departmentId: department.id };

  // Record exactly what changed.
  const fmt = (x: unknown) => (x instanceof Date ? toDateInput(x) : x ?? null);
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of EDITABLE) {
    if (fmt(before[key]) !== fmt(after[key])) changes[key] = { from: fmt(before[key]), to: fmt(after[key]) };
  }
  if (before.districtId !== district.id) changes.district = { from: before.district.name, to: district.name };
  if (before.departmentId !== department.id) changes.department = { from: before.department.name, to: department.name };

  if (Object.keys(changes).length > 0) {
    await db.$transaction([
      db.project.update({
        where: { id: projectId },
        data: {
          name: v.name,
          nameLocal: v.nameLocal,
          description: v.description,
          latitude: v.latitude,
          longitude: v.longitude,
          budgetLakhs: v.budgetLakhs,
          startDate: v.startDate,
          plannedEndDate: v.plannedEndDate,
          districtId: district.id,
          departmentId: department.id,
        },
      }),
      db.auditLog.create({
        data: { userId: user.id, action: "project.update", entityType: "Project", entityId: projectId, details: JSON.stringify({ changes }) },
      }),
    ]);
  }

  redirect(`${stateBasePath(user.portal, state.code)}/project/${projectId}`);
}

export async function addProgressUpdate(_prev: ProgressFormState, formData: FormData): Promise<ProgressFormState> {
  const values = formValues(formData);
  const ctx = await userAndState(formData);
  const projectId = String(formData.get("id") ?? "");
  const access = ctx ? await findAccessibleProject(ctx.user, projectId) : null;
  if (!ctx || !access || access.stateCode !== ctx.state.code || !canUpdateProgress(ctx.user)) return { message: NO_ACCESS, values };
  const { user } = ctx;

  const parsed = progressSchema.safeParse(values);
  if (!parsed.success) return { message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
  const v = parsed.data;

  const [project, last] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId } }),
    db.progressUpdate.findFirst({ where: { projectId }, orderBy: { date: "desc" } }),
  ]);

  const errors: Record<string, string> = {};
  const day = toDateInput(v.date);
  if (day > todayIST()) errors.date = "The date can't be in the future";
  else if (last && day < toDateInput(last.date)) errors.date = `The date can't be before the last update (${toDateInput(last.date)})`;
  if (v.status === "COMPLETED" && v.progressPercent !== 100) errors.status = "A completed project must be at 100%";
  if (v.status === "NOT_STARTED" && v.progressPercent !== 0) errors.status = "A project that hasn't started must be at 0%";
  if (v.progressPercent < project.progressPercent && (v.notes?.length ?? 0) < 5) {
    errors.notes = `Progress is going down from ${project.progressPercent}% — add a note explaining why`;
  }
  if (Object.keys(errors).length) return { message: "Please correct the highlighted fields.", fieldErrors: errors, values };

  await db.$transaction([
    db.progressUpdate.create({
      data: { projectId, date: v.date, progressPercent: v.progressPercent, notes: v.notes, updatedById: user.id },
    }),
    db.project.update({ where: { id: projectId }, data: { progressPercent: v.progressPercent, status: v.status } }),
    db.auditLog.create({
      data: {
        userId: user.id,
        action: "progress.update",
        entityType: "Project",
        entityId: projectId,
        details: JSON.stringify({
          from: { progress: project.progressPercent, status: project.status },
          to: { progress: v.progressPercent, status: v.status },
          date: day,
        }),
      },
    }),
  ]);

  refresh();
  return {
    ok: true,
    message: `Progress updated to ${v.progressPercent}% (${PROJECT_STATUS_LABELS[v.status as ProjectStatus]}).`,
  };
}
