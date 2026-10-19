import type { Metadata } from "next";
import { Suspense } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-shell/app-header";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { requireUserForPasswordChange } from "@/lib/auth/dal";
import { STATES } from "@/config/states";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("changeTitle") };
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96" />}>
      <ChangePassword />
    </Suspense>
  );
}

async function ChangePassword() {
  const user = await requireUserForPasswordChange();
  const state = user.portal.kind === "state" ? STATES[user.portal.stateCode] : undefined;
  const home = user.portal.kind === "admin" ? "/select-state" : "/";
  const t = await getTranslations("account");
  return (
    <>
      <AppHeader state={state} homeHref={home} />
      <main className="flex flex-1 justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight text-navy [&>svg]:hidden">
            <KeyRoundIcon className="size-6 text-muted-foreground" />
            {user.mustChangePassword ? t("chooseTitle") : t("changeTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.mustChangePassword ? t("chooseIntro") : t("changeIntro")} {t("rules")}
          </p>
          <div className="mt-6 rounded-xl border bg-card p-5">
            <ChangePasswordForm cancelHref={user.mustChangePassword ? null : home} />
          </div>
        </div>
      </main>
    </>
  );
}
