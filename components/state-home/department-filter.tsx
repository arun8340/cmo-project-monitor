import Link from "next/link";
import type { DepartmentChip } from "@/lib/data/state-overview";

type Props = {
  stateSlug: string;
  departments: DepartmentChip[];
  selected: string | null;
  totalProjects: number;
};

/** One row of department chips above the map; links keep the filter in the URL. */
export function DepartmentFilter({ stateSlug, departments, selected, totalProjects }: Props) {
  if (departments.length <= 1) return null; // e.g. a Department Head only has one

  const chip = (href: string, active: boolean, label: string, count: number, title?: string) => (
    <Link
      key={href}
      href={href}
      scroll={false}
      title={title}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted"
      }`}
    >
      {label}
      <span className={active ? "text-background/70" : "text-muted-foreground"}>{count}</span>
    </Link>
  );

  return (
    <nav aria-label="Filter by department" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chip(`/${stateSlug}`, !selected, "All departments", totalProjects)}
      {departments.map((d) =>
        chip(`/${stateSlug}?dept=${d.code.toLowerCase()}`, selected === d.code, d.name, d.projects, d.nameLocal),
      )}
    </nav>
  );
}
