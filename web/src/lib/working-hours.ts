/**
 * Working-hours utilities — pure, side-effect-free.
 *
 * working_hours JSONB shape (per `salons` table):
 *   { mon: { open: "09:00", close: "20:00" } | null, tue: ..., ..., sun: ... }
 *
 * Server-rendered. The hero indicator can be stale by up to 5 minutes (Next
 * revalidation interval) or until admin saves working_hours (revalidatePath fires).
 * That's acceptable accuracy for a "DANAS OTVORENO" badge.
 */

export type DayHours = { open: string; close: string } | null;
export type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_LABEL_SR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const DAY_LABEL_LAT = ["NED", "PON", "UTO", "SRE", "ČET", "PET", "SUB"] as const;

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hourLabel(hhmm: string): string {
  // "09:00" or "09:00:00" → "09"
  return hhmm.split(":")[0].padStart(2, "0");
}

export type OpenStatus = {
  isOpen: boolean;
  textSr: string;
  textLat: string;
};

/**
 * Compute today's open status text from a working_hours JSONB and a reference Date.
 * Pass `now` explicitly so the function is deterministic + testable.
 */
export function computeOpenStatus(workingHours: WorkingHours | null | undefined, now: Date): OpenStatus {
  // Fallback when working hours haven't been seeded yet — keep the original "ОТВОРЕНО · ДО 20H" tone.
  if (!workingHours) {
    return { isOpen: true, textSr: "OPEN · UNTIL 20H", textLat: "OTVORENO · DO 20H" };
  }

  const todayDow = now.getDay(); // 0=Sun..6=Sat
  const todayKey = DAY_KEYS[todayDow];
  const today = workingHours[todayKey];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (today) {
    const openMin = toMin(today.open);
    const closeMin = toMin(today.close);

    if (nowMin >= openMin && nowMin < closeMin) {
      const closeH = hourLabel(today.close);
      return {
        isOpen: true,
        textSr: `OPEN · UNTIL ${closeH}H`,
        textLat: `OTVORENO · DO ${closeH}H`,
      };
    }
    if (nowMin < openMin) {
      const openH = hourLabel(today.open);
      return {
        isOpen: false,
        textSr: `CLOSED · OPENS AT ${openH}H`,
        textLat: `ZATVORENO · OTVARANJE U ${openH}H`,
      };
    }
    // After close — fall through to find next open day
  }

  // Find next open day (look up to 7 days ahead — guaranteed termination if any day is open)
  for (let i = 1; i <= 7; i++) {
    const nextDow = (todayDow + i) % 7;
    const nextDay = workingHours[DAY_KEYS[nextDow]];
    if (nextDay) {
      const openH = hourLabel(nextDay.open);
      const isTomorrow = i === 1;
      const dayLabelSr = DAY_LABEL_SR[nextDow];
      const dayLabelLat = DAY_LABEL_LAT[nextDow];
      return {
        isOpen: false,
        textSr: isTomorrow ? `CLOSED · TOMORROW AT ${openH}H` : `CLOSED · ${dayLabelSr} AT ${openH}H`,
        textLat: isTomorrow ? `ZATVORENO · SUTRA U ${openH}H` : `ZATVORENO · ${dayLabelLat} U ${openH}H`,
      };
    }
  }

  // No working hours configured at all (defensive — shouldn't reach here in production)
  return { isOpen: false, textSr: "CLOSED", textLat: "ZATVORENO" };
}
