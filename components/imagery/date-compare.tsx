"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ColumnsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DateOption = { id: string; label: string };

/**
 * Pick two capture dates and open them in the comparison screen.
 * `options` oldest first; starts on the earliest vs the latest image.
 */
export function DateCompare({
  options,
  compareHref,
  tone = "light",
}: {
  options: DateOption[];
  compareHref: string;
  tone?: "light" | "dark";
}) {
  const t = useTranslations("tracking");
  const [from, setFrom] = useState(options[0]?.id ?? "");
  const [to, setTo] = useState(options.at(-1)?.id ?? "");
  if (options.length < 2) return null;

  const select =
    tone === "dark"
      ? "h-9 min-w-0 rounded-lg border border-white/20 bg-white/10 px-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40 [&>option]:text-foreground"
      : "h-9 min-w-0 rounded-lg border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const label = tone === "dark" ? "text-white/70" : "text-muted-foreground";
  const same = from === to;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className={`grid gap-1 text-xs ${label}`}>
        {t("from")}
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={select}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className={`grid gap-1 text-xs ${label}`}>
        {t("to")}
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={select}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {same ? (
        <Button disabled variant={tone === "dark" ? "secondary" : "default"}>
          <ColumnsIcon />
          {t("compare")}
        </Button>
      ) : (
        <Button
          variant={tone === "dark" ? "secondary" : "default"}
          nativeButton={false}
          render={<Link href={`${compareHref}&images=${from},${to}`} />}
        >
          <ColumnsIcon />
          {t("compare")}
        </Button>
      )}
      {same && <span className={`pb-2 text-xs ${label}`}>{t("pickTwo")}</span>}
    </div>
  );
}
