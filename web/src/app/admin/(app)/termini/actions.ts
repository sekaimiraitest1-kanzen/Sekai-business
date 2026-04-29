"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { todayKey } from "@/lib/datetime";

export async function getMyTakenSlots(date: string): Promise<string[]> {
  if (!date) return [];
  const session = await requireAdmin();
  const sb = createAdminClient();
  const [bookingsRes, blocksRes] = await Promise.all([
    sb
      .from("bookings")
      .select("time_slot")
      .eq("salon_id", session.salonId)
      .eq("date", date)
      .in("status", ["pending", "confirmed"]),
    // G5: include blocked_slots for this date. NULL time_slot = whole day blocked.
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", session.salonId)
      .eq("date", date),
  ]);
  const taken = new Set<string>();
  for (const r of bookingsRes.data ?? []) {
    taken.add((r.time_slot as string).slice(0, 5));
  }
  const wholeDayBlocked = (blocksRes.data ?? []).some((r) => r.time_slot === null);
  if (wholeDayBlocked) {
    // Sentinel: caller treats this as "no slots free at all". Returning the
    // canonical full set is wasteful; instead the booking-flow free-slot
    // generator checks blocks separately (next iteration). For now, mark
    // every 30-min slot 00:00-23:30 as taken to neutralize the day.
    for (let h = 0; h < 24; h++) {
      for (const m of ["00", "30"]) {
        taken.add(`${String(h).padStart(2, "0")}:${m}`);
      }
    }
  } else {
    for (const r of blocksRes.data ?? []) {
      if (r.time_slot) taken.add((r.time_slot as string).slice(0, 5));
    }
  }
  return Array.from(taken);
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
  serviceId: string;
  date: string;
  timeSlot: string;
  notes?: string;
}) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  // Slot conflict guard — public booking has the same check; walk-in must
  // not bypass it. Migration 004 adds a partial UNIQUE INDEX as a server-side
  // safety net for races; this app-level check gives a friendlier error.
  const { data: conflict } = await sb
    .from("bookings")
    .select("id")
    .eq("salon_id", session.salonId)
    .eq("date", input.date)
    .eq("time_slot", input.timeSlot)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  if (conflict) return { ok: false as const, error: "SLOT_TAKEN" };

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
      .insert({ salon_id: session.salonId, phone: input.customerPhone, name: input.customerName, utm_source: "walk-in" })
      .select("id")
      .single();
    customerId = created?.id;
  }
  if (!customerId) return { ok: false as const, error: "CUSTOMER_FAILED" };

  const { error } = await sb.from("bookings").insert({
    salon_id: session.salonId,
    customer_id: customerId,
    service_id: input.serviceId,
    date: input.date,
    time_slot: input.timeSlot,
    status: "confirmed",
    notes: input.notes ?? null,
    utm_source: "walk-in",
  });
  if (error) {
    // Postgres unique-violation code 23505 (from migration 004 partial unique index).
    // Falls back to "BOOKING_FAILED" for any other failure.
    if ((error as { code?: string }).code === "23505") return { ok: false as const, error: "SLOT_TAKEN" };
    return { ok: false as const, error: "BOOKING_FAILED" };
  }

  revalidatePath("/admin/termini");
  return { ok: true as const };
}
