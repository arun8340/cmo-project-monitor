/**
 * Calendar dates in India Standard Time. Form date inputs use "YYYY-MM-DD";
 * they are stored as midnight IST so they display as the same calendar day.
 */
const IST = "Asia/Kolkata";
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" });

/** Date → "YYYY-MM-DD" (IST calendar day). */
export function toDateInput(d: Date | null | undefined) {
  return d ? ymd.format(d) : "";
}

/** Today's IST calendar day as "YYYY-MM-DD". */
export function todayIST(now = new Date()) {
  return ymd.format(now);
}

/** "YYYY-MM-DD" → Date at 00:00 IST, or null if invalid. */
export function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) || toDateInput(d) !== value ? null : d;
}
