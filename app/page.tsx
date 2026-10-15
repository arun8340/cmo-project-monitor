import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homePathFor } from "@/auth.config";
import { requireUser } from "@/lib/auth/dal";

/**
 * "/" has no content of its own. Proxy normally redirects before this renders;
 * this is the fallback that sends users to their home (state or state picker).
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
  redirect(homePathFor(user.roleKey, user.stateCode));
  return null;
}
