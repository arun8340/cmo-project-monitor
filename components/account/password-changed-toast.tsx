"use client";

import { useSearchParams } from "next/navigation";
import { OnceToast } from "@/components/workflow/once-toast";

/** "Password changed" confirmation after the change-password redirect (?password=changed). */
export function PasswordChangedToast() {
  return useSearchParams().get("password") === "changed" ? <OnceToast message="Password changed" /> : null;
}
