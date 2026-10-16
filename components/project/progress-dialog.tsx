"use client";

import { useActionState, useEffect, useState } from "react";
import { LoaderCircleIcon, TrendingUpIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addProgressUpdate } from "@/app/actions/project";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";
import { BEHIND_THRESHOLD } from "@/lib/progress";
import type { FormState, ProgressFormValues } from "@/lib/validation/project";

type Props = {
  projectId: string;
  stateSlug: string;
  current: { progress: number; status: ProjectStatus };
  plannedToday: number | null;
  /** "YYYY-MM-DD" bounds for the date input */
  minDate: string | null;
  today: string;
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function ProgressDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFormKey((k) => k + 1); // fresh form each time it opens
      }}
    >
      <DialogTrigger render={<Button />}>
        <TrendingUpIcon />
        Update progress
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <ProgressForm key={formKey} {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProgressForm({ projectId, stateSlug, current, plannedToday, minDate, today, onDone }: Props & { onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState<ProgressFormValues>, FormData>(addProgressUpdate, {});
  const [progress, setProgress] = useState(String(state.values?.progressPercent ?? current.progress));
  const [status, setStatus] = useState<string>(state.values?.status ?? current.status);
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Progress updated");
      onDone();
    }
  }, [state, onDone]);

  const p = Number(progress);
  const valid = progress !== "" && Number.isFinite(p);
  const suggestion: { status: ProjectStatus; reason: string } | null = !valid
    ? null
    : p === 100 && status !== "COMPLETED"
      ? { status: "COMPLETED", reason: "Progress is 100%" }
      : plannedToday != null && plannedToday - p > BEHIND_THRESHOLD && status === "ONGOING"
        ? { status: "DELAYED", reason: `${plannedToday - p} points behind plan (${plannedToday}%)` }
        : null;
  const goingDown = valid && p < current.progress;

  return (
    <form action={action} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Update progress</DialogTitle>
        <DialogDescription>
          Currently {current.progress}% · {PROJECT_STATUS_LABELS[current.status]}
          {plannedToday != null && <> · planned {plannedToday}% by today</>}
        </DialogDescription>
      </DialogHeader>

      <input type="hidden" name="id" value={projectId} />
      <input type="hidden" name="state" value={stateSlug} />

      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!err.date || undefined}>
            <FieldLabel htmlFor="pu-date">Date</FieldLabel>
            <Input
              id="pu-date"
              name="date"
              type="date"
              defaultValue={state.values?.date ?? today}
              min={minDate ?? undefined}
              max={today}
              aria-invalid={!!err.date || undefined}
              required
            />
            {err.date && <FieldError>{err.date}</FieldError>}
          </Field>
          <Field data-invalid={!!err.progressPercent || undefined}>
            <FieldLabel htmlFor="pu-progress">Progress (%)</FieldLabel>
            <Input
              id="pu-progress"
              name="progressPercent"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              aria-invalid={!!err.progressPercent || undefined}
              required
            />
            {err.progressPercent && <FieldError>{err.progressPercent}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={!!err.status || undefined}>
          <FieldLabel htmlFor="pu-status">Status</FieldLabel>
          <select
            id="pu-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
            aria-invalid={!!err.status || undefined}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {suggestion && (
            <FieldDescription>
              {suggestion.reason} — consider{" "}
              <button type="button" className="font-medium text-foreground underline" onClick={() => setStatus(suggestion.status)}>
                {PROJECT_STATUS_LABELS[suggestion.status]}
              </button>
              .
            </FieldDescription>
          )}
          {err.status && <FieldError>{err.status}</FieldError>}
        </Field>

        <Field data-invalid={!!err.notes || undefined}>
          <FieldLabel htmlFor="pu-notes">Notes{goingDown && " (required)"}</FieldLabel>
          <Textarea
            id="pu-notes"
            name="notes"
            defaultValue={state.values?.notes ?? ""}
            placeholder={goingDown ? "Why is progress lower than before?" : "What was done since the last update?"}
            aria-invalid={!!err.notes || undefined}
            maxLength={1000}
          />
          {goingDown && !err.notes && (
            <FieldDescription>Progress is lower than the current {current.progress}% — explain the correction.</FieldDescription>
          )}
          {err.notes && <FieldError>{err.notes}</FieldError>}
        </Field>
      </FieldGroup>

      {state.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          Save update
        </Button>
      </DialogFooter>
    </form>
  );
}
