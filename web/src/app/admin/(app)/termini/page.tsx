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

export default async function TerminiPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const today = todayStr();
  const { from, to } = weekRange();

  const [todayRes, weekRes] = await Promise.all([
    sb
      .from("bookings")
      .select("id, time_slot, status, surcharge_applied, notes, customers(name, phone, no_show_flag), services(name_sr, name_lat, duration_min, price)")
      .eq("salon_id", session.salonId)
      .eq("date", today)
      .order("time_slot", { ascending: true }),
    sb
      .from("bookings")
      .select("id, date, time_slot, status, services(name_sr, duration_min)")
      .eq("salon_id", session.salonId)
      .gte("date", from)
      .lte("date", to)
      .in("status", ["confirmed", "pending", "done"]),
  ]);

  return (
    <TerminiClient
      todayBookings={todayRes.data ?? []}
      weekBookings={weekRes.data ?? []}
      today={today}
      weekFrom={from}
      weekTo={to}
    />
  );
}
