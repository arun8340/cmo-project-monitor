"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircleIcon, SendIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRequest, type RequestFormState } from "@/app/actions/requests";
import { SOURCE_META } from "@/components/imagery/source-meta";
import { submitKeepingValues } from "@/lib/forms";
import {
  IMAGERY_SOURCES,
  ISSUE_PRIORITIES,
  type ImagerySource,
} from "@/lib/constants";
import { useLabels } from "@/lib/i18n/client";

type Props = {
  stateSlug: string;
  projects: { id: string; label: string }[];
  initialProject: string;
  isCmo: boolean;
  defaultNeededBy: string;
  today: string;
  cancelHref: string;
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

/** Ask DoIT for satellite / drone / field imagery of a project. */
export function RequestForm({
  stateSlug,
  projects,
  initialProject,
  isCmo,
  defaultNeededBy,
  today,
  cancelHref,
}: Props) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(
    createRequest,
    {},
  );
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const [type, setType] = useState<ImagerySource>(
    (v.type as ImagerySource) ?? "SATELLITE",
  );
  const t = useTranslations("requests");
  const tc = useTranslations("common");
  const labels = useLabels();

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-6">
      <input type="hidden" name="state" value={stateSlug} />
      <input type="hidden" name="type" value={type} />
      {state.message && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      )}
      <FieldGroup>
        <Field data-invalid={!!err.project || undefined}>
          <FieldLabel htmlFor="project">{t("fProject")}</FieldLabel>
          <select
            id="project"
            name="project"
            defaultValue={v.project ?? initialProject}
            className={selectClass}
            aria-invalid={!!err.project || undefined}
          >
            <option value="">{t("chooseProject")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {err.project && <FieldError>{err.project}</FieldError>}
        </Field>

        <FieldSet data-invalid={!!err.type || undefined}>
          <FieldLegend>{t("fType")}</FieldLegend>
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label={t("fType")}
          >
            {IMAGERY_SOURCES.map((s) => {
              const meta = SOURCE_META[s];
              const on = type === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setType(s)}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-3 text-sm transition ${on ? "border-navy bg-navy/5 font-semibold" : "hover:bg-muted"}`}
                >
                  <meta.icon className="size-5" style={{ color: meta.color }} />
                  {labels.source[s]}
                </button>
              );
            })}
          </div>
          <FieldDescription>{t(`typeHint.${type}`)}</FieldDescription>
        </FieldSet>

        <Field data-invalid={!!err.purpose || undefined}>
          <FieldLabel htmlFor="purpose">{t("fPurpose")}</FieldLabel>
          <Textarea
            id="purpose"
            name="purpose"
            rows={3}
            defaultValue={v.purpose}
            placeholder={t("fPurposePlaceholder")}
            aria-invalid={!!err.purpose || undefined}
          />
          {err.purpose && <FieldError>{err.purpose}</FieldError>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!err.neededBy || undefined}>
            <FieldLabel htmlFor="neededBy">{t("fNeededBy")}</FieldLabel>
            <Input
              id="neededBy"
              name="neededBy"
              type="date"
              min={today}
              defaultValue={v.neededBy ?? defaultNeededBy}
              aria-invalid={!!err.neededBy || undefined}
            />
            {err.neededBy && <FieldError>{err.neededBy}</FieldError>}
          </Field>
          <Field data-invalid={!!err.priority || undefined}>
            <FieldLabel htmlFor="priority">{t("fPriority")}</FieldLabel>
            {isCmo ? (
              <p className="flex h-9 items-center gap-1.5 rounded-lg border bg-bad-soft px-2 text-sm font-semibold text-bad">
                <StarIcon className="size-4" />
                {t("cmoPriority")}
              </p>
            ) : (
              <select
                id="priority"
                name="priority"
                defaultValue={v.priority ?? "MEDIUM"}
                className={selectClass}
              >
                {ISSUE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {labels.priority[p]}
                  </option>
                ))}
              </select>
            )}
            {err.priority && <FieldError>{err.priority}</FieldError>}
          </Field>
        </div>
      </FieldGroup>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={cancelHref} />}
        >
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <SendIcon />
          )}
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
