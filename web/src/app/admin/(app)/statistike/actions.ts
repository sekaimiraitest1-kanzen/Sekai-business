"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { isStaff } from "@/lib/auth/admin-session";
import { periodRange, formatDateKey } from "@/lib/datetime";

const fmt = formatDateKey;

export async function getDoneBookingsDetail(period: "day" | "week" | "month") {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const staffMode = isStaff(session);
  const { from, to } = periodRange(period);

  let q = sb
    .from("bookings")
    .select("id, date, time_slot, customers(name, phone), services(name_sr, name_lat, price)")
    .eq("salon_id", session.salonId)
    .eq("status", "done")
    .gte("date", fmt(from))
    .lte("date", fmt(to))
    .order("date", { ascending: false })
    .order("time_slot", { ascending: false });

  if (staffMode) q = (q as typeof q).eq("staff_id", session.adminUserId);

  const { data, error } = await q;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, bookings: data ?? [] };
}

export async function getNewCustomersDetail(period: "day" | "week" | "month") {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { from, to } = periodRange(period);

  const { data, error } = await sb
    .from("customers")
    .select("id, name, phone, created_at, utm_source")
    .eq("salon_id", session.salonId)
    .is("deleted_at", null)
    .gte("created_at", from.toISOString())
    .lte("created_at", new Date(to.getTime() + 86400000).toISOString())
    .order("created_at", { ascending: false });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, customers: data ?? [] };
}

export async function getCancelledBookingsDetail(period: "day" | "week" | "month") {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { from, to } = periodRange(period);

  const { data, error } = await sb
    .from("bookings")
    .select("id, date, time_slot, customers(name, phone), services(name_sr, name_lat, price)")
    .eq("salon_id", session.salonId)
    .eq("status", "cancelled")
    .gte("date", fmt(from))
    .lte("date", fmt(to))
    .order("date", { ascending: false })
    .order("time_slot", { ascending: false });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, bookings: data ?? [], isOwner: !isStaff(session) };
}

export async function deleteBookingFromStats(bookingId: string) {
  const session = await requireAdmin();
  if (isStaff(session)) return { ok: false as const, error: "FORBIDDEN" };

  const sb = createAdminClient();
  const { data: booking } = await sb
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("salon_id", session.salonId)
    .single();

  if (!booking || booking.status !== "cancelled") return { ok: false as const, error: "NOT_DELETABLE" };

  await sb.from("bookings").delete().eq("id", bookingId);
  return { ok: true as const };
}

export async function deleteAllCancelledInPeriod(period: "day" | "week" | "month") {
  const session = await requireAdmin();
  if (isStaff(session)) return { ok: false as const, error: "FORBIDDEN" };

  const sb = createAdminClient();
  const { from, to } = periodRange(period);

  await sb
    .from("bookings")
    .delete()
    .eq("salon_id", session.salonId)
    .eq("status", "cancelled")
    .gte("date", fmt(from))
    .lte("date", fmt(to));

  return { ok: true as const };
}
