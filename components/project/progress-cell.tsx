import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { BEHIND_THRESHOLD } from "@/lib/progress";

type Props = { actual: number; planned: number | null; behind: number; className?: string };

/** Actual progress bar with a tick at the planned position, and a "behind" flag. */
export function ProgressCell({ actual, planned, behind, className }: Props) {
  const flagged = behind > BEHIND_THRESHOLD;
  const t = useTranslations("progress");
  return (
    <div className={`grid min-w-36 gap-1 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums">{actual}%</span>
        {planned != null && <span className="text-muted-foreground tabular-nums">{t("plan", { planned })}</span>}
      </div>
      <div
        className="relative h-1.5 rounded-full bg-muted"
        role="img"
        aria-label={planned != null ? t("ariaWithPlan", { actual, planned }) : t("aria", { actual })}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${actual}%`, backgroundColor: flagged ? "#d97706" : "#475569" }}
        />
        {planned != null && (
          <span className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-foreground/70" style={{ left: `calc(${planned}% - 1px)` }} />
        )}
      </div>
      {flagged && (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
          <TriangleAlertIcon className="size-3" />
          {t("behindBy", { behind })}
        </span>
      )}
    </div>
  );
}
