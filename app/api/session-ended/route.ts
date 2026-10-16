import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Where pages send a browser whose session cookie the database no longer
 * accepts (account deactivated, or role / state changed). Clears the cookie so
 * Proxy stops treating the browser as signed in, then shows the login page.
 * A still-valid session is left alone, so a link here can't sign anyone out.
 */
export async function GET() {
  if (!(await getCurrentUser())) await signOut({ redirect: false });
  return new Response(null, { status: 303, headers: { Location: "/login?ended=1", "Cache-Control": "no-store" } });
}
