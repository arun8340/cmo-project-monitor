"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changeOwnPassword, type PasswordFormState } from "@/app/actions/account";
import { submitKeepingValues } from "@/lib/forms";

export function ChangePasswordForm({ cancelHref }: { cancelHref: string | null }) {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(changeOwnPassword, {});
  const router = useRouter();
  useEffect(() => {
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state, router]);
  const err = state.fieldErrors ?? {};
  const field = (name: string, label: string, autoComplete: string) => (
    <Field data-invalid={!!err[name] || undefined}>
      <FieldLabel htmlFor={`pw-${name}`}>{label}</FieldLabel>
      <Input id={`pw-${name}`} name={name} type="password" autoComplete={autoComplete} aria-invalid={!!err[name] || undefined} required />
      {err[name] && <FieldError>{err[name]}</FieldError>}
    </Field>
  );
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-5" noValidate>
      <FieldGroup>
        {field("current", "Current password", "current-password")}
        {field("next", "New password", "new-password")}
        {field("confirm", "Confirm new password", "new-password")}
      </FieldGroup>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {cancelHref && (
          <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending || !!state.redirectTo}>
          {(pending || state.redirectTo) && <LoaderCircleIcon className="animate-spin" />}
          Save new password
        </Button>
      </div>
    </form>
  );
}
