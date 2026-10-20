"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { passwordProblemCode } from "@/lib/password";
import { getTranslations } from "next-intl/server";

export type PasswordFormState = { message?: string; fieldErrors?: Record<string, string>; redirectTo?: string };

/** Any signed-in user changes their own password (required after an Admin sets one). */
export async function changeOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const t = await getTranslations("account");
  const errors: Record<string, string> = {};
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!current || !(await bcrypt.compare(current, row.passwordHash))) errors.current = t("errorCurrent");
  const problem = passwordProblemCode(next);
  if (problem) errors.next = t(`problem.${problem}`);
  else if (next === current) errors.next = t("errorSame");
  if (!errors.next && confirm !== next) errors.confirm = t("errorMismatch");
  if (Object.keys(errors).length) return { message: (await getTranslations("common"))("fixErrors"), fieldErrors: errors };

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
