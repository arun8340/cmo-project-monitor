import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { ROLE_KEYS, type RoleKey } from "@/lib/constants";
import type { StateCode } from "@/config/states";
import { portalFromHeaders, type Portal } from "@/config/portals";

class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials";
}

/** State portals accept only that state's users; the admin portal only admins. */
function belongsToPortal(portal: Portal, role: string, stateCode: string | undefined) {
  if (portal.kind === "admin") return role === "ADMIN";
  return role !== "ADMIN" && stateCode === portal.stateCode;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // A wrong password is expected (and audit-logged) — don't print a stack trace for it.
    error(error) {
      if (error.name === "CredentialsSignin" || error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) throw new InvalidLogin();

        const portal = portalFromHeaders(request.headers);
        const user = await db.user.findUnique({
          where: { email },
          include: { role: true, state: true },
        });

        const passwordOk = !!user && user.active && (await bcrypt.compare(password, user.passwordHash));
        const portalOk = !!user && !!portal && belongsToPortal(portal, user.role.key, user.state?.code);
        const ok = passwordOk && portalOk;

        const reason = !user ? "unknown_user" : !user.active ? "inactive" : !passwordOk ? "bad_password" : "wrong_portal";
        await db.auditLog.create({
          data: {
            userId: ok ? user.id : null,
            action: ok ? "auth.login" : "auth.login_failed",
            entityType: "User",
            entityId: user?.id ?? null,
            details: JSON.stringify(ok ? { portal: portal!.id } : { email, reason, portal: portal?.id ?? null }),
          },
        });
        // Same generic error for every failure, so a portal never reveals that
        // an account exists on another portal.
        if (!ok || !ROLE_KEYS.includes(user.role.key as RoleKey)) throw new InvalidLogin();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.key as RoleKey,
          stateCode: (user.state?.code as StateCode | undefined) ?? null,
          portal: portal!.id,
        };
      },
    }),
  ],
});
