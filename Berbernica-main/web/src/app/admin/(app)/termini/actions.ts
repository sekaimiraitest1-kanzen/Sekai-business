"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { isStaff } from "@/lib/auth/admin-session";
import { todayKey, isPastBelgrade } from "@/lib/datetime";
import { sendBookingConfirmation } from "@/lib/email/templates";
import { computeBlockedSlots, rangesOverlap, toMinutes, type Range } from "@/lib/booking/slots";
import { bookingCancelToken } from "@/lib/booking/cancel-token";
import { normalizePhone } from "@/lib/phone";
import { sendPushToSalon } from "@/lib/push/server";
import { sendOwnerNewBookingEmail } from "@/lib/email/templates";

/**
 * Returns every booking for a single date, in the same shape the TODAY
 * view uses, so the week-view calendar can drill into any day. Honors
 * staff-vs-owner scope (staff sees own + unassigned, owner sees all).
 */
export async function getDayBookings(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false as const, error: "INVALID_DATE" as const };
  }
  const session = await requireAdmin();
  const sb = createAdminClient();
  const staffMode = isStaff(session);
  const staffOr = staffMode
    ? `staff_id.is.null,staff_id.eq.${session.adminUserId}`
    : null;

  let q = sb
    .from("bookings")
    .select(
      "id, time_slot, status, surcharge_applied, notes, staff_id, staff:admin_users!bookings_staff_id_fkey(id, display_name), customers(id, name, phone, no_show_flag, no_show_count, created_at), services(name_sr, name_lat, duration_min, price)"
    )
    .eq("salon_id", session.salonId)
    .eq("date", date)
    .order("time_slot", { ascending: true });
  if (staffOr) q = q.or(staffOr);

  const { data, error } = await q;
  if (error) {
    console.error("[getDayBookings] failed:", error.message);
    return { ok: false as const, error: "DB_FAILED" as const };
  }
  return { ok: true as const, bookings: data ?? [] };
}

/**
 * Same semantics as the public `getTakenSlots`: returns every grid slot that
 * would conflict with an existing booking, an admin block, or a whole-day
 * block — accounting for the candidate service's duration so a 30-min booking
 * at 13:30 also blocks a 90-min candidate at 13:00.
 */
export async function getMyTakenSlots(date: string, durationMin: number): Promise<string[]> {
  if (!date || durationMin <= 0) return [];
  const session = await requireAdmin();
  const sb = createAdminClient();
  const [bookingsRes, blocksRes] = await Promise.all([
    sb
      .from("bookings")
      .select("time_slot, services!inner(duration_min)")
      .eq("salon_id", session.salonId)
      .eq("date", date)
      .in("status", ["pending", "confirmed"]),
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", session.salonId)
      .eq("date", date),
  ]);

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

type Status = "confirmed" | "done" | "no_show" | "cancelled" | "pending";

export async function updateBookingStatus(bookingId: string, status: Status) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const staffMode = isStaff(session);

  const { data: booking, error: bErr } = await sb
    .from("bookings")
    .select("id, customer_id, staff_id, surcharge_applied")
    .eq("id", bookingId)
    .eq("salon_id", session.salonId)
    .single();
  if (bErr || !booking) return { ok: false as const, error: "NOT_FOUND" };

  // Staff visibility scope: can only mutate unclaimed bookings or own.
  // Owner can mutate anything (no extra check needed).
  if (staffMode && booking.staff_id !== null && booking.staff_id !== session.adminUserId) {
    return { ok: false as const, error: "FORBIDDEN_NOT_YOURS" };
  }

  // Stamping rule: when a booking transitions to 'done', credit the user
  // who is finishing it — but only if it has no staff_id yet. If it's
  // already stamped (e.g. walk-in by Marko), don't overwrite. Owner
  // re-marking somebody else's done booking does NOT change the credit.
  const updates: Record<string, unknown> = { status };
  if (status === "done" && booking.staff_id === null) {
    updates.staff_id = session.adminUserId;
  }
  await sb.from("bookings").update(updates).eq("id", bookingId);

  if (status === "no_show" && booking.customer_id) {
    const { data: c } = await sb
      .from("customers")
      .select("no_show_count")
      .eq("id", booking.customer_id)
      .single();
    await sb
      .from("customers")
      .update({ no_show_count: (c?.no_show_count ?? 0) + 1, no_show_flag: true })
      .eq("id", booking.customer_id);
  }

  if (status === "done" && booking.customer_id) {
    await sb.from("customers").update({ last_visit_date: todayKey() }).eq("id", booking.customer_id);
    await sb.from("loyalty_events").insert({ salon_id: session.salonId, customer_id: booking.customer_id, event_type: "visit", points: 1 });
    // Penalty was actually paid — clear the flag so the next booking
    // returns to the base price. We only clear when this specific booking
    // was the surcharged one; otherwise an unrelated 'done' booking
    // (no surcharge applied) would forgive a separate outstanding flag.
    if (booking.surcharge_applied) {
      await sb.from("customers").update({ no_show_flag: false }).eq("id", booking.customer_id);
    }
  }

  revalidatePath("/admin/termini");
  return { ok: true as const };
}

/**
 * Permanently deletes a single cancelled (or no_show) booking.
 * Owner-only — staff cannot delete records.
 * Useful for removing test entries that would otherwise skew analytics.
 */
export async function deleteBooking(bookingId: string) {
  const session = await requireAdmin();
  if (isStaff(session)) return { ok: false as const, error: "FORBIDDEN" };

  const sb = createAdminClient();

  // Verify it exists, belongs to this salon, and is in a deletable state.
  const { data: booking, error: bErr } = await sb
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("salon_id", session.salonId)
    .single();
  if (bErr || !booking) return { ok: false as const, error: "NOT_FOUND" };
  if (!["cancelled", "no_show"].includes(booking.status)) {
    return { ok: false as const, error: "NOT_DELETABLE" };
  }

  await sb.from("bookings").delete().eq("id", bookingId);
  revalidatePath("/admin/termini");
  revalidatePath("/admin/statistike");
  return { ok: true as const };
}

/**
 * Deletes ALL cancelled bookings for this salon in one shot.
 * Owner-only. Used to clear test/junk data from analytics.
 */
export async function deleteAllCancelledBookings() {
  const session = await requireAdmin();
  if (isStaff(session)) return { ok: false as const, error: "FORBIDDEN" };

  const sb = createAdminClient();
  await sb
    .from("bookings")
    .delete()
    .eq("salon_id", session.salonId)
    .eq("status", "cancelled");

  revalidatePath("/admin/termini");
  revalidatePath("/admin/statistike");
  return { ok: true as const };
}

export async function clearNoShowFlag(customerId: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb
    .from("customers")
    .update({ no_show_flag: false })
    .eq("id", customerId)
    .eq("salon_id", session.salonId);
  revalidatePath("/admin/musterije");
  return { ok: true as const };
}

export async function createWalkInBooking(input: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  date: string;
  timeSlot: string;
  notes?: string;
}) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  // Reject past timestamps. Staff in the shop can still admin-enter past
  // dates (e.g. "logging yesterday's walk-in") but TODAY's past times are
  // typo-prone — better to fail loud.
  if (isPastBelgrade(input.date, input.timeSlot)) {
    return { ok: false as const, error: "TIME_PAST" };
  }

  // Slot conflict guard — duration-aware overlap. Public booking uses the
  // same logic; walk-in must not bypass it. Migration 004 adds a partial
  // UNIQUE INDEX as a server-side safety net for exact-match duplicates;
  // this app-level check additionally catches duration overlaps the index
  // can't see (e.g., a 30-min booking at 13:30 + walk-in 90-min at 13:00).
  const { data: requestedSvc } = await sb
    .from("services")
    .select("duration_min")
    .eq("id", input.serviceId)
    .maybeSingle();
  if (!requestedSvc) return { ok: false as const, error: "SERVICE_NOT_FOUND" };
  const reqStartMin = toMinutes(input.timeSlot);
  const reqDur = requestedSvc.duration_min as number;

  const [{ data: dayBookings }, { data: dayBlocks }] = await Promise.all([
    sb
      .from("bookings")
      .select("id, time_slot, services!inner(duration_min)")
      .eq("salon_id", session.salonId)
      .eq("date", input.date)
      .in("status", ["pending", "confirmed"]),
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", session.salonId)
      .eq("date", input.date),
  ]);

  if ((dayBlocks ?? []).some((b) => b.time_slot === null)) {
    return { ok: false as const, error: "SLOT_TAKEN" };
  }
  const overlapsBooking = (dayBookings ?? []).some((b) => {
    const svc = (b as unknown as { services: { duration_min: number } | { duration_min: number }[] }).services;
    const dur = Array.isArray(svc) ? svc[0]?.duration_min : svc?.duration_min;
    if (typeof dur !== "number") return false;
    return rangesOverlap(reqStartMin, reqDur, toMinutes((b.time_slot as string).slice(0, 5)), dur);
  });
  if (overlapsBooking) return { ok: false as const, error: "SLOT_TAKEN" };
  const overlapsBlock = (dayBlocks ?? []).some((b) => {
    if (!b.time_slot) return false;
    return rangesOverlap(reqStartMin, reqDur, toMinutes((b.time_slot as string).slice(0, 5)), 30);
  });
  if (overlapsBlock) return { ok: false as const, error: "SLOT_TAKEN" };

  // Canonicalize phone before any DB write so admin walk-ins land on the
  // same row as the customer's prior bookings/orders even if they typed
  // the number in a different format here.
  const phone = normalizePhone(input.customerPhone);

  // Upsert customer (skip soft-deleted — same phone walk-in after delete
  // creates a fresh row instead of reviving the removed one). We also pull
  // the no_show_flag here so the walk-in can apply the surcharge if the
  // customer earned it.
  const { data: existing } = await sb
    .from("customers")
    .select("id, no_show_flag")
    .eq("salon_id", session.salonId)
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: created } = await sb
      .from("customers")
      .insert({
        salon_id: session.salonId,
        phone,
        name: input.customerName,
        email: input.customerEmail || null,
        utm_source: "walk-in",
      })
      .select("id")
      .single();
    customerId = created?.id;
  } else if (input.customerEmail) {
    // Backfill email if customer has it now but didn't before.
    await sb.from("customers").update({ email: input.customerEmail }).eq("id", customerId);
  }
  if (!customerId) return { ok: false as const, error: "CUSTOMER_FAILED" };

  // When a staff member creates a walk-in, they're literally claiming the
  // customer at the chair right now — stamp staff_id immediately. Owner
  // walk-ins stay unassigned (Triša may pass the customer to staff later;
  // DONE click will stamp whoever finishes).
  const initialStaffId = isStaff(session) ? session.adminUserId : null;
  // Auto-apply +30% surcharge if this customer arrived with an unresolved
  // no_show_flag (from a previous late cancel or no-show). Triša can clear
  // the flag manually from the customer profile if she wants to forgive.
  const surchargeApplied = existing?.no_show_flag === true;

  const { data: booking, error } = await sb
    .from("bookings")
    .insert({
      salon_id: session.salonId,
      customer_id: customerId,
      service_id: input.serviceId,
      date: input.date,
      time_slot: input.timeSlot,
      status: "confirmed",
      notes: input.notes ?? null,
      utm_source: "walk-in",
      staff_id: initialStaffId,
      surcharge_applied: surchargeApplied,
    })
    .select("id")
    .single();
  if (error || !booking) {
    // Postgres unique-violation code 23505 (from migration 004 partial unique index).
    // Falls back to "BOOKING_FAILED" for any other failure.
    if ((error as { code?: string } | null)?.code === "23505") return { ok: false as const, error: "SLOT_TAKEN" };
    return { ok: false as const, error: "BOOKING_FAILED" };
  }

  // G3: notifications. Customer confirmation email (only if she gave one),
  // owner email (when a STAFF member created the walk-in — no need to email
  // the owner about her own walk-in), owner push (always — same logic, but
  // push is also useful for the owner across multiple devices).
  try {
    const [{ data: svc }, { data: salon }] = await Promise.all([
      sb.from("services").select("name_lat, price").eq("id", input.serviceId).single(),
      sb.from("salons").select("address, email").eq("id", session.salonId).single(),
    ]);
    const basePrice = svc?.price ?? 0;
    const finalPrice = surchargeApplied ? Math.round(basePrice * 1.3) : basePrice;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://berbernica-ruby.vercel.app";
    const isStaffCreated = isStaff(session);

    await Promise.allSettled([
      input.customerEmail
        ? sendBookingConfirmation({
            to: input.customerEmail,
            customerName: input.customerName,
            serviceName: svc?.name_lat ?? "—",
            date: input.date,
            timeSlot: input.timeSlot,
            price: finalPrice,
            basePrice,
            surchargeApplied,
            salonAddress: salon?.address ?? "",
            bookingId: booking.id,
            cancelUrl: `${baseUrl}/otkazi/${booking.id}?t=${bookingCancelToken(booking.id)}`,
          })
        : Promise.resolve(),
      isStaffCreated && salon?.email
        ? sendOwnerNewBookingEmail({
            to: salon.email,
            customerName: input.customerName,
            customerPhone: phone,
            serviceName: svc?.name_lat ?? "—",
            date: input.date,
            timeSlot: input.timeSlot,
            price: finalPrice,
            source: "WALK-IN",
          })
        : Promise.resolve(),
      sendPushToSalon(session.salonId, {
        title: `Walk-in · ${input.timeSlot}`,
        body: `${input.customerName} · ${svc?.name_lat ?? "—"} · ${input.date}`,
        url: "/admin/termini",
        tag: `booking-${booking.id}`,
      }),
    ]);
  } catch (e) {
    console.error("walk-in notify failed:", e instanceof Error ? e.message : "unknown");
  }

  revalidatePath("/admin/termini");
  return { ok: true as const };
}
