import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";

/** Shape returned by form actions to `useActionState`. */
export type FormState<Values = Record<string, string>> = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof Values & string, string>>;
  values?: Partial<Values>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === "" ? null : v));

const dateField = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const d = parseDateInput(v);
      if (!d) ctx.addIssue({ code: "custom", message: `Enter a valid ${label}` });
      return d;
    });

const number = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .transform(Number)
    .refine((n) => Number.isFinite(n), `Enter a number for ${label}`)
    .refine((n) => n >= min && n <= max, `${label[0].toUpperCase()}${label.slice(1)} must be between ${min} and ${max}`);

/** Add / edit project. Status and progress are changed through progress updates, not here. */
export const projectSchema = z
  .object({
    name: z.string().trim().min(3, "Enter the project name (at least 3 characters)").max(200),
    nameLocal: optionalText(200),
    description: optionalText(2000),
    department: z.string().trim().min(1, "Choose a department"),
    district: z.string().trim().min(1, "Choose a district"),
    // Roughly the extent of India; the map picker keeps it inside the district in practice.
    latitude: number("latitude", 6, 37),
    longitude: number("longitude", 68, 98),
    budgetLakhs: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
          ctx.addIssue({ code: "custom", message: "Enter the budget in ₹ lakh (0 or more)" });
        }
        return n;
      }),
    startDate: dateField("start date"),
    plannedEndDate: dateField("planned end date"),
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.plannedEndDate && v.plannedEndDate <= v.startDate) {
      ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: "Planned end must be after the start date" });
    }
  });
export type ProjectFormValues = z.input<typeof projectSchema>;

/** Initial status when creating a project. */
export const createStatusSchema = z.enum(["NOT_STARTED", "ONGOING"], { message: "Choose a starting status" });

export const progressSchema = z.object({
  date: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = parseDateInput(v);
      if (!d) ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return d!;
    }),
  progressPercent: z
    .string()
    .trim()
    .min(1, "Enter progress")
    .transform(Number)
    .refine((n) => Number.isInteger(n) && n >= 0 && n <= 100, "Progress must be a whole number from 0 to 100"),
  status: z.enum(PROJECT_STATUSES, { message: "Choose a status" }),
  notes: optionalText(1000),
});
export type ProgressFormValues = z.input<typeof progressSchema>;

/** First error message per field, for showing next to inputs. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
