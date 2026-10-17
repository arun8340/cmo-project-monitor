import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";

/**
 * "/" has no content of its own. On a state portal Proxy rewrites it to that
 * state's map, and on the admin portal it redirects to the state picker; this
 * is only a fallback.
 */
export default function RootPage() {
  return (
    <Suspense>
      <RedirectHome />
    </Suspense>
  );
}

async function RedirectHome() {
  const user = await requireUser();
  if (user.portal.kind === "admin") redirect("/select-state");
  notFound();
  return null;
}
