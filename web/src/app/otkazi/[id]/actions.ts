"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBookingCancelToken } from "@/lib/booking/cancel-token";
import { isPastBelgrade, nowBelgrade } from "@/lib/datetime";
import { getResend, FROM_EMAIL } from "@/lib/email/client";

const LATE_CANCEL_HOURS = 2;

type Result =
  | { ok: true; wasLate: boolean; hoursUntil: number }
  | { ok: false; error: "INVALID_TOKEN" | "NOT_FOUND" | "ALREADY_INACTIVE" | "ALREADY_PAST" | "DB_FAILED" };

/**
 * Customer-facing cancel: token-gated, no auth. Called from /otkazi/[id]
 * with the HMAC token that was embedded in the booking confirmation email.
 *
 * Side effects:
 *   - status → 'cancelled', notes appended with timestamp + reason
 *   - if cancellation is < 2h before the slot, customer.no_show_flag is
 *     set + no_show_count incremented so the next booking automatically
 *     gets bookings.surcharge_applied=true (computed downstream in
 *     submitBooking)
 *   - Triša is notified by email (best-effort)
 *
 * Idempotent: re-clicking the link after the first cancel returns
 * ALREADY_INACTIVE without further side effects.
 */
export async function cancelBookingByToken(
  bookingId: string,
  token: string,
  reason?: string,
): Promise<Result> {
  if (!verifyBookingCancelToken(bookingId, token)) {
    return { ok: false, error: "INVALID_TOKEN" };
  }
  const sb = createAdminClient();

  const { data: booking } = await sb
    .from("bookings")
    .select("id, salon_id, customer_id, service_id, date, time_slot, status, notes, services(name_lat, price), customers(id, name, email, no_show_flag, no_show_count), salons(name, email)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "NOT_FOUND" };

  const status = booking.status as string;
  if (status !== "confirmed" && status !== "pending") {
    return { ok: false, error: "ALREADY_INACTIVE" };
  }

  const dateStr = booking.date as string;
  const timeStr = (booking.time_slot as string).slice(0, 5);
  if (isPastBelgrade(dateStr, timeStr)) {
    return { ok: false, error: "ALREADY_PAST" };
  }

  // Hours-until in Belgrade. Treat the slot date+time as a wall-clock moment
  // and diff against now-Belgrade.
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const [hh, mn] = timeStr.split(":").map(Number);
  const slotMs = new Date(yyyy, mm - 1, dd, hh, mn, 0, 0).getTime();
  const nowMs = nowBelgrade().getTime();
  const hoursUntil = (slotMs - nowMs) / (1000 * 60 * 60);
  const wasLate = hoursUntil < LATE_CANCEL_HOURS;

  const reasonText = (reason ?? "").trim().slice(0, 200) || null;
  const cancelNote = `[customer-cancel ${new Date().toISOString()} hoursUntil=${hoursUntil.toFixed(1)}${wasLate ? " LATE" : ""}${reasonText ? " reason=" + reasonText : ""}]`;
  const newNotes = booking.notes ? `${booking.notes}\n${cancelNote}` : cancelNote;

  const { error: updateErr } = await sb
    .from("bookings")
    .update({ status: "cancelled", notes: newNotes })
    .eq("id", bookingId);
  if (updateErr) return { ok: false, error: "DB_FAILED" };

  // Late cancel penalty: only flag if not already flagged (we don't want
  // to inflate no_show_count when the same customer cancels repeatedly
  // before completing a single booking).
  type CustomerJoin = { id?: string; name?: string; email?: string | null; no_show_flag?: boolean | null; no_show_count?: number | null } | { id?: string; name?: string; email?: string | null; no_show_flag?: boolean | null; no_show_count?: number | null }[] | null;
  const customer = (() => {
    const c = (booking as unknown as { customers: CustomerJoin }).customers;
    if (!c) return null;
    return Array.isArray(c) ? c[0] ?? null : c;
  })();
  if (wasLate && customer?.id && !customer.no_show_flag) {
    await sb
      .from("customers")
      .update({
        no_show_flag: true,
        no_show_count: (customer.no_show_count ?? 0) + 1,
      })
      .eq("id", customer.id);
  }

  revalidatePath("/admin/termini");

  // Notify Triša by email so she sees the cancellation immediately even
  // before opening the admin app. Best-effort — failure does not undo the
  // cancellation. Skips silently if salon has no email on file.
  type SalonJoin = { name?: string | null; email?: string | null } | { name?: string | null; email?: string | null }[] | null;
  const salon = (() => {
    const s = (booking as unknown as { salons: SalonJoin }).salons;
    if (!s) return null;
    return Array.isArray(s) ? s[0] ?? null : s;
  })();
  type ServiceJoin = { name_lat?: string | null; price?: number | null } | { name_lat?: string | null; price?: number | null }[] | null;
  const svc = (() => {
    const s = (booking as unknown as { services: ServiceJoin }).services;
    if (!s) return null;
    return Array.isArray(s) ? s[0] ?? null : s;
  })();
  if (salon?.email) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: `Berbernica Trisa <${FROM_EMAIL}>`,
        to: salon.email,
        subject: `Otkazan termin — ${customer?.name ?? "—"} · ${dateStr} u ${timeStr}${wasLate ? " (KASNO)" : ""}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #1A0F05; background: #FAF3E3; padding: 24px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .15em; color: ${wasLate ? "#cc2222" : "#5C3A22"};">
              ▸ ${wasLate ? "KASNO OTKAZIVANJE" : "OTKAZAN TERMIN"}
            </div>
            <h2 style="font-family: Georgia, serif; font-style: italic; margin: 16px 0;">${customer?.name ?? "—"}</h2>
            <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px; background: #F5E9D0; padding: 16px;">
              <tr><td style="color: #5C3A22; padding: 4px 0;">USLUGA</td><td style="text-align: right;">${svc?.name_lat ?? "—"}</td></tr>
              <tr><td style="color: #5C3A22; padding: 4px 0;">DATUM</td><td style="text-align: right;">${dateStr}</td></tr>
              <tr><td style="color: #5C3A22; padding: 4px 0;">VREME</td><td style="text-align: right;">${timeStr}</td></tr>
              <tr><td style="color: #5C3A22; padding: 4px 0;">DO TERMINA</td><td style="text-align: right;">${hoursUntil.toFixed(1)}h</td></tr>
              ${reasonText ? `<tr><td style="color: #5C3A22; padding: 4px 0;">RAZLOG</td><td style="text-align: right;">${reasonText}</td></tr>` : ""}
            </table>
            ${wasLate ? `
              <div style="background: rgba(204,34,34,.1); padding: 12px; margin-top: 12px; font-size: 12px; color: #5C3A22; line-height: 1.5;">
                ⚠ Otkazano je manje od 2h pre termina. Mušteriji je automatski markiran sledeći termin sa +30% doplatom.
              </div>
            ` : ""}
          </div>
        `,
      });
    } catch (e) {
      console.error("cancel notification email failed:", e instanceof Error ? e.message : "unknown");
    }
  }

  return { ok: true, wasLate, hoursUntil };
}
