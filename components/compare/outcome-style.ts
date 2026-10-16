import { CircleCheckIcon, CircleMinusIcon, TriangleAlertIcon } from "lucide-react";
import type { VerificationOutcome } from "@/lib/constants";

/** Icon + colour per verification outcome (always shown with its text label). */
export const OUTCOME_STYLE: Record<VerificationOutcome, { icon: typeof CircleCheckIcon; className: string }> = {
  PROGRESS_VISIBLE: { icon: CircleCheckIcon, className: "text-green-700" },
  NO_VISIBLE_CHANGE: { icon: CircleMinusIcon, className: "text-slate-600" },
  DISCREPANCY: { icon: TriangleAlertIcon, className: "text-red-700" },
};
