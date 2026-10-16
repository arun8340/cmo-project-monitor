"use client";

import { useActionState, useEffect } from "react";
import { CheckIcon, LoaderCircleIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateRolePermissions, type AdminFormState } from "@/app/actions/admin";
import { submitKeepingValues } from "@/lib/forms";

type Role = { key: string; name: string; users: number; permissions: string[] };
type Group = { group: string; items: { key: string; label: string; hint: string }[] };

/**
 * Permission table: one column per role. The Admin column is fixed, admin-only
 * permissions are fixed off for other roles, and "View projects" is always on.
 */
export function RolePermissionsForm({ roles, groups, adminOnly }: { roles: Role[]; groups: Group[]; adminOnly: string[] }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateRolePermissions, {});
  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Saved");
  }, [state]);

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 border-b bg-muted/40 text-xs">
            <tr>
              <th scope="col" className="w-[34%] px-4 py-3 text-left font-medium text-muted-foreground">
                Permission
              </th>
              {roles.map((r) => (
                <th key={r.key} scope="col" className="px-2 py-3 text-center font-medium">
                  <div>{r.name}</div>
                  <div className="font-normal text-muted-foreground">
                    {r.users} user{r.users === 1 ? "" : "s"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.group} className="divide-y border-b last:border-b-0">
              <tr className="bg-muted/20">
                <th colSpan={roles.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {g.group}
                </th>
              </tr>
              {g.items.map((p) => (
                <tr key={p.key} className="hover:bg-muted/20">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.hint}</div>
                  </th>
                  {roles.map((r) => {
                    const fixedOn = r.key === "ADMIN" || p.key === "projects.view";
                    const fixedOff = !fixedOn && adminOnly.includes(p.key);
                    const label = `${p.label} — ${r.name}`;
                    return (
                      <td key={r.key} className="px-2 py-2.5 text-center">
                        {fixedOn ? (
                          <span className="inline-flex items-center gap-0.5 text-muted-foreground" title="Always on">
                            <CheckIcon className="size-4" aria-label={`${label}: always on`} />
                            <LockIcon className="size-3" aria-hidden />
                          </span>
                        ) : fixedOff ? (
                          <span className="text-muted-foreground/60" title="Admin only" aria-label={`${label}: admin only`}>
                            —
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            name={`perm:${r.key}`}
                            value={p.key}
                            defaultChecked={r.permissions.includes(p.key)}
                            aria-label={label}
                            className="size-4 cursor-pointer accent-foreground"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {!state.ok && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="text-xs text-muted-foreground">Changes apply to everyone in the role on their next page load.</p>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          Save permissions
        </Button>
      </div>
    </form>
  );
}
