import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";

/** Translator for the "actions" messages (see getActionT in lib/i18n/server.ts). */
type T = (key: string, values?: Record<string, string | number>) => string;

/** Shape returned by form actions to `useActionState`. */
export type FormState<Values = Record<string, string>> = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof Values & string, string>>;
  values?: Partial<Values>;
};

const optionalText = (t: T, max: number) =>
  z
    .string()
    .trim()
    .max(max, t("v.tooLong", { max }))
    .transform((v) => (v === "" ? null : v));

const dateField = (t: T, field: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const d = parseDateInput(v);
      if (!d) ctx.addIssue({ code: "custom", message: t("v.invalidDate", { field: t(`v.field.${field}`) }) });
      return d;
    });

const number = (t: T, field: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, t("v.enter", { field: t(`v.field.${field}`) }))
    .transform(Number)
    .refine((n) => Number.isFinite(n), t("v.notNumber", { field: t(`v.field.${field}`) }))
    .refine((n) => n >= min && n <= max, t("v.range", { field: t(`v.field.${field}`), min, max }));

/** Add / edit project. Status and progress are changed through progress updates, not here. */
export const projectSchema = (t: T) =>
  z
    .object({
      name: z.string().trim().min(3, t("v.projectName")).max(200),
      nameLocal: optionalText(t, 200),
      description: optionalText(t, 2000),
      department: z.string().trim().min(1, t("v.chooseDepartment")),
      district: z.string().trim().min(1, t("v.chooseDistrict")),
      // Roughly the extent of India; the map picker keeps it inside the district in practice.
      latitude: number(t, "latitude", 6, 37),
      longitude: number(t, "longitude", 68, 98),
      budgetLakhs: z
        .string()
        .trim()
        .transform((v, ctx) => {
          if (v === "") return null;
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
            ctx.addIssue({ code: "custom", message: t("v.budget") });
          }
          return n;
        }),
      startDate: dateField(t, "startDate"),
      plannedEndDate: dateField(t, "plannedEndDate"),
    })
    .superRefine((v, ctx) => {
      if (v.startDate && v.plannedEndDate && v.plannedEndDate <= v.startDate) {
        ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: t("v.endAfterStart") });
      }
    });
export type ProjectFormValues = z.input<ReturnType<typeof projectSchema>>;

/** Initial status when creating a project. */
export const createStatusSchema = (t: T) => z.enum(["NOT_STARTED", "ONGOING"], { message: t("v.startingStatus") });

export const progressSchema = (t: T) =>
  z.object({
    date: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const d = parseDateInput(v);
        if (!d) ctx.addIssue({ code: "custom", message: t("v.validDate") });
        return d!;
      }),
    progressPercent: z
      .string()
      .trim()
      .min(1, t("v.enterProgress"))
      .transform(Number)
      .refine((n) => Number.isInteger(n) && n >= 0 && n <= 100, t("v.progressRange")),
    status: z.enum(PROJECT_STATUSES, { message: t("v.chooseStatus") }),
    notes: optionalText(t, 1000),
  });
export type ProgressFormValues = z.input<ReturnType<typeof progressSchema>>;

/** First error message per field, for showing next to inputs. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
