"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDownIcon, LoaderCircleIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DEMO_PASSWORD, SHOW_DEMO_ACCOUNTS, type DemoAccount } from "@/config/demo-accounts";
import { login, type LoginState } from "./actions";

/** `demoAccounts`: only the accounts for the current portal. */
export function LoginForm({ demoAccounts }: { demoAccounts: DemoAccount[] }) {
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState(state.email ?? "");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FieldGroup>
          <Field data-invalid={!!state.error || undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!state.error || undefined}
              required
            />
          </Field>
          <Field data-invalid={!!state.error || undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!state.error || undefined}
              required
            />
            {state.error && <FieldError>{state.error}</FieldError>}
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>

      {SHOW_DEMO_ACCOUNTS && demoAccounts.length > 0 && (
        <div className="rounded-lg border bg-muted/40">
          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
            aria-expanded={showDemo}
          >
            <span className="flex items-center gap-2">
              <UserRoundIcon className="size-4 text-muted-foreground" />
              Demo accounts
            </span>
            <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${showDemo ? "rotate-180" : ""}`} />
          </button>
          {showDemo && (
            <div className="border-t px-1.5 pb-1.5">
              <p className="px-1.5 py-2 text-xs text-muted-foreground">
                Click an account to fill the form. Password for all: <code className="font-mono">{DEMO_PASSWORD}</code>
              </p>
              <ul className="grid gap-0.5">
                {demoAccounts.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => fillDemo(a.email)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-background"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{a.role}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{a.scope}</span>
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
