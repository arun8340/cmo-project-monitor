"use client";

import { useActionState, useEffect, useState } from "react";
import { submitKeepingValues } from "@/lib/forms";
import { ClipboardCheckIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { recordVerification, type VerificationState } from "@/app/actions/verification";
import { VERIFICATION_OUTCOME_LABELS, VERIFICATION_OUTCOMES, type VerificationOutcome } from "@/lib/constants";
import type { CompareImage, VerificationRow } from "@/lib/data/compare";
import { formatDate } from "@/lib/format";
import { OUTCOME_STYLE } from "./outcome-style";


type Props = {
  projectId: string;
  stateSlug: string;
  images: CompareImage[];
  previous: VerificationRow[];
};

export function VerificationDialog(props: Props) {
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
      <DialogTrigger render={<Button size="sm" className="bg-white text-slate-900 hover:bg-white/90" />}>
        <ClipboardCheckIcon />
        Record verification
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <VerificationForm key={key} {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function VerificationForm({ projectId, stateSlug, images, previous, onDone }: Props & { onDone: () => void }) {
  const [state, action, pending] = useActionState<VerificationState, FormData>(recordVerification, {});
  const [outcome, setOutcome] = useState<VerificationOutcome | "">("");
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Verification recorded");
      onDone();
    }
  }, [state, onDone]);

  const first = images[0];
  const last = images.at(-1)!;

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Record verification</DialogTitle>
        <DialogDescription>
          Comparing {images.length} images, {first.dayLabel} → {last.dayLabel}. Reported progress {first.reportedProgress}% → {last.reportedProgress}%.
        </DialogDescription>
      </DialogHeader>

      <input type="hidden" name="id" value={projectId} />
      <input type="hidden" name="state" value={stateSlug} />
      <input type="hidden" name="imageIds" value={images.map((i) => i.id).join(",")} />

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">What does the imagery show?</legend>
        {VERIFICATION_OUTCOMES.map((o) => {
          const { icon: Icon, className } = OUTCOME_STYLE[o];
          return (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                outcome === o ? "border-foreground bg-muted/60" : "hover:bg-muted/40"
              }`}
            >
              <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="size-4" />
              <Icon className={`size-4 ${className}`} />
              {VERIFICATION_OUTCOME_LABELS[o]}
            </label>
          );
        })}
        {err.outcome && <FieldError>{err.outcome}</FieldError>}
      </fieldset>

      <div className="grid gap-1.5">
        <label htmlFor="vf-notes" className="text-sm font-medium">
          Note{outcome === "DISCREPANCY" ? " (required)" : " (optional)"}
        </label>
        <Textarea
          id="vf-notes"
          name="notes"
          maxLength={1000}
          placeholder={outcome === "DISCREPANCY" ? "What doesn't match the reported progress?" : "What is visible on the ground?"}
          aria-invalid={!!err.notes || undefined}
        />
        {err.notes && <FieldError>{err.notes}</FieldError>}
      </div>

      {state.message && !state.ok && !Object.keys(err).length && <p className="text-sm text-destructive">{state.message}</p>}

      {previous.length > 0 && (
        <div className="grid gap-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">Previous verifications</div>
          <ul className="grid max-h-36 gap-2 overflow-y-auto text-xs">
            {previous.map((v) => {
              const { icon: Icon, className } = OUTCOME_STYLE[v.outcome];
              return (
                <li key={v.id} className="flex gap-2">
                  <Icon className={`mt-0.5 size-3.5 shrink-0 ${className}`} />
                  <span>
                    <span className="font-medium">{VERIFICATION_OUTCOME_LABELS[v.outcome]}</span> · {v.fromLabel} → {v.toLabel} · {v.byName},{" "}
                    {formatDate(v.at)}
                    {v.notes && <span className="block text-muted-foreground">{v.notes}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending || !outcome}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          Save verification
        </Button>
      </DialogFooter>
    </form>
  );
}
