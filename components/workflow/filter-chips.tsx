import Link from "next/link";

type Chip = { key: string; label: string; count?: number; href: string; active: boolean; tone?: "danger" };

/** One row of filter chips with counts (links, so the filter lives in the URL). */
export function FilterChips({ label, chips }: { label: string; chips: Chip[] }) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          scroll={false}
          aria-current={c.active ? "page" : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            c.active
              ? c.tone === "danger"
                ? "border-red-700 bg-red-700 text-white"
                : "border-navy bg-navy font-semibold text-white"
              : c.tone === "danger" && (c.count ?? 1) > 0
                ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                : "bg-card text-foreground hover:bg-muted"
          } ${c.count === 0 && !c.active ? "opacity-50" : ""}`}
        >
          {c.label}
          {c.count !== undefined && <span className={c.active ? "text-white/70" : "text-muted-foreground"}>{c.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Builds a URL from a base path and params, dropping empty values. */
export function withParams(base: string, params: Record<string, string | null | undefined | false>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${base}?${s}` : base || "/";
}
