"use server";

import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";

export async function signOutAction() {
  const user = await getCurrentUser();
  if (user) {
    await db.auditLog.create({
      data: { userId: user.id, action: "auth.logout", entityType: "User", entityId: user.id },
    });
  }
  await signOut({ redirectTo: "/login" });
}
