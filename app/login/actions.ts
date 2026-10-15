"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; email?: string };

/**
 * Post-login destination. Auth.js passes an absolute callbackUrl; keep only its
 * path so the redirect can never leave this site.
 */
function safeCallbackUrl(value: FormDataEntryValue | null) {
  try {
    const { pathname, search } = new URL(typeof value === "string" ? value : "/", "http://localhost");
    return pathname.startsWith("/login") ? "/" : pathname + search;
  } catch {
    return "/";
  }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };

  try {
    // On success this throws a redirect, which must propagate.
    await signIn("credentials", { email, password, redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: error.type === "CredentialsSignin" ? "Invalid email or password." : "Sign-in failed. Please try again.",
        email,
      };
    }
    throw error;
  }
  return {};
}
