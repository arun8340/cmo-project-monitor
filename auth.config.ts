import type { NextAuthConfig } from "next-auth";
import type { RoleKey } from "@/lib/constants";
import type { StateCode } from "@/config/states";

/**
 * Auth.js config shared by `auth.ts` and `proxy.ts`. It must not import the
 * database or bcrypt: Proxy runs on every request and only performs
 * optimistic, cookie-based checks. Real authorization lives in lib/auth/dal.ts.
 */

const PUBLIC_PATHS = ["/login"];
const ADMIN_ONLY_PATHS = ["/admin", "/select-state"];

export function homePathFor(role: RoleKey | undefined, stateCode: StateCode | null | undefined) {
  if (role === "ADMIN" || !stateCode) return "/select-state";
  return `/${stateCode.toLowerCase()}`;
}

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8-hour working session
  trustHost: true,
  providers: [], // added in auth.ts
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on sign-in; copy the fields Proxy needs.
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.stateCode = user.stateCode;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.stateCode = token.stateCode;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;
      const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

      if (!user?.id) return isPublic; // false → redirect to /login with callbackUrl

      const home = homePathFor(user.role, user.stateCode);
      if (isPublic || pathname === "/") return Response.redirect(new URL(home, request.nextUrl));

      const adminOnly = ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
      if (adminOnly && user.role !== "ADMIN") return Response.redirect(new URL(home, request.nextUrl));

      return true;
    },
  },
} satisfies NextAuthConfig;
