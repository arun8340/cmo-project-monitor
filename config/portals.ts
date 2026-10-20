/**
 * Portals: each state has its own web address, plus a separate admin address.
 *
 *   PORTAL_HOST_RJ     Rajasthan portal    (default rj.localhost:3000)
 *   PORTAL_HOST_MH     Maharashtra portal  (default mh.localhost:3000)
 *   PORTAL_HOST_ADMIN  Admin portal        (default admin.localhost:3000)
 *
 * Values are host[:port] as typed in the browser, e.g. "rajasthan.cmo-monitor.in".
 * A state portal only ever serves that state; only the admin portal sees all states.
 */
import { STATE_CODES, type StateCode } from "./states";

export type PortalId = StateCode | "ADMIN";

export type Portal =
  | { id: StateCode; kind: "state"; host: string; stateCode: StateCode }
  | { id: "ADMIN"; kind: "admin"; host: string };

const DEFAULT_HOSTS: Record<PortalId, string> = {
  RJ: "rj.localhost:3000",
  MH: "mh.localhost:3000",
  ADMIN: "admin.localhost:3000",
};

const normalize = (host: string) => host.trim().toLowerCase().replace(/\.$/, "");

export function getPortals(): Portal[] {
  const states: Portal[] = STATE_CODES.map((code) => ({
    id: code,
    kind: "state",
    stateCode: code,
    host: normalize(process.env[`PORTAL_HOST_${code}`] || DEFAULT_HOSTS[code]),
  }));
  return [...states, { id: "ADMIN", kind: "admin", host: normalize(process.env.PORTAL_HOST_ADMIN || DEFAULT_HOSTS.ADMIN) }];
}

/** The portal served at `host` (the request's Host header), or null if none. */
export function resolvePortal(host: string | null | undefined): Portal | null {
  if (!host) return null;
  const h = normalize(host);
  return getPortals().find((p) => p.host === h) ?? null;
}

/**
 * The portal a request is for. Behind a reverse proxy the public address is in
 * X-Forwarded-Host; otherwise (and in `next dev`, which sets its own forwarded
 * host) it is the Host header. The first one that names a known portal wins.
 * Choosing a portal grants nothing by itself: sessions are bound to the portal
 * that issued them, and logins are checked against the portal's state.
 */
export function portalFromHeaders(headers: { get(name: string): string | null }): Portal | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0];
  return resolvePortal(forwarded) ?? resolvePortal(headers.get("host"));
}

/** Plain localhost during development shows a page linking to each portal. */
export function isDevPortalChooserHost(host: string | null | undefined) {
  if (process.env.NODE_ENV === "production" || !host) return false;
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalize(host));
}

/**
 * Path prefix for a state's pages on the current portal: "" on that state's own
 * portal (clean URLs like /district/jaipur), "/rj" on the admin portal.
 */
export function stateBasePath(portal: Portal | null, stateCode: StateCode) {
  return portal?.kind === "state" ? "" : `/${stateCode.toLowerCase()}`;
}
