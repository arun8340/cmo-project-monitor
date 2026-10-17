import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLabels } from "./labels";
import type { Locale } from "./config";

/** Translated value labels for server components and actions. */
export async function getLabels(locale?: Locale) {
  const t = locale ? await getTranslations({ locale, namespace: "enums" }) : await getTranslations("enums");
  return buildLabels(t as unknown as (key: string) => string);
}

/** A translator with loosely typed keys, for keys built at runtime (validation, actions). */
export type LooseT = (key: string, values?: Record<string, string | number>) => string;

/** Messages for server actions: validation errors and confirmations ("actions" namespace). */
export async function getActionT(): Promise<LooseT> {
  return (await getTranslations("actions")) as unknown as LooseT;
}

export { getLocale, getTranslations };
