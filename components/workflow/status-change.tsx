"use client";

import { useActionState, useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { changeIssueStatus, type IssueFormState } from "@/app/actions/issues";
import { changeDirectiveStatus, type DirectiveFormState } from "@/app/actions/directives";
import { changeRequestStatus, type RequestFormState } from "@/app/actions/requests";
import { submitKeepingValues } from "@/lib/forms";

type Transition = { to: string; label: string; noteRequired: boolean };

type Props = {
  kind: "issue" | "directive" | "request";
  id: string;
  stateSlug: string;
  transitions: Transition[];
};

/**
 * Buttons for the status changes this user may make; choosing one asks for a
 * note (required where the workflow says so) before saving.
 */
export function StatusChange({ kind, id, stateSlug, transitions }: Props) {
  const action = kind === "issue" ? changeIssueStatus : kind === "request" ? changeRequestStatus : changeDirectiveStatus;
  const [state, formAction, pending] = useActionState<IssueFormState | DirectiveFormState | RequestFormState, FormData>(action, {});
  // The chosen change, and the action result that was current when it was chosen:
  // once a newer successful result arrives, the note box closes by itself.
  const [pick, setPick] = useState<{ t: Transition; base: typeof state } | null>(null);
  const chosen = pick && !(state.ok && state !== pick.base) ? pick.t : null;
  const tw = useTranslations("workflow");
  const tc = useTranslations("common");
  const label = (tr: Transition) => (tw as unknown as (k: string) => string)(`action.${tr.label}`);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? tw("updated"));
  }, [state, tw]);

  if (transitions.length === 0) return null;

  if (!chosen) {
    return (
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button key={t.to} type="button" variant={t.to === "RESOLVED" || t.to === "COMPLIED" || t.to === "CLOSED" || t.to === "APPROVED" ? "default" : "outline"} size="sm" onClick={() => setPick({ t, base: state })}>
            {label(t)}
          </Button>
        ))}
      </div>
    );
  }

  const err = state.fieldErrors?.note;
  return (
    <form onSubmit={submitKeepingValues(formAction)} className="grid gap-2 rounded-lg border bg-muted/30 p-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={stateSlug} />
      <input type="hidden" name="to" value={chosen.to} />
      <label htmlFor={`note-${id}`} className="text-sm font-medium">
        {chosen.noteRequired ? tw("noteRequired", { action: label(chosen) }) : tw("noteOptional", { action: label(chosen) })}
      </label>
      <Textarea
        id={`note-${id}`}
        name="note"
        maxLength={1000}
        autoFocus
        aria-invalid={!!err || undefined}
        placeholder={chosen.to === "COMPLIED" ? tw("placeholderComplied") : chosen.to === "RESOLVED" ? tw("placeholderResolved") : tw("placeholder")}
      />
      {err && <FieldError>{err}</FieldError>}
      {state.message && !state.ok && !err && <p className="text-sm text-destructive">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          {tc("save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPick(null)} disabled={pending}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
