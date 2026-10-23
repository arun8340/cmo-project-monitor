"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LoaderCircleIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
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
import { saveMeeting, type MeetingFormState } from "@/app/actions/meetings";
import { submitKeepingValues } from "@/lib/forms";
import type { AgendaOptions } from "@/lib/data/meetings";
import type { MeetingStatus } from "@/lib/constants";

type Kind = "" | "project" | "issue" | "directive";
type Row = {
  key: number;
  title: string;
  notes: string;
  kind: Kind;
  refId: string;
};
export type MeetingInitial = {
  id?: string;
  status?: MeetingStatus;
  title: string;
  date: string;
  time: string;
  venue: string;
  chairedBy: string;
  notes: string;
  items: { title: string; notes: string; kind: Kind; refId: string }[];
};

type Props = {
  stateSlug: string;
  options: AgendaOptions;
  initial: MeetingInitial;
  today: string;
  cancelHref: string;
};

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

let nextKey = 1;

export function MeetingForm({
  stateSlug,
  options,
  initial,
  today,
  cancelHref,
}: Props) {
  const [state, action, pending] = useActionState<MeetingFormState, FormData>(
    saveMeeting,
    {},
  );
  const err = state.fieldErrors ?? {};
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<Row[]>(() =>
    initial.items.map((i) => ({ ...i, key: nextKey++ })),
  );
  const published = initial.status === "PUBLISHED";

  const optionsFor = (kind: Kind) =>
    kind === "project"
      ? options.projects
      : kind === "issue"
        ? options.issues
        : kind === "directive"
          ? options.directives
          : [];
  const labelOf = (kind: Kind, id: string) =>
    optionsFor(kind).find((o) => o.id === id)?.label ?? "";
  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, by: number) =>
    setRows((rs) => {
      const next = [...rs];
      const [r] = next.splice(index, 1);
      next.splice(index + by, 0, r);
      return next;
    });
  const add = (kind: Kind = "", refId = "") =>
    setRows((rs) => [
      ...rs,
      {
        key: nextKey++,
        kind,
        refId,
        notes: "",
        title: refId ? suggestedTitle(kind, refId) : "",
      },
    ]);
  // The project is shown under each point, so titles don't repeat it.
  const suggestedTitle = (kind: Kind, refId: string) =>
    kind === "project"
      ? t("titleProject")
      : kind === "issue"
        ? t("titleIssue", {
            name: options.issues.find((i) => i.id === refId)?.title ?? "",
          })
        : kind === "directive"
          ? t("titleDirective", { name: labelOf(kind, refId) })
          : "";

  const used = new Set(rows.map((r) => r.refId).filter(Boolean));
  const suggestions = [
    ...options.projects
      .filter((p) => p.status === "DELAYED" || p.status === "STALLED")
      .map((p) => ({ kind: "project" as const, ...p })),
    ...options.issues
      .filter((i) => i.priority === "CRITICAL" || i.priority === "HIGH")
      .map((i) => ({ kind: "issue" as const, ...i })),
    ...options.directives
      .filter((d) => d.overdue)
      .map((d) => ({ kind: "directive" as const, ...d })),
  ].filter((s) => !used.has(s.id));

  const items = JSON.stringify(
    rows.map(({ title, notes, kind, refId }) => ({
      title,
      notes,
      kind,
      refId: kind ? refId : "",
    })),
  );

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-6">
      <input type="hidden" name="state" value={stateSlug} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={items} />
      {state.message && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      )}

      <FieldGroup>
        <Field data-invalid={!!err.title || undefined}>
          <FieldLabel htmlFor="title">{t("fTitle")}</FieldLabel>
          <Input
            id="title"
            name="title"
            defaultValue={state.values?.title ?? initial.title}
            placeholder={t("fTitlePlaceholder")}
            aria-invalid={!!err.title || undefined}
          />
          {err.title && <FieldError>{err.title}</FieldError>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!err.date || undefined}>
            <FieldLabel htmlFor="date">{t("fDate")}</FieldLabel>
            <Input
              id="date"
              name="date"
              type="date"
              min={initial.id ? undefined : today}
              defaultValue={state.values?.date ?? initial.date}
              aria-invalid={!!err.date || undefined}
            />
            {err.date && <FieldError>{err.date}</FieldError>}
          </Field>
          <Field data-invalid={!!err.time || undefined}>
            <FieldLabel htmlFor="time">{t("fTime")}</FieldLabel>
            <Input
              id="time"
              name="time"
              type="time"
              defaultValue={state.values?.time ?? initial.time}
              aria-invalid={!!err.time || undefined}
            />
            {err.time && <FieldError>{err.time}</FieldError>}
          </Field>
          <Field data-invalid={!!err.venue || undefined}>
            <FieldLabel htmlFor="venue">{t("fVenue")}</FieldLabel>
            <Input
              id="venue"
              name="venue"
              defaultValue={state.values?.venue ?? initial.venue}
              placeholder={t("fVenuePlaceholder")}
            />
            {err.venue && <FieldError>{err.venue}</FieldError>}
          </Field>
          <Field data-invalid={!!err.chairedBy || undefined}>
            <FieldLabel htmlFor="chairedBy">{t("fChairedBy")}</FieldLabel>
            <Input
              id="chairedBy"
              name="chairedBy"
              defaultValue={state.values?.chairedBy ?? initial.chairedBy}
              placeholder={t("fChairedByPlaceholder")}
            />
            {err.chairedBy && <FieldError>{err.chairedBy}</FieldError>}
          </Field>
        </div>
        <Field data-invalid={!!err.notes || undefined}>
          <FieldLabel htmlFor="notes">{t("fNotes")}</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={state.values?.notes ?? initial.notes}
            placeholder={t("fNotesPlaceholder")}
          />
          {err.notes && <FieldError>{err.notes}</FieldError>}
        </Field>
      </FieldGroup>

      <FieldSet data-invalid={!!err.items || undefined}>
        <FieldLegend>{t("agenda")}</FieldLegend>
        <FieldDescription>{t("agendaHint")}</FieldDescription>
        {err.items && <FieldError>{err.items}</FieldError>}

        {suggestions.length > 0 && (
          <div className="rounded-lg border border-dashed bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {t("suggestions")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 12).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => add(s.kind, s.id)}
                  className="flex max-w-full items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-left text-xs hover:bg-muted"
                >
                  <PlusIcon className="size-3 shrink-0" />
                  <span className="shrink-0 font-semibold text-navy">
                    {t(`kind.${s.kind}`)}:
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ol className="grid gap-3">
          {rows.map((r, index) => (
            <li
              key={r.key}
              className="grid gap-2 rounded-lg border bg-card p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                  {index + 1}
                </span>
                <Input
                  value={r.title}
                  onChange={(e) => update(r.key, { title: e.target.value })}
                  placeholder={t("itemTitle")}
                  aria-label={t("itemTitleLabel", { n: index + 1 })}
                />
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t("moveUp")}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t("moveDown")}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setRows((rs) => rs.filter((x) => x.key !== r.key))
                    }
                    aria-label={t("remove")}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 pl-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <select
                  value={r.kind}
                  onChange={(e) =>
                    update(r.key, { kind: e.target.value as Kind, refId: "" })
                  }
                  className={selectClass}
                  aria-label={t("linkTo")}
                >
                  <option value="">{t("kind.none")}</option>
                  <option value="project">{t("kind.project")}</option>
                  <option value="issue">{t("kind.issue")}</option>
                  <option value="directive">{t("kind.directive")}</option>
                </select>
                {r.kind && (
                  <select
                    value={r.refId}
                    onChange={(e) => {
                      const refId = e.target.value;
                      update(r.key, {
                        refId,
                        title: r.title || suggestedTitle(r.kind, refId),
                      });
                    }}
                    className={selectClass}
                    aria-label={t(`kind.${r.kind}`)}
                  >
                    <option value="">{t("choose")}</option>
                    {optionsFor(r.kind).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pl-8">
                <Textarea
                  value={r.notes}
                  onChange={(e) => update(r.key, { notes: e.target.value })}
                  rows={1}
                  placeholder={t("itemNotes")}
                  className="min-h-9"
                />
              </div>
            </li>
          ))}
        </ol>
        <div>
          <Button type="button" variant="outline" onClick={() => add()}>
            <PlusIcon />
            {t("addItem")}
          </Button>
        </div>
      </FieldSet>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={cancelHref} />}
        >
          {tc("cancel")}
        </Button>
        {published ? (
          <Button type="submit" name="intent" value="save" disabled={pending}>
            {pending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            {t("saveChanges")}
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="outline"
              disabled={pending}
            >
              {t("saveDraft")}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
            >
              {pending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
              {t("publish")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
