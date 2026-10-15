import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { ROLE_KEYS, type RoleKey } from "@/lib/constants";
import type { StateCode } from "@/config/states";

class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials";
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
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) throw new InvalidLogin();

        const user = await db.user.findUnique({
          where: { email },
          include: { role: true, state: true },
        });

        const ok = !!user && user.active && (await bcrypt.compare(password, user.passwordHash));
        await db.auditLog.create({
          data: {
            userId: ok ? user.id : null,
            action: ok ? "auth.login" : "auth.login_failed",
            entityType: "User",
            entityId: user?.id ?? null,
            details: ok ? null : JSON.stringify({ email, reason: !user ? "unknown_user" : !user.active ? "inactive" : "bad_password" }),
          },
        });
        if (!ok || !ROLE_KEYS.includes(user.role.key as RoleKey)) throw new InvalidLogin();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.key as RoleKey,
          stateCode: (user.state?.code as StateCode | undefined) ?? null,
        };
      },
    }),
  ],
});
