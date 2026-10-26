import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2Icon, SatelliteDishIcon, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelLink } from "@/components/app-shell/page-parts";
import { RequestCard } from "@/components/requests/request-bits";
import type { DoitDashboard } from "@/lib/data/requests";
import { formatDate } from "@/lib/format";
import { imageryUrl } from "@/lib/imagery/url";
import { localName } from "@/lib/i18n/names";

/**
 * Home page for DoIT: the imagery desk's queue at a glance, what needs
 * attention, requests by department, supplier performance, recent deliveries.
 */
export function DoitDashboardView({ data, basePath, stateName }: { data: DoitDashboard; basePath: string; stateName: string }) {
  const t = useTranslations("doitHome");
  const locale = useLocale();
  const req = `${basePath}/requests`;
  const f = data.figures;
  const figures: { label: string; value: string | number; href: string; tone: string }[] = [
    { label: t("toReview"), value: f.toReview, href: `${req}?tab=new`, tone: "text-amber" },
    { label: t("toOrder"), value: f.toOrder, href: `${req}?tab=approved`, tone: "text-white" },
    { label: t("onOrder"), value: f.onOrder, href: `${req}?tab=ordered`, tone: "text-[#9cc8f5]" },
    { label: t("overdue"), value: f.overdue, href: `${req}?tab=open`, tone: "text-[#ffa58f]" },
    { label: t("deliveredMonth"), value: f.deliveredThisMonth, href: `${req}?tab=delivered`, tone: "text-[#8fe0b0]" },
    { label: t("avgTurnaround"), value: f.avgTurnaround == null ? "—" : t("days", { days: f.avgTurnaround }), href: `${req}?tab=all`, tone: "text-white" },
  ];
  const maxDept = Math.max(1, ...data.byDepartment.map((d) => d.total));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { state: stateName })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`${req}/suppliers`} />}>
            <TruckIcon />
            {t("suppliers")}
          </Button>
          <Button nativeButton={false} render={<Link href={req} />}>
            <SatelliteDishIcon />
            {t("openQueue")}
          </Button>
        </div>
      </div>

      <section aria-label={t("title")} className="relative overflow-hidden rounded-xl bg-navy text-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative background */}
        <img src="/landing/02.webp" alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-navy/85" />
        <ul className="relative grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 [&>li]:border-white/15 [&>li:not(:first-child)]:xl:border-l">
          {figures.map((it) => (
            <li key={it.label}>
              <Link href={it.href} className="block h-full px-4 py-4 transition-colors hover:bg-white/10 sm:px-5">
                <div className={`text-[30px] leading-none font-bold tracking-tight tabular-nums ${it.tone}`}>{it.value}</div>
                <div className="mt-1.5 text-[13px] font-semibold text-white/85">{it.label}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={t("attention")} description={t("attentionHint")} action={<PanelLink href={req}>{t("viewAll")}</PanelLink>}>
          {data.attention.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ok">
              <CheckCircle2Icon className="size-4" />
              {t("allClear")}
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {data.attention.map((r) => (
                <RequestCard key={r.id} r={r} basePath={basePath} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid content-start gap-5">
          <Panel title={t("byDepartment")}>
            {data.byDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              <ul className="grid gap-3">
                {data.byDepartment.map((d) => (
                  <li key={d.name}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{localName(locale, d.name, d.nameLocal)}</span>
                      <span className="text-[13px] text-muted-foreground">
                        <b className="text-navy tabular-nums">{d.total}</b> · {t("openCount", { count: d.open })}
                      </span>
                    </div>
                    <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="bg-amber" style={{ width: `${(d.open / maxDept) * 100}%` }} />
                      <span className="bg-info" style={{ width: `${((d.total - d.open) / maxDept) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("bySupplier")}>
            {data.bySupplier.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-semibold">{t("supplier")}</th>
                    <th className="pb-2 text-right font-semibold">{t("orders")}</th>
                    <th className="pb-2 text-right font-semibold">{t("onOrderCol")}</th>
                    <th className="pb-2 text-right font-semibold">{t("avgDelivery")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.bySupplier.map((s) => (
                    <tr key={s.name}>
                      <td className="py-2 pr-2 font-medium text-navy">{s.name}</td>
                      <td className="py-2 text-right tabular-nums">{s.orders}</td>
                      <td className="py-2 text-right tabular-nums">{s.onOrder}</td>
                      <td className="py-2 text-right tabular-nums">
                        {s.avgDays == null ? "—" : t("days", { days: s.avgDays })}
                        {s.delivered > 0 && (
                          <div className="text-[11px] text-muted-foreground">{t("onTime", { onTime: s.onTime, delivered: s.delivered })}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>

      <Panel title={t("recentDeliveries")}>
        {data.deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noDeliveries")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.deliveries.map((d) => (
              <li key={d.id}>
                <Link href={`${req}/${d.request!.id}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#0d1726]">
                    {/* Access-checked API image (see app/api/imagery). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageryUrl(d.id, "thumb")} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-navy/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {t("deliveredOn", { date: formatDate(d.request!.deliveredAt!, locale) })}
                    </span>
                  </div>
                  <div className="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold text-navy group-hover:underline">
                    {localName(locale, d.project.name, d.project.nameLocal)}
                  </div>
                  {d.request!.vendor && <div className="text-xs text-muted-foreground">{d.request!.vendor.name}</div>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
