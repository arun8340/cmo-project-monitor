"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { getCurrentPortal } from "@/lib/portal";

export type LoginState = { error?: string; email?: string };

/**
 * Post-login destination: the requested page (path only, so the redirect can
 * never leave this portal), or the portal's home page.
 */
function safeCallbackUrl(value: FormDataEntryValue | null, home: string) {
  try {
    const { pathname, search } = new URL(typeof value === "string" ? value : "/", "http://localhost");
    return pathname === "/" || pathname.startsWith("/login") ? home : pathname + search;
  } catch {
    return home;
  }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };

  try {
    // Auth.js would redirect to an absolute URL built from the forwarded host,
    // which can differ from the portal address — redirect ourselves instead.
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: error.type === "CredentialsSignin" ? "Invalid email or password." : "Sign-in failed. Please try again.",
        email,
      };
    }
    throw error;
  }
  // Relative, so the browser stays on the current portal.
  const portal = await getCurrentPortal();
  redirect(safeCallbackUrl(formData.get("callbackUrl"), portal?.kind === "admin" ? "/select-state" : "/"));
}
