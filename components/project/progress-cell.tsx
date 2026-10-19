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
        <span className="font-bold text-navy tabular-nums">{actual}%</span>
        {planned != null && <span className="text-muted-foreground tabular-nums">{t("plan", { planned })}</span>}
      </div>
      <div
        className="relative h-2 rounded-full bg-[#ebe7dd]"
        role="img"
        aria-label={planned != null ? t("ariaWithPlan", { actual, planned }) : t("aria", { actual })}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${actual}%`, backgroundColor: "#2c4f7c" }}
        />
        {planned != null && (
          <span className="absolute -top-1 h-4 w-[3px] rounded-full bg-rust" style={{ left: `calc(${planned}% - 1.5px)` }} />
        )}
      </div>
      {flagged && (
        <span className="flex items-center gap-1 text-xs font-semibold text-bad">
          <TriangleAlertIcon className="size-3" />
          {t("behindBy", { behind })}
        </span>
      )}
    </div>
  );
}
