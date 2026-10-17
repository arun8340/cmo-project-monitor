"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { buildLabels } from "./labels";

/** Translated value labels for client components. */
export function useLabels() {
  const t = useTranslations("enums");
  return useMemo(() => buildLabels(t as unknown as (key: string) => string), [t]);
}
