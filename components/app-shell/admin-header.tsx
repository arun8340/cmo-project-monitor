import { Suspense } from "react";
import { connection } from "next/server";
import { AppHeader } from "./app-header";
import { NavLinks, StateNav, type NavItem } from "./state-nav";

const ITEMS: NavItem[] = [
  { key: "states", href: "/select-state", label: "States" },
  { key: "users", href: "/admin/users", label: "Users" },
  { key: "roles", href: "/admin/roles", label: "Roles" },
  { key: "audit", href: "/admin/audit", label: "Audit log" },
];

/** Header for the admin portal's own pages (state picker, users, roles, audit log). */
export function AdminHeader() {
  return (
    <AppHeader
      homeHref="/select-state"
      nav={
        // The highlight depends on the URL, which dynamic pages only know at request time.
        <Suspense fallback={<NavLinks items={ITEMS} pathname={null} />}>
          <RequestNav />
        </Suspense>
      }
    />
  );
}

/**
 * Rendered per request: in the static shell the tabs can't know the current
 * page, so without this the highlight never appears.
 */
async function RequestNav() {
  await connection();
  return <StateNav items={ITEMS} />;
}
