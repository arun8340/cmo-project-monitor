"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LoaderCircleIcon, ShoppingCartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder, type RequestFormState } from "@/app/actions/requests";
import { submitKeepingValues } from "@/lib/forms";
import type { ImagerySource } from "@/lib/constants";
import { useLabels } from "@/lib/i18n/client";

type Vendor = { id: string; name: string; type: ImagerySource; turnaroundDays: number };

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

/** "YYYY-MM-DD" plus `days`. */
const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * DoIT: order an approved request from a supplier. Suppliers of the requested
 * type come first; the expected date follows the supplier's usual turnaround.
 */
export function OrderForm({ id, stateSlug, type, vendors, today }: { id: string; stateSlug: string; type: ImagerySource; vendors: Vendor[]; today: string }) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(placeOrder, {});
  const t = useTranslations("requests");
  const labels = useLabels();
  const sorted = useMemo(() => [...vendors].sort((a, b) => Number(b.type === type) - Number(a.type === type)), [vendors, type]);
  const [vendorId, setVendorId] = useState(sorted.find((v) => v.type === type)?.id ?? sorted[0]?.id ?? "");
  const vendor = vendors.find((v) => v.id === vendorId);
  const [expected, setExpected] = useState(addDays(today, vendor?.turnaroundDays ?? 3));
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast.success(state.message);
  }, [state]);

  if (state.ok) return null;

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-4 rounded-xl border-2 border-amber/60 bg-warn-soft/40 p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={stateSlug} />
      <div>
        <h2 className="flex items-center gap-2 font-bold text-navy">
          <ShoppingCartIcon className="size-4" />
          {t("placeOrder")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("placeOrderHint")}</p>
      </div>
      {state.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!err.vendor || undefined}>
            <FieldLabel htmlFor="vendor">{t("fVendor")}</FieldLabel>
            <select
              id="vendor"
              name="vendor"
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                const v = vendors.find((x) => x.id === e.target.value);
                if (v) setExpected(addDays(today, v.turnaroundDays));
              }}
              className={selectClass}
            >
              {sorted.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {labels.source[v.type]}
                </option>
              ))}
            </select>
            {vendor && <FieldDescription>{t("turnaround", { days: vendor.turnaroundDays })}</FieldDescription>}
            {err.vendor && <FieldError>{err.vendor}</FieldError>}
          </Field>
          <Field data-invalid={!!err.expectedBy || undefined}>
            <FieldLabel htmlFor="expectedBy">{t("fExpectedBy")}</FieldLabel>
            <Input id="expectedBy" name="expectedBy" type="date" min={today} value={expected} onChange={(e) => setExpected(e.target.value)} />
            {err.expectedBy && <FieldError>{err.expectedBy}</FieldError>}
          </Field>
        </div>
        <Field data-invalid={!!err.orderRef || undefined}>
          <FieldLabel htmlFor="orderRef">{t("fOrderRef")}</FieldLabel>
          <Input id="orderRef" name="orderRef" defaultValue={state.values?.orderRef} placeholder={t("fOrderRefPlaceholder")} />
          {err.orderRef && <FieldError>{err.orderRef}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="orderNote">{t("fOrderNote")}</FieldLabel>
          <Textarea id="orderNote" name="note" rows={2} defaultValue={state.values?.note} />
        </Field>
      </FieldGroup>
      <div>
        <Button type="submit" disabled={pending || !vendorId}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : <ShoppingCartIcon />}
          {t("confirmOrder")}
        </Button>
      </div>
    </form>
  );
}
