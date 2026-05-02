"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email/templates";
import { computeBlockedSlots, rangesOverlap, toMinutes, type Range } from "@/lib/booking/slots";
import { isPastBelgrade } from "@/lib/datetime";
import { bookingCancelToken } from "@/lib/booking/cancel-token";

const bookingSchema = z.object({
  salonId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
  serviceId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  // Empty string OK; otherwise must look like a real email. We don't reject
  // weird-but-passing inputs — booking shouldn't fail because of email format.
  email: z.string().trim().optional().transform((v) => v ?? ""),
  utmSource: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export async function submitBooking(input: BookingInput) {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[submitBooking] validation failed:", parsed.error.flatten());
    return { ok: false as const, error: "INVALID_INPUT" };
  }
  const data = parsed.data;

  // Reject any attempt to book a slot whose start moment is already past
  // in Belgrade time. The picker filters this client-side; this is the
  // server backstop for stale tabs and direct API calls.
  if (isPastBelgrade(data.date, data.timeSlot)) {
    return { ok: false as const, error: "TIME_PAST" };
  }

  const sb = createAdminClient();

  // 1. Upsert customer by (salon_id, phone). Soft-deleted rows are treated
  //    as fresh — same phone re-booking creates a new customer instead of
  //    resurrecting one Triša explicitly removed.
  const { data: existingCustomer, error: lookupErr } = await sb
    .from("customers")
    .select("id, no_show_flag")
    .eq("salon_id", data.salonId)
    .eq("phone", data.phone)
    .is("deleted_at", null)
    .maybeSingle();

  if (lookupErr) {
    console.error("[submitBooking] customer lookup failed:", lookupErr);
  }

  let customerId = existingCustomer?.id as string | undefined;
  if (!customerId) {
    const { data: created, error: cErr } = await sb
      .from("customers")
      .insert({
        salon_id: data.salonId,
        phone: data.phone,
        name: data.name,
        email: data.email || null,
        utm_source: data.utmSource ?? "direct",
      })
      .select("id")
      .single();
    if (cErr || !created) {
      console.error("[submitBooking] customer create failed:", cErr);
      return { ok: false as const, error: "CUSTOMER_CREATE_FAILED" };
    }
    customerId = created.id;
  } else {
    // update name/email if previously empty
    await sb
      .from("customers")
      .update({ name: data.name, email: data.email || null })
      .eq("id", customerId);
  }

  // 2. Verify slot is still free, accounting for service duration overlap.
  //    A 90-min booking at 13:00 must not be accepted when a 30-min booking
  //    already sits at 13:30 — even though `time_slot` differs, the intervals
  //    overlap. Same reasoning for 30-min admin-blocked slots.
  const { data: requestedSvc } = await sb
    .from("services")
    .select("duration_min")
    .eq("id", data.serviceId)
    .maybeSingle();
  if (!requestedSvc) return { ok: false as const, error: "SERVICE_NOT_FOUND" };

  const reqStartMin = toMinutes(data.timeSlot);
  const reqDur = requestedSvc.duration_min as number;

  const [{ data: dayBookings }, { data: dayBlocks }] = await Promise.all([
    sb
      .from("bookings")
      .select("id, time_slot, services!inner(duration_min)")
      .eq("salon_id", data.salonId)
      .eq("date", data.date)
      .in("status", ["pending", "confirmed"]),
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", data.salonId)
      .eq("date", data.date),
  ]);

  if ((dayBlocks ?? []).some((b) => b.time_slot === null)) {
    return { ok: false as const, error: "SLOT_TAKEN" };
  }

  const overlapsBooking = (dayBookings ?? []).some((b) => {
    const svc = (b as unknown as { services: { duration_min: number } | { duration_min: number }[] }).services;
    const dur = Array.isArray(svc) ? svc[0]?.duration_min : svc?.duration_min;
    if (typeof dur !== "number") return false;
    const bStart = toMinutes((b.time_slot as string).slice(0, 5));
    return rangesOverlap(reqStartMin, reqDur, bStart, dur);
  });
  if (overlapsBooking) return { ok: false as const, error: "SLOT_TAKEN" };

  const overlapsBlock = (dayBlocks ?? []).some((b) => {
    if (!b.time_slot) return false;
    const bStart = toMinutes((b.time_slot as string).slice(0, 5));
    return rangesOverlap(reqStartMin, reqDur, bStart, 30);
  });
  if (overlapsBlock) return { ok: false as const, error: "SLOT_TAKEN" };

  // 3. Insert booking. surcharge_applied is set if the customer has an
  //    active no_show_flag from a previous late cancel / no-show — the
  //    next booking automatically gets +30% (visible to the customer in
  //    the confirmation email and the success screen). Flag is cleared
  //    once this surcharged booking is marked 'done' so the penalty
  //    can't double-charge.
  const surchargeApplied = existingCustomer?.no_show_flag === true;

  const { data: booking, error: bErr } = await sb
    .from("bookings")
    .insert({
      salon_id: data.salonId,
      customer_id: customerId,
      service_id: data.serviceId,
      date: data.date,
      time_slot: data.timeSlot,
      status: "confirmed",
      utm_source: data.utmSource ?? "direct",
      surcharge_applied: surchargeApplied,
    })
    .select("id")
    .single();

  if (bErr || !booking) {
    console.error("[submitBooking] booking insert failed:", bErr);
    return { ok: false as const, error: "BOOKING_CREATE_FAILED" };
  }

  // Send confirmation email (best-effort, don't block on failure). Pulls
  // the actual service price + applies the 30% surcharge if it was set
  // above, and embeds the cancel-link token so the customer can self-cancel
  // straight from the email.
  if (data.email) {
    try {
      const { data: svc } = await sb.from("services").select("name_lat, price").eq("id", data.serviceId).single();
      const { data: salon } = await sb.from("salons").select("address").eq("id", data.salonId).single();
      const basePrice = svc?.price ?? 0;
      const finalPrice = surchargeApplied ? Math.round(basePrice * 1.3) : basePrice;
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://berbernica-ruby.vercel.app";
      await sendBookingConfirmation({
        to: data.email,
        customerName: data.name,
        serviceName: svc?.name_lat ?? "—",
        date: data.date,
        timeSlot: data.timeSlot,
        price: finalPrice,
        basePrice,
        surchargeApplied,
        salonAddress: salon?.address ?? "",
        bookingId: booking.id,
        cancelUrl: `${baseUrl}/otkazi/${booking.id}?t=${bookingCancelToken(booking.id)}`,
      });
    } catch (e) {
      // Log only the message — the error object may serialize customer email/name passed to sendBookingConfirmation.
      console.error("booking email failed:", e instanceof Error ? e.message : "unknown");
    }
  }

  return {
    ok: true as const,
    bookingId: booking.id,
    noShowFlag: existingCustomer?.no_show_flag ?? false,
    surchargeApplied,
  };
}

/**
 * Light read-only helper called from the booking flow once the customer
 * types their phone number, so we can warn them BEFORE they submit that a
 * 30% surcharge will apply (because of a prior late cancel / no-show).
 * Returns just the bare flag — no PII beyond what the customer already
 * gave us.
 */
export async function checkCustomerFlag(salonId: string, phone: string): Promise<{ flagged: boolean }> {
  if (!salonId || !phone || phone.trim().length < 6) return { flagged: false };
  const sb = createAdminClient();
  const { data } = await sb
    .from("customers")
    .select("no_show_flag")
    .eq("salon_id", salonId)
    .eq("phone", phone.trim())
    .is("deleted_at", null)
    .maybeSingle();
  return { flagged: data?.no_show_flag === true };
}

/**
 * Returns every grid slot ("HH:MM") that the picker should mark unavailable,
 * given the candidate service's duration. Considers BOTH:
 *   - existing bookings' duration (so a 30-min booking at 13:30 also blocks
 *     a 90-min candidate at 13:00, since their intervals overlap)
 *   - admin-blocked 30-min slots
 *   - whole-day blocks (every grid cell)
 */
export async function getTakenSlots(
  salonId: string,
  date: string,
  durationMin: number,
): Promise<string[]> {
  if (!salonId || !date || durationMin <= 0) return [];
  const sb = createAdminClient();
  const [bookingsRes, blocksRes] = await Promise.all([
    sb
      .from("bookings")
      .select("time_slot, services!inner(duration_min)")
      .eq("salon_id", salonId)
      .eq("date", date)
      .in("status", ["pending", "confirmed"]),
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", salonId)
      .eq("date", date),
  ]);

  // Whole-day block: every grid cell is unavailable, no overlap math needed.
  if ((blocksRes.data ?? []).some((r) => r.time_slot === null)) {
    const all: string[] = [];
    for (let h = 0; h < 24; h++) for (const m of ["00", "30"]) all.push(`${String(h).padStart(2, "0")}:${m}`);
    return all;
  }

  const busy: Range[] = [];
  for (const b of bookingsRes.data ?? []) {
    const ts = b.time_slot as string;
    const svc = (b as unknown as { services: { duration_min: number } | { duration_min: number }[] }).services;
    const dur = Array.isArray(svc) ? svc[0]?.duration_min : svc?.duration_min;
    if (typeof dur === "number") {
      busy.push({ startMin: toMinutes(ts.slice(0, 5)), durationMin: dur });
    }
  }
  for (const r of blocksRes.data ?? []) {
    if (r.time_slot) busy.push({ startMin: toMinutes((r.time_slot as string).slice(0, 5)), durationMin: 30 });
  }

  return Array.from(computeBlockedSlots(durationMin, busy));
}
