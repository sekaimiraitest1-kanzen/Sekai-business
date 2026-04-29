import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { todayKey, weekRange, monthRangeFromKey } from "@/lib/datetime";
import { TerminiClient } from "./termini-client";

export const dynamic = "force-dynamic";

export default async function TerminiPage({ searchParams }: { searchParams: { month?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const today = todayKey();
  const week = weekRange();
  const month = monthRangeFromKey(searchParams.month);

  const [todayRes, weekRes, monthRes, salonRes] = await Promise.all([
    sb
      .from("bookings")
      .select(
        "id, time_slot, status, surcharge_applied, notes, customers(id, name, phone, no_show_flag, no_show_count, created_at), services(name_sr, name_lat, duration_min, price)"
      )
      .eq("salon_id", session.salonId)
      .eq("date", today)
      .order("time_slot", { ascending: true }),
    sb
      .from("bookings")
      .select("id, date, time_slot, status, services(name_sr, duration_min)")
      .eq("salon_id", session.salonId)
      .gte("date", week.from)
      .lte("date", week.to)
      .in("status", ["confirmed", "pending", "done"]),
    sb
      .from("bookings")
      .select("date, status")
      .eq("salon_id", session.salonId)
      .gte("date", month.from)
      .lte("date", month.to)
      .in("status", ["confirmed", "pending", "done"]),
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
    />
  );
}
