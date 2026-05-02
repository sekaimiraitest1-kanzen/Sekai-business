/**
 * Slot conflict / overlap utilities — shared between public booking and admin
 * walk-in flows. Pure functions, no I/O.
 *
 * Why this exists: a booking of duration D starting at slot S occupies the
 * half-open interval [S, S+D). A new booking at S' with duration D' conflicts
 * iff its interval overlaps any busy interval. Picking only by exact start-time
 * match (the pre-fix behaviour) wrongly allowed a 90-min booking at 13:00 when
 * a 30-min booking already sat at 13:30 — they overlap from 13:30 to 14:00.
 */

export type Range = { startMin: number; durationMin: number };

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Half-open overlap test: back-to-back bookings (a ends exactly when b starts)
 * do NOT conflict.
 */
export function rangesOverlap(
  aStart: number, aDur: number,
  bStart: number, bDur: number,
): boolean {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

/**
 * Every grid-aligned (00 / 30) candidate start that would conflict with at
 * least one busy range, given a candidate booking of `durationMin` length.
 *
 * Returns string set of "HH:MM" — caller filters or greys these in the UI.
 */
export function computeBlockedSlots(durationMin: number, busy: Range[]): Set<string> {
  const out = new Set<string>();
  if (durationMin <= 0) return out;
  for (let m = 0; m < 24 * 60; m += 30) {
    if (busy.some((r) => rangesOverlap(m, durationMin, r.startMin, r.durationMin))) {
      out.add(fromMinutes(m));
    }
  }
  return out;
}
