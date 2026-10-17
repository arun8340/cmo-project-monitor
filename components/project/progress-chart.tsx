import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";

type Point = { date: Date; percent: number };
type Props = { start: Date | null; plannedEnd: Date | null; updates: Point[]; now?: Date };

const W = 640;
const H = 220;
const M = { top: 16, right: 24, bottom: 30, left: 36 };
const ACTUAL = "#334155";
const PLANNED = "#94a3b8";

/**
 * Actual vs planned progress over time (server-rendered SVG).
 * Two series → legend plus direct end labels; values on hover via <title>.
 */
export function ProgressChart({ start, plannedEnd, updates, now = new Date() }: Props) {
  const t = useTranslations("chart");
  const locale = useLocale();
  if (!start && updates.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }

  const t0 = (start ?? updates[0].date).getTime();
  const tEnd = Math.max(plannedEnd?.getTime() ?? 0, now.getTime(), updates.at(-1)?.date.getTime() ?? 0, t0 + 86_400_000);
  const x = (t: number) => M.left + ((t - t0) / (tEnd - t0)) * (W - M.left - M.right);
  const y = (p: number) => M.top + (1 - p / 100) * (H - M.top - M.bottom);

  const actual: Point[] = [...(start && (!updates[0] || updates[0].date > start) ? [{ date: start, percent: 0 }] : []), ...updates];
  const actualPath = actual.map((p, i) => `${i ? "L" : "M"}${x(p.date.getTime()).toFixed(1)},${y(p.percent).toFixed(1)}`).join(" ");

  const plannedPath =
    start && plannedEnd
      ? `M${x(t0)},${y(0)} L${x(plannedEnd.getTime())},${y(100)}${plannedEnd.getTime() < tEnd ? ` L${x(tEnd)},${y(100)}` : ""}`
      : null;
  const plannedNow = start && plannedEnd ? Math.min(100, Math.max(0, ((now.getTime() - t0) / (plannedEnd.getTime() - t0)) * 100)) : null;
  const last = actual.at(-1)!;
  const todayX = x(now.getTime());

  // Label the planned line where it crosses "today", on the opposite side of
  // the actual line's label so the two never collide.
  const plannedTodayY = plannedNow != null ? y(plannedNow) : null;
  const actualBelow = plannedTodayY == null || y(last.percent) >= plannedTodayY;
  const actualLabelY = y(last.percent) + (actualBelow ? 14 : -8);
  const plannedLabelY = plannedTodayY == null ? null : plannedTodayY + (actualBelow ? -8 : 14);

  return (
    <div className="grid gap-2">
      <ul className="flex gap-4 text-xs text-muted-foreground" aria-hidden>
        <li className="flex items-center gap-1.5">
          <svg width="18" height="6">
            <line x1="0" y1="3" x2="18" y2="3" stroke={ACTUAL} strokeWidth="2" />
          </svg>
          {t("actual")}
        </li>
        {plannedPath && (
          <li className="flex items-center gap-1.5">
            <svg width="18" height="6">
              <line x1="0" y1="3" x2="18" y2="3" stroke={PLANNED} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            {t("planned")}
          </li>
        )}
      </ul>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-120"
          role="img"
          aria-label={plannedNow != null ? t("ariaWithPlan", { actual: last.percent, planned: Math.round(plannedNow) }) : t("aria", { actual: last.percent })}
        >
          {[0, 25, 50, 75, 100].map((p) => (
            <g key={p}>
              <line x1={M.left} x2={W - M.right} y1={y(p)} y2={y(p)} stroke="currentColor" className="text-border" strokeWidth="1" />
              <text x={M.left - 6} y={y(p) + 3.5} textAnchor="end" fontSize="10" className="fill-muted-foreground">
                {p}%
              </text>
            </g>
          ))}

          {todayX <= W - M.right && (
            <g>
              <line x1={todayX} x2={todayX} y1={M.top} y2={H - M.bottom} stroke="currentColor" className="text-muted-foreground" strokeDasharray="2 3" />
              <text x={todayX} y={H - M.bottom + 22} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
                {t("today")}
              </text>
            </g>
          )}

          <text x={M.left} y={H - M.bottom + 22} fontSize="10" className="fill-muted-foreground">
            {formatDate(new Date(t0), locale)}
          </text>
          {plannedEnd && (
            <text
              x={x(plannedEnd.getTime())}
              y={H - M.bottom + 12}
              textAnchor={x(plannedEnd.getTime()) > W - M.right - 40 ? "end" : "middle"}
              fontSize="10"
              className="fill-muted-foreground"
            >
              {t("plannedEnd")}
            </text>
          )}

          {plannedPath && <path d={plannedPath} fill="none" stroke={PLANNED} strokeWidth="2" strokeDasharray="5 4" />}
          <path d={actualPath} fill="none" stroke={ACTUAL} strokeWidth="2" strokeLinejoin="round" />

          {actual.map((p, i) => (
            <circle key={i} cx={x(p.date.getTime())} cy={y(p.percent)} r="4" fill={ACTUAL} stroke="white" strokeWidth="2">
              <title>{`${formatDate(p.date, locale)}: ${p.percent}%`}</title>
            </circle>
          ))}

          <text x={x(last.date.getTime()) + 6} y={actualLabelY} fontSize="11" fontWeight="600" className="fill-foreground">
            {t("actualValue", { percent: last.percent })}
          </text>
          {plannedLabelY != null && plannedNow != null && todayX <= W - M.right && (
            <text x={todayX - 6} y={plannedLabelY} textAnchor="end" fontSize="11" className="fill-muted-foreground">
              {t("planValue", { percent: Math.round(plannedNow) })}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
