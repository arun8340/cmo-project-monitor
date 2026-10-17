import { useTranslations } from "next-intl";
import type { ProjectStatus } from "@/lib/constants";
import { STATUS_COLOR } from "@/lib/district-health";

/** Status label in ink colour with a coloured dot — colour never carries meaning alone. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("enums.projectStatus");
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs font-medium">
      <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
      {t(status)}
    </span>
  );
}
