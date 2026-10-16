import { formatDate } from "@/lib/format";

type Entry = { id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: Date; user: { name: string } | null };

/** History of an issue or directive, oldest first. `labels` maps statuses to display text. */
export function Timeline({ entries, labels, createdVerb }: { entries: Entry[]; labels: Record<string, string>; createdVerb: string }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No history recorded.</p>;
  return (
    <ol className="relative grid gap-5 border-l pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-6.25 size-2.5 rounded-full border-2 border-card bg-slate-500" />
          <div className="text-sm">
            <span className="font-medium">
              {e.fromStatus == null ? createdVerb : `${labels[e.fromStatus] ?? e.fromStatus} → ${labels[e.toStatus] ?? e.toStatus}`}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {e.user?.name ?? "System"} · {formatDate(e.createdAt)}
            </span>
          </div>
          {e.note && <p className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-sm">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
