"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email/templates";

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
  const sb = createAdminClient();

  // 1. Upsert customer by (salon_id, phone)
  const { data: existingCustomer, error: lookupErr } = await sb
    .from("customers")
    .select("id, no_show_flag")
    .eq("salon_id", data.salonId)
    .eq("phone", data.phone)
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

  // 2. Verify slot is still free (race-condition guard)
  const { data: conflict } = await sb
    .from("bookings")
    .select("id")
    .eq("salon_id", data.salonId)
    .eq("date", data.date)
    .eq("time_slot", data.timeSlot)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

  if (conflict) return { ok: false as const, error: "SLOT_TAKEN" };

  // 3. Insert booking
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
    })
    .select("id")
    .single();

  if (bErr || !booking) {
    console.error("[submitBooking] booking insert failed:", bErr);
    return { ok: false as const, error: "BOOKING_CREATE_FAILED" };
  }

  // Send confirmation email (best-effort, don't block on failure)
  if (data.email) {
    try {
      const { data: svc } = await sb.from("services").select("name_lat").eq("id", data.serviceId).single();
      const { data: salon } = await sb.from("salons").select("address").eq("id", data.salonId).single();
      await sendBookingConfirmation({
        to: data.email,
        customerName: data.name,
        serviceName: svc?.name_lat ?? "—",
        date: data.date,
        timeSlot: data.timeSlot,
        price: 0, // could re-fetch service.price if needed
        salonAddress: salon?.address ?? "",
        bookingId: booking.id,
      });
    } catch (e) {
      // Log only the message — the error object may serialize customer email/name passed to sendBookingConfirmation.
      console.error("booking email failed:", e instanceof Error ? e.message : "unknown");
    }
  }

  return { ok: true as const, bookingId: booking.id, noShowFlag: existingCustomer?.no_show_flag ?? false };
}

export async function getTakenSlots(salonId: string, date: string): Promise<string[]> {
  if (!salonId || !date) return [];
  const sb = createAdminClient();
  const [bookingsRes, blocksRes] = await Promise.all([
    sb
      .from("bookings")
      .select("time_slot")
      .eq("salon_id", salonId)
      .eq("date", date)
      .in("status", ["pending", "confirmed"]),
    // G5: also exclude admin-blocked slots from public booking picker.
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", salonId)
      .eq("date", date),
  ]);
  const taken = new Set<string>();
  for (const r of bookingsRes.data ?? []) taken.add((r.time_slot as string).slice(0, 5));
  const wholeDayBlocked = (blocksRes.data ?? []).some((r) => r.time_slot === null);
  if (wholeDayBlocked) {
    for (let h = 0; h < 24; h++) {
      for (const m of ["00", "30"]) taken.add(`${String(h).padStart(2, "0")}:${m}`);
    }
  } else {
    for (const r of blocksRes.data ?? []) {
      if (r.time_slot) taken.add((r.time_slot as string).slice(0, 5));
    }
  }
  return Array.from(taken);
}
