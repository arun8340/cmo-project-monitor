/**
 * CMO review meetings are held on the 15th and the 30th of every month (the
 * last day in February), at 11:00 IST. Slots are numbered consecutively so
 * dates can be stepped forward or back by whole meetings.
 */
const IST_OFFSET = 5.5 * 3_600_000;
const MEETING_HOUR_UTC = { h: 5, m: 30 }; // 11:00 IST

const lastDay = (y: number, m: number) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const secondDay = (y: number, m: number) => Math.min(30, lastDay(y, m));

/** IST calendar parts of a date. */
function istParts(d: Date) {
  const ist = new Date(d.getTime() + IST_OFFSET);
  return {
    y: ist.getUTCFullYear(),
    m: ist.getUTCMonth(),
    day: ist.getUTCDate(),
    h: ist.getUTCHours(),
    min: ist.getUTCMinutes(),
  };
}

/** Meeting date (11:00 IST) of slot `index`. */
export function slotDate(index: number) {
  const half = ((index % 2) + 2) % 2;
  const month = (index - half) / 2;
  const y = Math.floor(month / 12);
  const m = month - y * 12;
  const day = half === 0 ? 15 : secondDay(y, m);
  return new Date(Date.UTC(y, m, day, MEETING_HOUR_UTC.h, MEETING_HOUR_UTC.m));
}

/** Index of the first meeting slot on or after the IST calendar day of `d`. */
export function slotOnOrAfter(d: Date) {
  const { y, m, day } = istParts(d);
  const base = (y * 12 + m) * 2;
  if (day <= 15) return base;
  if (day <= secondDay(y, m)) return base + 1;
  return base + 2;
}

/** The slot a stored meeting time falls on (an exact 11:00 IST meeting day), or null. */
export function slotOf(d: Date) {
  const { y, m, day, h, min } = istParts(d);
  if (h !== 11 || min !== 0) return null;
  if (day === 15) return (y * 12 + m) * 2;
  if (day === secondDay(y, m)) return (y * 12 + m) * 2 + 1;
  return null;
}
