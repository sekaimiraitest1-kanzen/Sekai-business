import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { isStaff } from "@/lib/auth/admin-session";
import { todayKey, weekRange, monthRangeFromKey } from "@/lib/datetime";
import { TerminiClient } from "./termini-client";

export const dynamic = "force-dynamic";

export default async function TerminiPage({ searchParams }: { searchParams: { month?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const staffMode = isStaff(session);
  // Staff scope: see own bookings + every unclaimed booking. The "decide in
  // person" workflow needs both — claimed (DONE-stamped) jobs are private to
  // whoever finished them, but the live queue must be visible to every barber
  // so they can pick up next customer.
  const staffOr = staffMode ? `staff_id.is.null,staff_id.eq.${session.adminUserId}` : null;

  const today = todayKey();
  const week = weekRange();
  const month = monthRangeFromKey(searchParams.month);

  // staff_id + assignee display_name fetched on every booking-list query
  // so the client can label each card with the assigned barber (or "—" /
  // "Slobodno" for null).
  let todayQ = sb
    .from("bookings")
    .select(
      "id, time_slot, status, surcharge_applied, notes, staff_id, staff:admin_users!bookings_staff_id_fkey(id, display_name), customers(id, name, phone, no_show_flag, no_show_count, created_at), services(name_sr, name_lat, duration_min, price)"
    )
    .eq("salon_id", session.salonId)
    .eq("date", today)
    .order("time_slot", { ascending: true });
  if (staffOr) todayQ = todayQ.or(staffOr);

  let weekQ = sb
    .from("bookings")
    .select("id, date, time_slot, status, staff_id, services(name_sr, duration_min)")
    .eq("salon_id", session.salonId)
    .gte("date", week.from)
    .lte("date", week.to)
    .in("status", ["confirmed", "pending", "done"]);
  if (staffOr) weekQ = weekQ.or(staffOr);

  let monthQ = sb
    .from("bookings")
    .select("date, status, staff_id")
    .eq("salon_id", session.salonId)
    .gte("date", month.from)
    .lte("date", month.to)
    .in("status", ["confirmed", "pending", "done"]);
  if (staffOr) monthQ = monthQ.or(staffOr);

  const [todayRes, weekRes, monthRes, salonRes] = await Promise.all([
    todayQ,
    weekQ,
    monthQ,
    sb.from("salons").select("working_hours").eq("id", session.salonId).single(),
  ]);

  // H3: real visit count per customer who has a booking today. We query
  // historical `done` bookings for these customers and count per id, then
  // pass the map to the client so the detail sheet can render an accurate
  // "1. пут / 2. пут" hint instead of leaning on no_show_count as a proxy.
  type TodayBookingShape = {
    customers?: { id?: string | null } | { id?: string | null }[] | null;
  };
  const customerIds = Array.from(
    new Set(
      ((todayRes.data ?? []) as TodayBookingShape[])
        .map((b) => {
          const c = b.customers;
          if (!c) return null;
          const single = Array.isArray(c) ? c[0] : c;
          return single?.id ?? null;
        })
        .filter((id): id is string => !!id)
    )
  );
  const visitCounts: Record<string, number> = {};
  if (customerIds.length > 0) {
    const { data: history } = await sb
      .from("bookings")
      .select("customer_id, status")
      .eq("salon_id", session.salonId)
      .in("customer_id", customerIds)
      .eq("status", "done");
    for (const row of history ?? []) {
      const id = row.customer_id as string;
      visitCounts[id] = (visitCounts[id] ?? 0) + 1;
    }
  }

  return (
    <TerminiClient
      todayBookings={todayRes.data ?? []}
      weekBookings={weekRes.data ?? []}
      monthBookings={monthRes.data ?? []}
      today={today}
      weekFrom={week.from}
      weekTo={week.to}
      monthFrom={month.from}
      workingHours={salonRes.data?.working_hours ?? null}
      visitCounts={visitCounts}
      currentUserId={session.adminUserId}
      isStaffView={staffMode}
    />
  );
}
