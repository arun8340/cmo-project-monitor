"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LoaderCircleIcon, PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveVendor, toggleVendor, type RequestFormState } from "@/app/actions/requests";
import { submitKeepingValues } from "@/lib/forms";
import { IMAGERY_SOURCES, type ImagerySource } from "@/lib/constants";
import { useLabels } from "@/lib/i18n/client";

type Vendor = { id: string; name: string; type: ImagerySource; turnaroundDays: number; contact: string | null };

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Add a supplier, or edit one (opens in place). */
export function VendorForm({ stateSlug, vendor }: { stateSlug: string; vendor?: Vendor }) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(saveVendor, {});
  // The action result when the form was opened; a newer successful save closes it.
  const [openedAt, setOpenedAt] = useState<RequestFormState | null>(null);
  const open = openedAt !== null && !(state.ok && state !== openedAt);
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const labels = useLabels();
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (state.ok) toast.success(state.message);
  }, [state]);

  if (!open) {
    return (
      <Button variant={vendor ? "ghost" : "default"} size={vendor ? "sm" : "default"} onClick={() => setOpenedAt(state)}>
        {vendor ? <PencilIcon /> : <PlusIcon />}
        {vendor ? t("edit") : t("add")}
      </Button>
    );
  }
  return (
    <form onSubmit={submitKeepingValues(action)} className="grid w-full gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
      <input type="hidden" name="state" value={stateSlug} />
      {vendor && <input type="hidden" name="id" value={vendor.id} />}
      <Field data-invalid={!!err.name || undefined}>
        <FieldLabel htmlFor={`name-${vendor?.id ?? "new"}`}>{t("fName")}</FieldLabel>
        <Input id={`name-${vendor?.id ?? "new"}`} name="name" defaultValue={v.name ?? vendor?.name} />
        {err.name && <FieldError>{err.name}</FieldError>}
      </Field>
      <Field data-invalid={!!err.type || undefined}>
        <FieldLabel htmlFor={`type-${vendor?.id ?? "new"}`}>{t("fType")}</FieldLabel>
        <select id={`type-${vendor?.id ?? "new"}`} name="type" defaultValue={v.type ?? vendor?.type ?? "SATELLITE"} className={selectClass}>
          {IMAGERY_SOURCES.map((s) => (
            <option key={s} value={s}>
              {labels.source[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field data-invalid={!!err.turnaroundDays || undefined}>
        <FieldLabel htmlFor={`days-${vendor?.id ?? "new"}`}>{t("fTurnaround")}</FieldLabel>
        <Input id={`days-${vendor?.id ?? "new"}`} name="turnaroundDays" type="number" min={1} max={90} defaultValue={v.turnaroundDays ?? vendor?.turnaroundDays ?? 3} />
        {err.turnaroundDays && <FieldError>{err.turnaroundDays}</FieldError>}
      </Field>
      <Field data-invalid={!!err.contact || undefined}>
        <FieldLabel htmlFor={`contact-${vendor?.id ?? "new"}`}>{t("fContact")}</FieldLabel>
        <Input id={`contact-${vendor?.id ?? "new"}`} name="contact" defaultValue={v.contact ?? vendor?.contact ?? ""} placeholder={t("fContactPlaceholder")} />
        {err.contact && <FieldError>{err.contact}</FieldError>}
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          {tc("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpenedAt(null)}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Stop / resume ordering from a supplier. */
export function VendorToggle({ stateSlug, id, active }: { stateSlug: string; id: string; active: boolean }) {
  const [, action, pending] = useActionState<RequestFormState, FormData>(toggleVendor, {});
  const t = useTranslations("suppliers");
  return (
    <form action={action}>
      <input type="hidden" name="state" value={stateSlug} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {active ? t("deactivate") : t("activate")}
      </Button>
    </form>
  );
}
