"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation, sendOwnerNewBookingEmail } from "@/lib/email/templates";
import { computeBlockedSlots, rangesOverlap, toMinutes, type Range } from "@/lib/booking/slots";
import { isPastBelgrade } from "@/lib/datetime";
import { bookingCancelToken } from "@/lib/booking/cancel-token";
import { normalizePhone } from "@/lib/phone";
import { sendPushToSalon } from "@/lib/push/server";

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

  // Canonicalize phone before any DB write so the same human shows up
  // as one customer across booking + shop. See src/lib/phone.ts.
  const phone = normalizePhone(data.phone);

  // 1. Upsert customer by (salon_id, phone). Soft-deleted rows are treated
  //    as fresh — same phone re-booking creates a new customer instead of
  //    resurrecting one Triša explicitly removed.
  const { data: existingCustomer, error: lookupErr } = await sb
    .from("customers")
    .select("id, no_show_flag, loyalty_pending_reward")
    .eq("salon_id", data.salonId)
    .eq("phone", phone)
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
        phone,
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

  // 3. Insert booking. Two rewards/penalties may apply:
  //    - surcharge_applied (no-show / late-cancel penalty +30%)
  //    - is_loyalty_redeem (6th-cut free reward, customer pre-chose this)
  //    Free cut wins outright over surcharge — the loyalty reward overrides
  //    the penalty for THIS booking, both flags get cleared, and the
  //    customer starts fresh. Surcharge resurfaces only if they trigger
  //    another late-cancel / no-show after this point.
  const isLoyaltyRedeem = existingCustomer?.loyalty_pending_reward === "free_cut";
  const surchargeApplied = !isLoyaltyRedeem && existingCustomer?.no_show_flag === true;

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
      is_loyalty_redeem: isLoyaltyRedeem,
    })
    .select("id")
    .single();

  if (bErr || !booking) {
    console.error("[submitBooking] booking insert failed:", bErr);
    return { ok: false as const, error: "BOOKING_CREATE_FAILED" };
  }

  // Consume the loyalty reward immediately so it can't be double-spent on
  // a parallel session, and clear the no-show flag too if the redemption
  // overrode it. Done after a successful booking insert so the customer
  // doesn't lose their reward to a transient DB failure.
  if (customerId && (isLoyaltyRedeem || surchargeApplied)) {
    const updates: Record<string, unknown> = {};
    if (isLoyaltyRedeem) {
      updates.loyalty_pending_reward = null;
      // Free cut also forgives the no-show flag — clean slate.
      updates.no_show_flag = false;
    }
    await sb.from("customers").update(updates).eq("id", customerId);
  }

  // Notifications: customer confirmation email (if she gave one), owner
  // email (always), owner push (always — fan-out across every device the
  // owner subscribed). All three are best-effort; nothing here may throw
  // upward — the booking is already in DB and must surface as success.
  try {
    const [{ data: svc }, { data: salon }] = await Promise.all([
      sb.from("services").select("name_lat, price").eq("id", data.serviceId).single(),
      sb.from("salons").select("address, email").eq("id", data.salonId).single(),
    ]);
    const basePrice = svc?.price ?? 0;
    const finalPrice = isLoyaltyRedeem
      ? 0
      : surchargeApplied ? Math.round(basePrice * 1.3) : basePrice;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sekai-business.vercel.app";

    const channels: { name: string; run: () => Promise<unknown> }[] = [
      {
        name: "customer-email",
        run: () =>
          data.email
            ? sendBookingConfirmation({
                to: data.email,
                customerName: data.name,
                serviceName: svc?.name_lat ?? "—",
                date: data.date,
                timeSlot: data.timeSlot,
                price: finalPrice,
                basePrice,
                surchargeApplied,
                loyaltyFreeCut: isLoyaltyRedeem,
                salonAddress: salon?.address ?? "",
                bookingId: booking.id,
                cancelUrl: `${baseUrl}/otkazi/${booking.id}?t=${bookingCancelToken(booking.id)}`,
              })
            : Promise.resolve(),
      },
      {
        name: "owner-email",
        run: () =>
          salon?.email
            ? sendOwnerNewBookingEmail({
                to: salon.email,
                customerName: data.name,
                customerPhone: phone,
                serviceName: svc?.name_lat ?? "—",
                date: data.date,
                timeSlot: data.timeSlot,
                price: finalPrice,
                source: "WEB",
              })
            : Promise.resolve(),
      },
      {
        name: "owner-push",
        run: () =>
          sendPushToSalon(data.salonId, {
            title: `Nov termin · ${data.timeSlot}`,
            body: `${data.name} · ${svc?.name_lat ?? "—"} · ${data.date}`,
            url: "/admin/termini",
            tag: `booking-${booking.id}`,
          }),
      },
    ];
    // Surface per-channel failures in Vercel logs so silent rejections
    // (Resend sandbox 403, expired push subscription, etc.) don't keep
    // hiding under Promise.allSettled.
    const results = await Promise.allSettled(channels.map((c) => c.run()));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const err = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error(`[booking ${booking.id}] ${channels[i].name} failed:`, err);
      }
    });
  } catch (e) {
    console.error("booking notify failed:", e instanceof Error ? e.message : "unknown");
  }

  return {
    ok: true as const,
    bookingId: booking.id,
    noShowFlag: existingCustomer?.no_show_flag ?? false,
    surchargeApplied,
    loyaltyFreeCut: isLoyaltyRedeem,
  };
}

/**
 * Light read-only helper called from the booking flow once the customer
 * types their phone number, so we can warn / reward them BEFORE they
 * submit. Returns:
 *   - flagged: true if no-show / late-cancel penalty (+30%) will apply
 *   - loyaltyReward: 'free_cut' if the next booking is free, else null
 *
 * No PII beyond what the customer already supplied.
 */
export async function checkCustomerFlag(salonId: string, phone: string): Promise<{ flagged: boolean; loyaltyReward: "free_cut" | null }> {
  if (!salonId || !phone || phone.trim().length < 6) return { flagged: false, loyaltyReward: null };
  const sb = createAdminClient();
  const { data } = await sb
    .from("customers")
    .select("no_show_flag, loyalty_pending_reward")
    .eq("salon_id", salonId)
    .eq("phone", phone.trim())
    .is("deleted_at", null)
    .maybeSingle();
  const reward = data?.loyalty_pending_reward === "free_cut" ? "free_cut" : null;
  // Free cut overrides the surcharge for the next booking.
  return { flagged: !reward && data?.no_show_flag === true, loyaltyReward: reward };
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
