import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { TerminiClient } from "./termini-client";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function weekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monOffset = (today.getDay() + 6) % 7;
  const mon = new Date(today);
  mon.setDate(today.getDate() - monOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: mon.toISOString().split("T")[0], to: sun.toISOString().split("T")[0] };
}
function monthRangeFromKey(key?: string) {
  const today = new Date();
  let year = today.getFullYear();
  let mo = today.getMonth();
  if (key && /^\d{4}-\d{2}$/.test(key)) {
    const [y, m] = key.split("-").map(Number);
    year = y;
    mo = m - 1;
  }
  const first = new Date(year, mo, 1);
  const last = new Date(year, mo + 1, 0);
  return {
    from: first.toISOString().split("T")[0],
    to: last.toISOString().split("T")[0],
    year,
    month: mo,
  };
}

export default async function TerminiPage({ searchParams }: { searchParams: { month?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const today = todayStr();
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
    />
  );
}
