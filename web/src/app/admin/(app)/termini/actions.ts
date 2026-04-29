"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

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
    await sb.from("customers").update({ last_visit_date: new Date().toISOString().split("T")[0] }).eq("id", booking.customer_id);
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
  if (error) return { ok: false as const, error: "BOOKING_FAILED" };

  revalidatePath("/admin/termini");
  return { ok: true as const };
}
