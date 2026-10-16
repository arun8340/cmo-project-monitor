import { IMAGERY_SOURCES, type ImagerySource } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { toDateInput } from "@/lib/dates";
import { SOURCE_META } from "./source-meta";

type Props = { captures: { captureDate: Date; source: string }[]; start: Date | null; now: Date };

const W = 760;
const LANE = 26;
const M = { top: 8, right: 16, bottom: 26, left: 92 };

function Mark({ shape, cx, cy, color, children }: { shape: string; cx: number; cy: number; color: string; children: React.ReactNode }) {
  const common = { fill: color, stroke: "white", strokeWidth: 2 };
  if (shape === "square") return <rect x={cx - 5.5} y={cy - 5.5} width={11} height={11} rx={2} {...common}>{children}</rect>;
  if (shape === "triangle") return <path d={`M${cx},${cy - 7} L${cx + 7},${cy + 5.5} L${cx - 7},${cy + 5.5} Z`} {...common}>{children}</path>;
  return <circle cx={cx} cy={cy} r={6} {...common}>{children}</circle>;
}

/**
 * "Imagery availability by date": one lane per source, a mark per capture day.
 * Lanes are labelled and each source has its own shape, so colour is never the
 * only cue; hover a mark for its date and count.
 */
export function AvailabilityTimeline({ captures, start, now }: Props) {
  const earliest = captures.reduce<number>((m, c) => Math.min(m, c.captureDate.getTime()), now.getTime());
  const t0 = Math.min(start?.getTime() ?? earliest, earliest);
  const t1 = now.getTime();
  const span = Math.max(t1 - t0, 86_400_000 * 30);
  const x = (t: number) => M.left + ((t - t0) / span) * (W - M.left - M.right);
  const H = M.top + LANE * IMAGERY_SOURCES.length + M.bottom;

  // Group to one mark per source per day.
  const groups = new Map<string, { source: ImagerySource; day: string; t: number; n: number }>();
  for (const c of captures) {
    const day = toDateInput(c.captureDate);
    const key = `${c.source}|${day}`;
    const g = groups.get(key) ?? { source: c.source as ImagerySource, day, t: c.captureDate.getTime(), n: 0 };
    g.n++;
    groups.set(key, g);
  }

  // Month ticks (at most ~8 labels).
  const ticks: Date[] = [];
  const d = new Date(t0);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= t1) {
    ticks.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  const step = Math.max(1, Math.ceil(ticks.length / 8));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-150" role="img" aria-label={`Imagery availability: ${captures.length} images on ${groups.size} dates`}>
        {ticks.map((t, i) => (
          <g key={t.toISOString()}>
            <line x1={x(t.getTime())} x2={x(t.getTime())} y1={M.top} y2={H - M.bottom} stroke="currentColor" className="text-border" />
            {i % step === 0 && (
              <text x={x(t.getTime())} y={H - 8} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
                {t.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" })}
              </text>
            )}
          </g>
        ))}
        {start && start.getTime() >= t0 && (
          <g>
            <line x1={x(start.getTime())} x2={x(start.getTime())} y1={M.top} y2={H - M.bottom} stroke="currentColor" className="text-foreground/40" strokeDasharray="3 3" />
            <title>{`Work started ${formatDate(start)}`}</title>
          </g>
        )}
        {IMAGERY_SOURCES.map((s, i) => {
          const cy = M.top + LANE * i + LANE / 2;
          const meta = SOURCE_META[s];
          return (
            <g key={s}>
              <line x1={M.left} x2={W - M.right} y1={cy} y2={cy} stroke="currentColor" className="text-border" />
              <text x={M.left - 10} y={cy + 4} textAnchor="end" fontSize="11" className="fill-foreground">
                {meta.label}
              </text>
              {[...groups.values()]
                .filter((g) => g.source === s)
                .map((g) => (
                  <Mark key={g.day} shape={meta.shape} cx={x(g.t)} cy={cy} color={meta.color}>
                    <title>{`${meta.label} · ${formatDate(new Date(g.t))} · ${g.n} image${g.n === 1 ? "" : "s"}`}</title>
                  </Mark>
                ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
