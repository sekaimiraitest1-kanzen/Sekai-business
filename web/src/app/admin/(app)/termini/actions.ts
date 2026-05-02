"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { todayKey } from "@/lib/datetime";
import { sendBookingConfirmation } from "@/lib/email/templates";
import { computeBlockedSlots, rangesOverlap, toMinutes, type Range } from "@/lib/booking/slots";

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

  const { data: booking, error: bErr } = await sb
    .from("bookings")
    .select("id, customer_id")
    .eq("id", bookingId)
    .eq("salon_id", session.salonId)
    .single();
  if (bErr || !booking) return { ok: false as const, error: "NOT_FOUND" };

  await sb.from("bookings").update({ status }).eq("id", bookingId);

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
  }

  revalidatePath("/admin/termini");
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

  // Upsert customer
  const { data: existing } = await sb
    .from("customers")
    .select("id")
    .eq("salon_id", session.salonId)
    .eq("phone", input.customerPhone)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: created } = await sb
      .from("customers")
      .insert({
        salon_id: session.salonId,
        phone: input.customerPhone,
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
    })
    .select("id")
    .single();
  if (error || !booking) {
    // Postgres unique-violation code 23505 (from migration 004 partial unique index).
    // Falls back to "BOOKING_FAILED" for any other failure.
    if ((error as { code?: string } | null)?.code === "23505") return { ok: false as const, error: "SLOT_TAKEN" };
    return { ok: false as const, error: "BOOKING_FAILED" };
  }

  // G3: send confirmation email if walk-in customer left an email. Best-effort.
  if (input.customerEmail) {
    try {
      const [{ data: svc }, { data: salon }] = await Promise.all([
        sb.from("services").select("name_lat, price").eq("id", input.serviceId).single(),
        sb.from("salons").select("address").eq("id", session.salonId).single(),
      ]);
      await sendBookingConfirmation({
        to: input.customerEmail,
        customerName: input.customerName,
        serviceName: svc?.name_lat ?? "—",
        date: input.date,
        timeSlot: input.timeSlot,
        price: svc?.price ?? 0,
        salonAddress: salon?.address ?? "",
        bookingId: booking.id,
      });
    } catch (e) {
      console.error("walk-in confirmation email failed:", e instanceof Error ? e.message : "unknown");
    }
  }

  revalidatePath("/admin/termini");
  return { ok: true as const };
}
