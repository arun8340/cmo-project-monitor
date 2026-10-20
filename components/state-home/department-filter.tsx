import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { DepartmentChip } from "@/lib/data/state-overview";
import { localNames } from "@/lib/i18n/names";

type Props = {
  /** Link prefix for this state's pages ("" on its own portal, "/rj" on admin) */
  basePath: string;
  departments: DepartmentChip[];
  selected: string | null;
  totalProjects: number;
};

/** One row of department chips above the map; links keep the filter in the URL. */
export function DepartmentFilter({ basePath, departments, selected, totalProjects }: Props) {
  const t = useTranslations("home");
  const locale = useLocale();
  if (departments.length <= 1) return null; // e.g. a Department Head only has one
  const home = basePath || "/";

  const chip = (href: string, active: boolean, label: string, count: number, title?: string) => (
    <Link
      key={href}
      href={href}
      scroll={false}
      title={title}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-navy bg-navy font-semibold text-white" : "bg-card text-foreground hover:bg-muted"
      }`}
    >
      {label}
      <span className={active ? "text-white/70" : "text-muted-foreground"}>{count}</span>
    </Link>
  );

  return (
    <nav aria-label={t("filterByDepartment")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chip(home, !selected, t("allDepartments"), totalProjects)}
      {departments.map((d) => {
        const n = localNames(locale, d.name, d.nameLocal);
        return chip(`${home}?dept=${d.code.toLowerCase()}`, selected === d.code, n.primary, d.projects, n.secondary ?? undefined);
      })}
    </nav>
  );
}
