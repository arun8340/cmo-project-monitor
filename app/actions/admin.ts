"use server";

/**
 * Admin-only actions: users and roles. Every action re-checks that the caller
 * is the Admin (with users.manage) on the admin portal, and records an audit entry.
 */
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { ADMIN_ONLY_PERMISSIONS, PERMISSIONS, ROLE_KEYS, type Permission, type RoleKey } from "@/lib/constants";
import { passwordProblem } from "@/lib/password";

export type AdminFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

const NO_ACCESS = "You don't have permission to do this.";

async function requireAdminActor() {
  const user = await getCurrentUser();
  if (!user || user.portal.kind !== "admin" || user.roleKey !== "ADMIN" || !user.permissions.includes("users.manage")) return null;
  return user;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the user fields and resolves the role's required scope. */
async function readUserForm(formData: FormData, { isNew, userId }: { isNew: boolean; userId?: string }) {
  const values = Object.fromEntries([...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$") && k !== "password")) as Record<string, string>;
  const name = (values.name ?? "").trim();
  const email = (values.email ?? "").trim().toLowerCase();
  const designation = (values.designation ?? "").trim();
  const roleKey = (values.role ?? "") as RoleKey;
  const stateCode = (values.state ?? "").toUpperCase();
  const districtId = values.district ?? "";
  const departmentId = values.department ?? "";
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string> = {};
  if (name.length < 3) errors.name = "Enter the full name";
  if (!EMAIL.test(email)) errors.email = "Enter a valid email address";
  else {
    const clash = await db.user.findUnique({ where: { email } });
    if (clash && clash.id !== userId) errors.email = "Another user already has this email";
  }
  if (!ROLE_KEYS.includes(roleKey)) errors.role = "Choose a role";
  if (isNew) {
    const p = passwordProblem(password);
    if (p) errors.password = p;
  }

  // Scope required by the role.
  let stateId: string | null = null;
  let district: string | null = null;
  let department: string | null = null;
  if (roleKey && roleKey !== "ADMIN") {
    const state = stateCode ? await db.state.findUnique({ where: { code: stateCode } }) : null;
    if (!state) errors.state = "Choose the state";
    else {
      stateId = state.id;
      if (roleKey === "DISTRICT_COLLECTOR" || roleKey === "FIELD_OFFICER") {
        const d = districtId ? await db.district.findFirst({ where: { id: districtId, stateId: state.id } }) : null;
        if (!d) errors.district = "Choose the district";
        else district = d.id;
      }
      if (roleKey === "DEPARTMENT_HEAD") {
        const d = departmentId ? await db.department.findFirst({ where: { id: departmentId, stateId: state.id } }) : null;
        if (!d) errors.department = "Choose the department";
        else department = d.id;
      }
    }
  }

  return { values, errors, password, data: { name, email, designation: designation || null, roleKey, stateId, districtId: district, departmentId: department } };
}

export async function createUser(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminActor();
  if (!admin) return { message: NO_ACCESS };
  const { values, errors, password, data } = await readUserForm(formData, { isNew: true });
  if (Object.keys(errors).length) return { message: "Please correct the highlighted fields.", fieldErrors: errors, values };

  const role = await db.role.findUniqueOrThrow({ where: { key: data.roleKey } });
  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      designation: data.designation,
      roleId: role.id,
      stateId: data.stateId,
      districtId: data.districtId,
      departmentId: data.departmentId,
      passwordHash: await bcrypt.hash(password, 10),
      mustChangePassword: true,
    },
  });
  await db.auditLog.create({
    data: { userId: admin.id, action: "user.create", entityType: "User", entityId: user.id, details: JSON.stringify({ email: data.email, role: data.roleKey }) },
  });
  redirect(`/admin/users/${user.id}?created=1`);
}

/** Active Admins other than `exceptId`. */
const otherActiveAdmins = (exceptId: string) => db.user.count({ where: { active: true, role: { key: "ADMIN" }, id: { not: exceptId } } });

export async function updateUser(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminActor();
  if (!admin) return { message: NO_ACCESS };
  const id = String(formData.get("id") ?? "");
  const before = await db.user.findUnique({ where: { id }, include: { role: true, state: true, district: true, department: true } });
  if (!before) return { message: "User not found." };

  const { values, errors, data } = await readUserForm(formData, { isNew: false, userId: id });
  if (before.role.key === "ADMIN" && data.roleKey !== "ADMIN") {
    if (id === admin.id) errors.role = "You can't remove your own Admin role";
    else if ((await otherActiveAdmins(id)) === 0) errors.role = "At least one active Admin must remain";
  }
  if (Object.keys(errors).length) return { message: "Please correct the highlighted fields.", fieldErrors: errors, values };

  const role = await db.role.findUniqueOrThrow({ where: { key: data.roleKey } });
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const cmp = (k: string, a: unknown, b: unknown) => a !== b && (changes[k] = { from: a ?? null, to: b ?? null });
  cmp("name", before.name, data.name);
  cmp("email", before.email, data.email);
  cmp("designation", before.designation, data.designation);
  cmp("role", before.role.key, data.roleKey);
  cmp("state", before.stateId, data.stateId);
  cmp("district", before.districtId, data.districtId);
  cmp("department", before.departmentId, data.departmentId);

  if (Object.keys(changes).length) {
    // Scope changed away from a district → drop field-officer assignments that no longer fit.
    const dropAssignments = before.districtId !== data.districtId || data.roleKey !== "FIELD_OFFICER";
    await db.$transaction([
      db.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          designation: data.designation,
          roleId: role.id,
          stateId: data.stateId,
          districtId: data.districtId,
          departmentId: data.departmentId,
          ...(dropAssignments ? { assignedProjects: { set: [] } } : {}),
        },
      }),
      db.auditLog.create({ data: { userId: admin.id, action: "user.update", entityType: "User", entityId: id, details: JSON.stringify({ changes }) } }),
    ]);
  }
  refresh();
  return { ok: true, message: Object.keys(changes).length ? "Changes saved" : "No changes" };
}

export async function setUserActive(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminActor();
  if (!admin) return { message: NO_ACCESS };
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  const user = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!user) return { message: "User not found." };
  if (!active && id === admin.id) return { message: "You can't deactivate your own account." };
  if (!active && user.role.key === "ADMIN" && (await otherActiveAdmins(id)) === 0) return { message: "At least one active Admin must remain." };

  await db.$transaction([
    db.user.update({ where: { id }, data: { active } }),
    db.auditLog.create({ data: { userId: admin.id, action: active ? "user.activate" : "user.deactivate", entityType: "User", entityId: id } }),
  ]);
  refresh();
  return { ok: true, message: active ? "User reactivated" : "User deactivated — signed out and blocked from logging in" };
}

export async function resetUserPassword(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminActor();
  if (!admin) return { message: NO_ACCESS };
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { fieldErrors: { password: problem } };
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { message: "User not found." };

  await db.$transaction([
    db.user.update({
      where: { id },
      // Admin resetting their own password needn't be forced to change it again.
      data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: id !== admin.id, passwordChangedAt: new Date() },
    }),
    db.auditLog.create({ data: { userId: admin.id, action: "user.password_reset", entityType: "User", entityId: id } }),
  ]);
  refresh();
  return { ok: true, message: id === admin.id ? "Password updated" : "Temporary password set — the user must choose a new one at next login" };
}

/** Field officer project assignments (projects must be in the officer's district). */
export async function assignProjects(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminActor();
  if (!admin) return { message: NO_ACCESS };
  const id = String(formData.get("id") ?? "");
  const ids = formData.getAll("projects").map(String);
  const user = await db.user.findUnique({ where: { id }, include: { role: true, assignedProjects: { select: { id: true } } } });
  if (!user || user.role.key !== "FIELD_OFFICER" || !user.districtId) return { message: "Only field officers with a district have project assignments." };
  const valid = await db.project.findMany({ where: { id: { in: ids }, districtId: user.districtId }, select: { id: true } });
  if (valid.length !== new Set(ids).size) return { message: "Some projects aren't in this officer's district." };

  const beforeIds = new Set(user.assignedProjects.map((p) => p.id));
  const afterIds = new Set(valid.map((p) => p.id));
  await db.$transaction([
    db.user.update({ where: { id }, data: { assignedProjects: { set: valid.map((p) => ({ id: p.id })) } } }),
    db.auditLog.create({
      data: {
        userId: admin.id,
        action: "user.projects",
        entityType: "User",
        entityId: id,
        details: JSON.stringify({ added: [...afterIds].filter((x) => !beforeIds.has(x)).length, removed: [...beforeIds].filter((x) => !afterIds.has(x)).length }),
      },
    }),
  ]);
  refresh();
  return { ok: true, message: `${afterIds.size} project${afterIds.size === 1 ? "" : "s"} assigned` };
}

/**
 * Saves the role permission table. The Admin role is fixed (always everything);
 * other roles can't be given admin-only permissions and always keep "View projects".
 * Form fields: `perm:<ROLE>` = permission, once per ticked box.
 */
export async function updateRolePermissions(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminActor();
  if (!admin) return { message: NO_ACCESS };
  const roles = await db.role.findMany({ where: { key: { in: ROLE_KEYS.filter((k) => k !== "ADMIN") } } });

  const changed: { id: string; key: string; name: string; next: Permission[]; added: Permission[]; removed: Permission[] }[] = [];
  for (const role of roles) {
    const requested = formData.getAll(`perm:${role.key}`).map(String) as Permission[];
    const next = PERMISSIONS.filter((p) => p === "projects.view" || (requested.includes(p) && !ADMIN_ONLY_PERMISSIONS.includes(p)));
    let before: Permission[] = [];
    try {
      before = JSON.parse(role.permissions);
    } catch {}
    const added = next.filter((p) => !before.includes(p));
    const removed = before.filter((p) => !next.includes(p));
    if (added.length || removed.length) changed.push({ id: role.id, key: role.key, name: role.name, next, added, removed });
  }
  if (!changed.length) return { ok: true, message: "No changes" };

  await db.$transaction(
    changed.flatMap((c) => [
      db.role.update({ where: { id: c.id }, data: { permissions: JSON.stringify(c.next) } }),
      db.auditLog.create({
        data: { userId: admin.id, action: "role.update", entityType: "Role", entityId: c.id, details: JSON.stringify({ role: c.key, added: c.added, removed: c.removed }) },
      }),
    ]),
  );
  refresh();
  return { ok: true, message: `Permissions updated for ${changed.map((c) => c.name).join(", ")}` };
}
