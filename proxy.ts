import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isDevPortalChooserHost, portalFromHeaders } from "./config/portals";
import { STATE_CODES } from "./config/states";

/**
 * Request routing per portal (see config/portals.ts). Cookie-only checks —
 * every page and server action still authorizes via lib/auth/dal.ts.
 *
 * - State portal (e.g. rj.localhost:3000): clean URLs, rewritten internally to
 *   /<state>/...; other states' paths and admin pages are "not found".
 * - Admin portal: state picker plus /rj, /mh, ...
 * - Unknown host: not found (in development, plain localhost lists the portals).
 */
const { auth } = NextAuth(authConfig);

// Deep enough that no route (including /[state]/...) matches → app/not-found.tsx with a 404.
const NOT_FOUND = "/__not-found/__/__/__";
const STATE_PREFIXES = STATE_CODES.map((c) => `/${c.toLowerCase()}`);
const ADMIN_ONLY = ["/select-state", "/admin"];
const hasPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host");
  const portal = portalFromHeaders(req.headers);
  const rewriteTo = (path: string) => NextResponse.rewrite(new URL(path + search, req.url));

  if (!portal) {
    if (isDevPortalChooserHost(host) && pathname === "/") return rewriteTo("/portals");
    return rewriteTo(NOT_FOUND);
  }
  // Redirects always target the portal's public address.
  const portalUrl = (path: string) => new URL(path, `${req.nextUrl.protocol}//${portal.host}`);
  const redirectTo = (path: string) => NextResponse.redirect(portalUrl(path));
  if (hasPrefix(pathname, "/portals")) return rewriteTo(NOT_FOUND);

  // A session is only valid on the portal that issued it.
  const user = req.auth?.user;
  const signedIn = !!user?.id && user.portal === portal.id;
  const home = portal.kind === "admin" ? "/select-state" : "/";

  if (pathname === "/login") return signedIn ? redirectTo(home) : NextResponse.next();
  if (!signedIn) {
    const login = portalUrl("/login");
    if (pathname !== "/") login.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(login);
  }

  // Same page on every portal (also where users are sent when a new password is required).
  if (pathname === "/change-password") return NextResponse.next();

  if (portal.kind === "admin") {
    return pathname === "/" ? redirectTo(home) : NextResponse.next();
  }

  // State portal: never expose internal state prefixes or admin pages.
  if ([...STATE_PREFIXES, ...ADMIN_ONLY].some((p) => hasPrefix(pathname, p))) return rewriteTo(NOT_FOUND);
  const internal = `/${portal.stateCode.toLowerCase()}${pathname === "/" ? "" : pathname}`;
  return rewriteTo(internal);
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads/|geo/|.*\\.(?:png|jpg|jpeg|svg|webp|geojson)$).*)"],
};
