"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createUser, updateUser, type AdminFormState } from "@/app/actions/admin";
import { submitKeepingValues } from "@/lib/forms";
import { PASSWORD_RULES } from "@/lib/password";
import { TemporaryPasswordInput } from "./temporary-password-input";

export type ScopeOption = { code: string; name: string; districts: { id: string; name: string }[]; departments: { id: string; name: string }[] };
export type RoleOption = { key: string; name: string; description: string };
export type UserFormValues = { name: string; email: string; designation: string; role: string; state: string; district: string; department: string };

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

/** What each role's scope needs. */
const NEEDS = {
  ADMIN: { state: false, district: false, department: false },
  CMO: { state: true, district: false, department: false },
  DEPARTMENT_HEAD: { state: true, district: false, department: true },
  DISTRICT_COLLECTOR: { state: true, district: true, department: false },
  FIELD_OFFICER: { state: true, district: true, department: false },
} as Record<string, { state: boolean; district: boolean; department: boolean }>;

type Props = {
  mode: "create" | "edit";
  userId?: string;
  initial: UserFormValues;
  roles: RoleOption[];
  scopes: ScopeOption[];
  /** Editing your own account: the role can't be changed away from Admin. */
  isSelf?: boolean;
};

export function UserForm({ mode, userId, initial, roles, scopes, isSelf }: Props) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(mode === "create" ? createUser : updateUser, {});
  const v = { ...initial, ...state.values };
  const err = state.fieldErrors ?? {};
  const [role, setRole] = useState(v.role);
  const [stateCode, setStateCode] = useState(v.state);
  const needs = NEEDS[role] ?? NEEDS.CMO;
  const scope = scopes.find((s) => s.code === stateCode);
  const scopeChanged = mode === "edit" && (role !== initial.role || stateCode !== initial.state);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Saved");
  }, [state]);

  const invalid = (name: string) => ({ "aria-invalid": !!err[name] || undefined });
  const fieldProps = (name: string) => ({ "data-invalid": !!err[name] || undefined });

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-6" noValidate>
      {userId && <input type="hidden" name="id" value={userId} />}
      {state.message && !state.ok && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <FieldSet>
        <FieldLegend>Person</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field {...fieldProps("name")}>
            <FieldLabel htmlFor="u-name">Full name</FieldLabel>
            <Input id="u-name" name="name" defaultValue={v.name} autoComplete="off" required {...invalid("name")} />
            {err.name && <FieldError>{err.name}</FieldError>}
          </Field>
          <Field {...fieldProps("email")}>
            <FieldLabel htmlFor="u-email">Email (used to sign in)</FieldLabel>
            <Input id="u-email" name="email" type="email" defaultValue={v.email} autoComplete="off" required {...invalid("email")} />
            {err.email && <FieldError>{err.email}</FieldError>}
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="u-designation">Designation (optional)</FieldLabel>
            <Input id="u-designation" name="designation" defaultValue={v.designation} placeholder="e.g. Collector & District Magistrate, Jaipur" autoComplete="off" />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Role</FieldLegend>
        <FieldDescription>The role decides what the person can do; the scope below decides which data they see.</FieldDescription>
        <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => {
            const disabled = isSelf && r.key !== "ADMIN";
            return (
              <label
                key={r.key}
                className={`flex cursor-pointer gap-3 rounded-lg border bg-background p-3 text-sm has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted/50"}`}
              >
                <input type="radio" name="role" value={r.key} checked={role === r.key} onChange={() => setRole(r.key)} disabled={disabled} className="mt-0.5 accent-foreground" />
                <span className="grid gap-0.5">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {err.role && <FieldError>{err.role}</FieldError>}
      </FieldSet>

      {role !== "ADMIN" && (
        <FieldSet>
          <FieldLegend>Scope</FieldLegend>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field {...fieldProps("state")}>
              <FieldLabel htmlFor="u-state">State</FieldLabel>
              <select id="u-state" name="state" value={stateCode} onChange={(e) => setStateCode(e.target.value)} className={selectClass} {...invalid("state")}>
                <option value="">Choose…</option>
                {scopes.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              {err.state && <FieldError>{err.state}</FieldError>}
            </Field>
            {needs.district && (
              <Field {...fieldProps("district")}>
                <FieldLabel htmlFor="u-district">District</FieldLabel>
                {/* keyed by state so the choice resets when the state changes */}
                <select key={stateCode} id="u-district" name="district" defaultValue={stateCode === v.state ? v.district : ""} className={selectClass} disabled={!scope} {...invalid("district")}>
                  <option value="">{scope ? "Choose…" : "Choose the state first"}</option>
                  {scope?.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {err.district && <FieldError>{err.district}</FieldError>}
              </Field>
            )}
            {needs.department && (
              <Field {...fieldProps("department")}>
                <FieldLabel htmlFor="u-department">Department</FieldLabel>
                <select key={stateCode} id="u-department" name="department" defaultValue={stateCode === v.state ? v.department : ""} className={selectClass} disabled={!scope} {...invalid("department")}>
                  <option value="">{scope ? "Choose…" : "Choose the state first"}</option>
                  {scope?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {err.department && <FieldError>{err.department}</FieldError>}
              </Field>
            )}
          </FieldGroup>
          {scopeChanged && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Changing the role or state signs this person out; they then sign in on the portal for their new state. Field-officer project assignments are cleared when the district changes.
            </p>
          )}
        </FieldSet>
      )}
      {role === "ADMIN" && <p className="text-sm text-muted-foreground">Admins work across every state from the admin portal and have every permission.</p>}

      {mode === "create" && (
        <FieldSet>
          <FieldLegend>Temporary password</FieldLegend>
          <Field {...fieldProps("password")}>
            <FieldLabel htmlFor="u-password">Password for first sign-in</FieldLabel>
            <TemporaryPasswordInput id="u-password" invalid={!!err.password} />
            <FieldDescription>{PASSWORD_RULES} Share it with the person securely — they must choose their own password when they first sign in.</FieldDescription>
            {err.password && <FieldError>{err.password}</FieldError>}
          </Field>
        </FieldSet>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {mode === "create" && (
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/users" />}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          {mode === "create" ? "Create user" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
