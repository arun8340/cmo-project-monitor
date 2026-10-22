"use client";

import Form from "next/form";
import { useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { SORTS, type SortKey } from "@/lib/data/sorts";

type Select = { name: string; label: string; value: string; allLabel: string; options: { value: string; label: string }[] };
type Props = {
  action: string;
  q: string;
  sort: SortKey;
  /** Other filters kept when searching (e.g. { status: "ongoing" }). */
  keep?: Record<string, string>;
  /** Extra filter drop-downs (e.g. district, department); they apply on change. */
  selects?: Select[];
  /** For lists with a fixed order (the sort is then not offered). */
  hideSort?: boolean;
};

const control =
  "h-9 rounded-lg border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Search + filters + sort. Submits as URL search params (works without JavaScript too). */
export function ListControls({ action, q, sort, keep = {}, selects = [], hideSort = false }: Props) {
  const clearQs = new URLSearchParams(Object.entries(keep));
  for (const s of selects) if (s.value) clearQs.set(s.name, s.value);
  if (sort !== "behind") clearQs.set("sort", sort);
  const clearHref = clearQs.size ? `${action}?${clearQs}` : action;
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("projectList");
  return (
    <Form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
      {Object.entries(keep).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          key={q}
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-9 w-full rounded-lg border bg-background pr-8 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {q && (
          <a
            href={clearHref}
            aria-label={t("clearSearch")}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </a>
        )}
      </div>
      {selects.map((s) => (
        <label key={s.name} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">{s.label}</span>
          <select name={s.name} defaultValue={s.value} aria-label={s.label} onChange={() => formRef.current?.requestSubmit()} className={`${control} sm:max-w-48`}>
            <option value="">{s.allLabel}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className={`flex items-center gap-2 text-sm text-muted-foreground ${hideSort ? "hidden" : ""}`}>
        {t("sort")}
        <select
          name="sort"
          defaultValue={sort}
          onChange={() => formRef.current?.requestSubmit()}
          className={control}
        >
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {t(`sorts.${key}`)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="sr-only">
        {t("searchLabel")}
      </button>
    </Form>
  );
}
