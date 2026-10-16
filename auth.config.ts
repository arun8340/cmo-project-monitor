import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js config shared by `auth.ts` and `proxy.ts`. It must not import the
 * database or bcrypt. Routing/redirect rules live in proxy.ts; real
 * authorization lives in lib/auth/dal.ts.
 */
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
        token.portal = user.portal;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.stateCode = token.stateCode;
      session.user.portal = token.portal;
      return session;
    },
  },
} satisfies NextAuthConfig;
