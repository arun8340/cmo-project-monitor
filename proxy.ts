import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Optimistic, cookie-only checks (see authConfig.callbacks.authorized).
// Every page and server action still authorizes via lib/auth/dal.ts.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads/|geo/|.*\\.(?:png|jpg|jpeg|svg|webp|geojson)$).*)"],
};
