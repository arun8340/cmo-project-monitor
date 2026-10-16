"use client";

import { useActionState, useEffect, useState } from "react";
import { CirclePlusIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { raiseIssue, type IssueFormState } from "@/app/actions/issues";
import { ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS } from "@/lib/constants";
import { submitKeepingValues } from "@/lib/forms";

type Props = { projectId: string; projectName: string; stateSlug: string; lastMeeting: string | null };

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RaiseIssueDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setKey((k) => k + 1);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CirclePlusIcon />
        Raise issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <RaiseIssueForm key={key} {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RaiseIssueForm({ projectId, projectName, stateSlug, lastMeeting, onDone }: Props & { onDone: () => void }) {
  const [state, action, pending] = useActionState<IssueFormState, FormData>(raiseIssue, {});
  const err = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Issue raised");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Raise issue</DialogTitle>
        <DialogDescription>{projectName}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="state" value={stateSlug} />
      <FieldGroup>
        <Field data-invalid={!!err.title || undefined}>
          <FieldLabel htmlFor="ri-title">Issue</FieldLabel>
          <Input id="ri-title" name="title" maxLength={200} placeholder="e.g. Utility shifting awaited from DISCOM" aria-invalid={!!err.title || undefined} />
          {err.title && <FieldError>{err.title}</FieldError>}
        </Field>
        <Field data-invalid={!!err.description || undefined}>
          <FieldLabel htmlFor="ri-desc">Details (optional)</FieldLabel>
          <Textarea id="ri-desc" name="description" maxLength={2000} />
          {err.description && <FieldError>{err.description}</FieldError>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!err.priority || undefined}>
            <FieldLabel htmlFor="ri-priority">Priority</FieldLabel>
            <select id="ri-priority" name="priority" defaultValue="MEDIUM" className={selectClass}>
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {ISSUE_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            {err.priority && <FieldError>{err.priority}</FieldError>}
          </Field>
          <Field data-invalid={!!err.meetingDate || undefined}>
            <FieldLabel htmlFor="ri-meeting">Review meeting (optional)</FieldLabel>
            <Input id="ri-meeting" name="meetingDate" type="date" defaultValue="" />
            {lastMeeting && <FieldDescription>Last meeting: {lastMeeting}</FieldDescription>}
            {err.meetingDate && <FieldError>{err.meetingDate}</FieldError>}
          </Field>
        </div>
      </FieldGroup>
      {state.message && !state.ok && !Object.keys(err).length && <p className="text-sm text-destructive">{state.message}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          Raise issue
        </Button>
      </DialogFooter>
    </form>
  );
}
