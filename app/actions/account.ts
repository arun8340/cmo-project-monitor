"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { passwordProblem } from "@/lib/password";

export type PasswordFormState = { message?: string; fieldErrors?: Record<string, string>; redirectTo?: string };

/** Any signed-in user changes their own password (required after an Admin sets one). */
export async function changeOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors: Record<string, string> = {};
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!current || !(await bcrypt.compare(current, row.passwordHash))) errors.current = "That isn't your current password";
  const problem = passwordProblem(next);
  if (problem) errors.next = problem;
  else if (next === current) errors.next = "Choose a password different from the current one";
  if (!errors.next && confirm !== next) errors.confirm = "The two passwords don't match";
  if (Object.keys(errors).length) return { message: "Please correct the highlighted fields.", fieldErrors: errors };

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false, passwordChangedAt: new Date() },
    }),
    db.auditLog.create({
      data: { userId: user.id, action: "auth.password_change", entityType: "User", entityId: user.id, details: JSON.stringify({ forced: user.mustChangePassword }) },
    }),
  ]);

  // Not redirect(): it would render the next page in this same request, where the
  // per-request user (loaded above) still says a password change is required.
  return { redirectTo: user.portal.kind === "admin" ? "/select-state?password=changed" : "/?password=changed" };
}
