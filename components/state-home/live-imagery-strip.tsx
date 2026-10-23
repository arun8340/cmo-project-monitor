import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { RadioIcon } from "lucide-react";
import { Panel, PanelLink } from "@/components/app-shell/page-parts";
import { StatusBadge } from "@/components/project/status-badge";
import type { ProjectStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { imageryUrl } from "@/lib/imagery/url";
import { localName } from "@/lib/i18n/names";

type Item = {
  id: string;
  name: string;
  nameLocal: string | null;
  status: ProjectStatus;
  district: { name: string; nameLocal: string | null };
  latest: { id: string; captureDate: Date };
};

const SHOWN = 6;

/** Home page: the latest satellite image of each site (newest first), opening Live tracking. */
export function LiveImageryStrip({
  items,
  basePath,
}: {
  items: Item[];
  basePath: string;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  if (items.length === 0) return null;
  return (
    <Panel
      title={
        <>
          <RadioIcon className="size-4 text-rust" />
          {t("liveImagery")}
        </>
      }
      description={t("liveImageryHint")}
      action={
        <PanelLink href={`${basePath}/imagery`}>
          {t("liveImageryAll", { count: items.length })}
        </PanelLink>
      }
    >
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.slice(0, SHOWN).map((p) => (
          <li key={p.id}>
            <Link
              href={`${basePath}/project/${p.id}/live`}
              className="group block"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#0d1726]">
                {/* Access-checked API image (see app/api/imagery). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageryUrl(p.latest.id, "thumb")}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-navy/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {formatDate(p.latest.captureDate, locale)}
                </span>
              </div>
              <div className="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold text-navy group-hover:underline">
                {localName(locale, p.name, p.nameLocal)}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {localName(locale, p.district.name, p.district.nameLocal)}
                <StatusBadge status={p.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
