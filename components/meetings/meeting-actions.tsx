"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  BanIcon,
  LoaderCircleIcon,
  PrinterIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  changeMeetingStatus,
  type MeetingFormState,
} from "@/app/actions/meetings";
import type { MeetingStatus } from "@/lib/constants";

/** Publish / cancel / restore (for those who manage meetings). */
export function MeetingStatusActions({
  id,
  status,
  stateSlug,
}: {
  id: string;
  status: MeetingStatus;
  stateSlug: string;
}) {
  const [state, action, pending] = useActionState<MeetingFormState, FormData>(
    changeMeetingStatus,
    {},
  );
  const t = useTranslations("meetings");
  const button = (
    to: MeetingStatus,
    label: string,
    Icon: typeof SendIcon,
    variant: "default" | "outline",
  ) => (
    <Button
      type="submit"
      name="to"
      value={to}
      variant={variant}
      disabled={pending}
      onClick={(e) =>
        to === "CANCELLED" && !confirm(t("confirmCancel")) && e.preventDefault()
      }
    >
      {pending ? <LoaderCircleIcon className="animate-spin" /> : <Icon />}
      {label}
    </Button>
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={stateSlug} />
      {status === "DRAFT" &&
        button("PUBLISHED", t("publish"), SendIcon, "default")}
      {status !== "CANCELLED" &&
        button("CANCELLED", t("cancelMeeting"), BanIcon, "outline")}
      {status === "CANCELLED" &&
        button("DRAFT", t("restore"), RotateCcwIcon, "outline")}
      {state.message && (
        <span
          role="status"
          className={`text-sm ${state.ok ? "text-ok" : "text-destructive"}`}
        >
          {state.message}
        </span>
      )}
    </form>
  );
}

export function PrintButton() {
  const t = useTranslations("meetings");
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <PrinterIcon />
      {t("print")}
    </Button>
  );
}
