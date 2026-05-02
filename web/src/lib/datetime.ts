/**
 * Centralized date helpers — Belgrade timezone.
 *
 * Why: server in production runs UTC, but the salon operates on Europe/Belgrade
 * (UTC+1 winter / UTC+2 summer). Using `new Date().toISOString().split("T")[0]`
 * directly produces "yesterday" between 00:00 and 02:00 Belgrade time, which
 * skewed every admin date query (today, week, month, heatmap, statistike).
 *
 * Use ONLY these helpers anywhere a YYYY-MM-DD or week/month boundary is
 * needed for booking / customer / stats logic. JS-side `Date` objects returned
 * here are anchored to Belgrade local time and safe to call .getDay() etc on.
 */

const TZ = "Europe/Belgrade";

/** Current moment in Belgrade time as a JS Date. */
export function nowBelgrade(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

/** YYYY-MM-DD for today in Belgrade. */
export function todayKey(): string {
  return formatDateKey(nowBelgrade());
}

/** YYYY-MM-DD for any Date. Uses local-component fields (no UTC shift). */
export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday—Sunday week containing today (Belgrade). */
export function weekRange(): { from: string; to: string } {
  const today = nowBelgrade();
  today.setHours(0, 0, 0, 0);
  const monOffset = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const mon = new Date(today);
  mon.setDate(today.getDate() - monOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: formatDateKey(mon), to: formatDateKey(sun) };
}

/** First → last day of a given month (default: current Belgrade month). */
export function monthRangeFromKey(key?: string): { from: string; to: string; year: number; month: number } {
  const today = nowBelgrade();
  let year = today.getFullYear();
  let mo = today.getMonth();
  if (key && /^\d{4}-\d{2}$/.test(key)) {
    const [y, m] = key.split("-").map(Number);
    year = y;
    mo = m - 1;
  }
  const first = new Date(year, mo, 1);
  const last = new Date(year, mo + 1, 0);
  return { from: formatDateKey(first), to: formatDateKey(last), year, month: mo };
}

/** Period bounds for /admin/statistike (day | week | month). */
export function periodRange(period: "day" | "week" | "month"): { from: Date; to: Date } {
  const today = nowBelgrade();
  today.setHours(0, 0, 0, 0);
  if (period === "day") return { from: today, to: today };
  if (period === "week") {
    const monOffset = (today.getDay() + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - monOffset);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon, to: sun };
  }
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: first, to: last };
}

/**
 * "HH:MM" of the current moment in Belgrade. Used by booking flow to filter
 * past slots so a customer at 14:52 can't pick the 14:00 slot that has
 * already started or finished. Returns the exact minute, no rounding.
 */
export function nowHHMMBelgrade(): string {
  const d = nowBelgrade();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * True iff date+time is in the past in Belgrade time. Date string is
 * YYYY-MM-DD, time string is HH:MM (24h). Used as the server-side guard in
 * submitBooking / createWalkInBooking — never trust the client to filter
 * its own slots.
 */
export function isPastBelgrade(dateKey: string, timeHHMM: string): boolean {
  const today = todayKey();
  if (dateKey < today) return true;
  if (dateKey > today) return false;
  return timeHHMM <= nowHHMMBelgrade();
}

/** Previous period of equal length, for change-% comparisons. */
export function previousRange(period: "day" | "week" | "month", current: { from: Date; to: Date }): { from: Date; to: Date } {
  if (period === "day") {
    const d = new Date(current.from);
    d.setDate(d.getDate() - 1);
    return { from: d, to: d };
  }
  if (period === "week") {
    const from = new Date(current.from);
    from.setDate(from.getDate() - 7);
    const to = new Date(current.to);
    to.setDate(to.getDate() - 7);
    return { from, to };
  }
  const first = new Date(current.from.getFullYear(), current.from.getMonth() - 1, 1);
  const last = new Date(current.from.getFullYear(), current.from.getMonth(), 0);
  return { from: first, to: last };
}
