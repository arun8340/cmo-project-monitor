"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { OnceToast } from "@/components/workflow/once-toast";

/** "Password changed" confirmation after the change-password redirect (?password=changed). */
export function PasswordChangedToast() {
  const t = useTranslations("account");
  return useSearchParams().get("password") === "changed" ? <OnceToast message={t("changed")} /> : null;
}
