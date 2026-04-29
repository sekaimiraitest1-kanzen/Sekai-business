"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmation } from "@/lib/email/templates";

const bookingSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  utmSource: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export async function submitBooking(input: BookingInput) {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "INVALID_INPUT" };
  }
  const data = parsed.data;
  const sb = createAdminClient();

  // 1. Upsert customer by (salon_id, phone)
  const { data: existingCustomer } = await sb
    .from("customers")
    .select("id, no_show_flag")
    .eq("salon_id", data.salonId)
    .eq("phone", data.phone)
    .maybeSingle();

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
    if (cErr || !created) return { ok: false as const, error: "CUSTOMER_CREATE_FAILED" };
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

  if (bErr || !booking) return { ok: false as const, error: "BOOKING_CREATE_FAILED" };

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
      console.error("booking email failed", e);
    }
  }

  return { ok: true as const, bookingId: booking.id, noShowFlag: existingCustomer?.no_show_flag ?? false };
}

export async function getTakenSlots(salonId: string, date: string): Promise<string[]> {
  if (!salonId || !date) return [];
  const sb = createAdminClient();
  const { data } = await sb
    .from("bookings")
    .select("time_slot")
    .eq("salon_id", salonId)
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);
  return (data ?? []).map((r: { time_slot: string }) => r.time_slot.slice(0, 5));
}
