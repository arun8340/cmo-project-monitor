/** Display formatting shared by server and client components (fixed locale/time zone). */

const TZ = "Asia/Kolkata";

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

/** Budget stored in ₹ lakh → "₹85 L" or "₹24.5 Cr". */
export function formatBudget(lakhs: number | null | undefined) {
  if (lakhs == null) return "—";
  if (lakhs >= 100) {
    const crore = lakhs / 100;
    return `₹${crore >= 100 ? Math.round(crore).toLocaleString("en-IN") : crore.toFixed(crore >= 10 ? 0 : 1)} Cr`;
  }
  return `₹${Math.round(lakhs)} L`;
}

/** File size → "740 KB" / "3.2 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const DAY_MS = 86_400_000;

/** Whole IST calendar days from `from` to `to` (positive if `to` is later). */
export function daysBetween(from: Date, to: Date) {
  const ist = (d: Date) => Math.floor((d.getTime() + 5.5 * 3_600_000) / DAY_MS);
  return ist(to) - ist(from);
}

/** "today", "3 days ago", "in 5 days". */
export function relativeDays(date: Date, now = new Date()) {
  const n = daysBetween(now, date);
  if (n === 0) return "today";
  if (n === -1) return "yesterday";
  if (n === 1) return "tomorrow";
  return n < 0 ? `${-n} days ago` : `in ${n} days`;
}
