"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { LoaderCircleIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { assignProjects, resetUserPassword, setUserActive, type AdminFormState } from "@/app/actions/admin";
import { submitKeepingValues } from "@/lib/forms";
import { PASSWORD_RULES } from "@/lib/password";
import { TemporaryPasswordInput } from "./temporary-password-input";

/** Shows the action's result as a toast (success) or inline (error). */
function useResult(state: AdminFormState) {
  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Saved");
  }, [state]);
  return !state.ok && state.message ? (
    <p role="alert" className="text-sm text-destructive">
      {state.message}
    </p>
  ) : null;
}

export function ResetPasswordForm({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(resetUserPassword, {});
  // Remount the input after a successful reset so the password doesn't linger on screen.
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) setRound((r) => r + 1);
  }
  const error = useResult(state);
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-2" noValidate>
      <input type="hidden" name="id" value={userId} />
      <label htmlFor="reset-password" className="text-sm font-medium">
        {isSelf ? "New password" : "New temporary password"}
      </label>
      <TemporaryPasswordInput key={round} id="reset-password" invalid={!!state.fieldErrors?.password} />
      {state.fieldErrors?.password && <FieldError>{state.fieldErrors.password}</FieldError>}
      <FieldDescription>
        {PASSWORD_RULES}
        {!isSelf && " The person must choose their own password at their next sign-in."}
      </FieldDescription>
      {error}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending && <LoaderCircleIcon className="animate-spin" />}
        {isSelf ? "Change password" : "Set temporary password"}
      </Button>
    </form>
  );
}

export function ActiveToggle({ userId, active, disabledReason }: { userId: string; active: boolean; disabledReason: string | null }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(setUserActive, {});
  const [confirming, setConfirming] = useState(false);
  const error = useResult(state);
  return (
    <form
      onSubmit={(e) => {
        if (active && !confirming) {
          e.preventDefault();
          setConfirming(true);
          return;
        }
        setConfirming(false);
        submitKeepingValues(action)(e);
      }}
      className="grid gap-2"
    >
      <input type="hidden" name="id" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <p className="text-sm text-muted-foreground">
        {active
          ? "Deactivating signs the person out straight away and blocks them from signing in. Their projects, uploads and history stay."
          : "This account is deactivated. Reactivate it to let the person sign in again."}
      </p>
      {disabledReason ? (
        <p className="text-sm text-muted-foreground italic">{disabledReason}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant={active ? "destructive" : "default"} disabled={pending} className="w-fit">
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {active ? (confirming ? "Yes, deactivate" : "Deactivate account") : "Reactivate account"}
          </Button>
          {confirming && (
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          )}
        </div>
      )}
      {error}
    </form>
  );
}

type ProjectOption = { id: string; name: string; department: string };

/** Checklist of the district's projects for a field officer. */
export function AssignProjectsForm({ userId, projects, assigned }: { userId: string; projects: ProjectOption[]; assigned: string[] }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(assignProjects, {});
  const [selected, setSelected] = useState(() => new Set(assigned));
  const [q, setQ] = useState("");
  const error = useResult(state);
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? projects.filter((p) => p.name.toLowerCase().includes(t) || p.department.toLowerCase().includes(t)) : projects;
  }, [projects, q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-3">
      <input type="hidden" name="id" value={userId} />
      {/* Hidden inputs carry the selection, including projects filtered out of view. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="projects" value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter projects…"
            aria-label="Filter projects"
            className="h-8 w-full rounded-lg border bg-background pr-3 pl-8 text-sm"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {selected.size} of {projects.length} selected
        </span>
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
        {visible.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-muted/50">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="mt-0.5 accent-foreground" />
              <span className="grid">
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.department}</span>
              </span>
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No projects match</li>}
      </ul>
      {error}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending && <LoaderCircleIcon className="animate-spin" />}
        Save assignments
      </Button>
    </form>
  );
}
