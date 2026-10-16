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
