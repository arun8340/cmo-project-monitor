import { useTranslations } from "next-intl";
import type { ProjectStatus } from "@/lib/constants";
import { pill, TONE_PILL } from "@/components/workflow/badges";

const STYLE: Record<ProjectStatus, string> = {
  COMPLETED: TONE_PILL.ok,
  ONGOING: TONE_PILL.info,
  DELAYED: TONE_PILL.bad,
  STALLED: TONE_PILL.stall,
  NOT_STARTED: TONE_PILL.muted,
};

/** Project status as a soft pill with its label. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("enums.projectStatus");
  return <span className={`${pill} ${STYLE[status]}`}>{t(status)}</span>;
}
