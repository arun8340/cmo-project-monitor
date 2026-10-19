"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDownIcon, LoaderCircleIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DEMO_PASSWORD, SHOW_DEMO_ACCOUNTS, type DemoAccount } from "@/config/demo-accounts";
import { login, type LoginState } from "./actions";

/** `demoAccounts`: only the accounts for the current portal. */
export function LoginForm({ demoAccounts }: { demoAccounts: DemoAccount[] }) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "";
  const sessionEnded = params.get("ended") === "1";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState(state.email ?? "");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(true);
  const t = useTranslations("login");
  const th = useTranslations("header");
  const tr = useTranslations("enums.role");

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="flex flex-col gap-6">
      {sessionEnded && !state.error && (
        <p role="status" className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {t("sessionEnded")}
        </p>
      )}
      <form action={formAction} noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FieldGroup>
          <Field data-invalid={!!state.error || undefined}>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@gov.in"
              className="h-11 bg-card"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!state.error || undefined}
              required
            />
          </Field>
          <Field data-invalid={!!state.error || undefined}>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              className="h-11 bg-card"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!state.error || undefined}
              required
            />
            {state.error && <FieldError>{state.error}</FieldError>}
          </Field>
          <Button type="submit" size="lg" className="h-12 w-full text-[15px] font-semibold" disabled={pending}>
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? t("signingIn") : t("signIn")}
          </Button>
        </FieldGroup>
      </form>

      {SHOW_DEMO_ACCOUNTS && demoAccounts.length > 0 && (
        <div className="rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-navy"
            aria-expanded={showDemo}
          >
            <span className="flex items-center gap-2">
              <UserRoundIcon className="size-4 text-muted-foreground" />
              {t("demoAccounts")}
            </span>
            <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${showDemo ? "rotate-180" : ""}`} />
          </button>
          {showDemo && (
            <div className="border-t px-2 pb-2">
              <p className="px-1.5 py-2 text-xs text-muted-foreground">
                {t("demoHint")} <code className="font-mono">{DEMO_PASSWORD}</code>
              </p>
              <ul className="grid gap-0.5">
                {demoAccounts.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => fillDemo(a.email)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy">{tr(a.role)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{a.scope === "STATE" ? th("wholeState") : a.scope === "ALL" ? th("allStates") : a.scope}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
