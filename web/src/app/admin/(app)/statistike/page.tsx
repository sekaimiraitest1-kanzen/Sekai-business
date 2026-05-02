import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { isStaff } from "@/lib/auth/admin-session";
import { periodRange, previousRange, formatDateKey, todayKey, nowBelgrade } from "@/lib/datetime";
import { StatistikeClient } from "./statistike-client";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month";

const fmt = formatDateKey;

export default async function StatistikePage({ searchParams }: { searchParams: { period?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const staffMode = isStaff(session);

  const period: Period = searchParams.period === "day" ? "day" : searchParams.period === "month" ? "month" : "week";

  const cur = periodRange(period);
  const prev = previousRange(period, cur);

  // For staff: scope every booking aggregate by `staff_id = me`. Only their
  // own completions count toward "moja zarada" / "moji termini".
  let curBookingsQ = sb.from("bookings")
    .select("status, date, time_slot, staff_id, services(name_sr, name_lat, price)")
    .eq("salon_id", session.salonId)
    .gte("date", fmt(cur.from)).lte("date", fmt(cur.to));
  let prevBookingsQ = sb.from("bookings")
    .select("status, staff_id, services(price)")
    .eq("salon_id", session.salonId)
    .gte("date", fmt(prev.from)).lte("date", fmt(prev.to));
  if (staffMode) {
    curBookingsQ = curBookingsQ.eq("staff_id", session.adminUserId);
    prevBookingsQ = prevBookingsQ.eq("staff_id", session.adminUserId);
  }

  const [curBookings, prevBookings, newCustomers, allCustomers, orders] = await Promise.all([
    curBookingsQ,
    prevBookingsQ,
    sb.from("customers")
      .select("id")
      .eq("salon_id", session.salonId)
      .gte("created_at", cur.from.toISOString())
      .lte("created_at", new Date(cur.to.getTime() + 86400000).toISOString()),
    sb.from("customers").select("id, last_visit_date").eq("salon_id", session.salonId),
    sb.from("orders").select("total, status, created_at").eq("salon_id", session.salonId)
      .gte("created_at", cur.from.toISOString())
      .lte("created_at", new Date(cur.to.getTime() + 86400000).toISOString()),
  ]);

  // Owner-only: per-staff revenue breakdown for the current period. Lets
  // Triša see "I made 60K, Marko made 45K this week" at a glance. Only
  // computed when role is owner — staff already see their own number.
  let staffBreakdown: { id: string; display_name: string; revenue: number; count: number }[] | null = null;
  if (!staffMode) {
    const [bookingsForBreakdown, staffRows] = await Promise.all([
      sb.from("bookings")
        .select("staff_id, services(price)")
        .eq("salon_id", session.salonId)
        .eq("status", "done")
        .not("staff_id", "is", null)
        .gte("date", fmt(cur.from)).lte("date", fmt(cur.to)),
      sb.from("admin_users")
        .select("id, display_name")
        .eq("salon_id", session.salonId),
    ]);
    const idToName = new Map<string, string>(
      (staffRows.data ?? []).map((r) => [r.id as string, (r.display_name as string) ?? "—"])
    );
    const agg = new Map<string, { revenue: number; count: number }>();
    type BR = { staff_id: string | null; services: { price?: number | null } | { price?: number | null }[] | null };
    for (const b of (bookingsForBreakdown.data ?? []) as BR[]) {
      if (!b.staff_id) continue;
      const svc = b.services;
      const p = (Array.isArray(svc) ? svc[0]?.price : svc?.price) ?? 0;
      const cur = agg.get(b.staff_id) ?? { revenue: 0, count: 0 };
      cur.revenue += p;
      cur.count += 1;
      agg.set(b.staff_id, cur);
    }
    staffBreakdown = Array.from(agg.entries())
      .map(([id, v]) => ({ id, display_name: idToName.get(id) ?? "—", revenue: v.revenue, count: v.count }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  const bookings = curBookings.data ?? [];
  const prevB = prevBookings.data ?? [];
  const newCust = newCustomers.data ?? [];
  const allCust = allCustomers.data ?? [];
  const ordersData = orders.data ?? [];

  const priceOf = (b: { services?: { price?: number | null } | { price?: number | null }[] | null }): number => {
    const s = b.services as { price?: number | null } | { price?: number | null }[] | null;
    if (!s) return 0;
    if (Array.isArray(s)) return s[0]?.price ?? 0;
    return s.price ?? 0;
  };

  const doneBookings = bookings.filter((b) => b.status === "done");
  const revenueBookings = doneBookings.reduce((sum, b) => sum + priceOf(b), 0);
  const revenueOrders = ordersData.filter((o) => o.status === "picked_up").reduce((s, o) => s + (o.total ?? 0), 0);
  const totalRevenue = revenueBookings + revenueOrders;

  const prevRevenue = prevB.filter((b) => b.status === "done").reduce((s, b) => s + priceOf(b), 0);
  const change = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  const bookingsCount = bookings.length;
  const doneCount = doneBookings.length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled" || b.status === "no_show").length;
  const cancelledPct = bookingsCount ? Math.round((cancelledCount / bookingsCount) * 100) : 0;
  const avgPerBooking = doneCount ? Math.round(revenueBookings / doneCount) : 0;

  // daily revenue map for bar chart
  const dailyRevenue: Record<string, number> = {};
  for (const b of doneBookings) {
    const k = b.date as string;
    dailyRevenue[k] = (dailyRevenue[k] ?? 0) + priceOf(b);
  }

  // build bar chart series — array of { label, value, key, isToday }
  const series: { label: string; value: number; key: string; isToday: boolean }[] = [];
  const labelsSr = ["ПОН", "УТО", "СРЕ", "ЧЕТ", "ПЕТ", "СУБ", "НЕД"];
  const todayKeyStr = todayKey();

  if (period === "day") {
    // hourly buckets 09–20
    for (let h = 9; h <= 20; h++) {
      const label = String(h).padStart(2, "0");
      const value = doneBookings
        .filter((b) => parseInt((b.time_slot ?? "00:00").slice(0, 2)) === h)
        .reduce((s, b) => s + priceOf(b), 0);
      series.push({ label, value, key: `h${h}`, isToday: false });
    }
  } else if (period === "week") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur.from);
      d.setDate(cur.from.getDate() + i);
      const k = fmt(d);
      series.push({ label: labelsSr[i], value: dailyRevenue[k] ?? 0, key: k, isToday: k === todayKeyStr });
    }
  } else {
    const days = (cur.to.getDate() - cur.from.getDate()) + 1;
    for (let i = 0; i < days; i++) {
      const d = new Date(cur.from);
      d.setDate(cur.from.getDate() + i);
      const k = fmt(d);
      series.push({ label: String(d.getDate()), value: dailyRevenue[k] ?? 0, key: k, isToday: k === todayKeyStr });
    }
  }

  // top services (by booking count, with total revenue)
  const serviceMap = new Map<string, { name_sr: string; name_lat: string; count: number; revenue: number }>();
  for (const b of doneBookings) {
    const svc = b.services as { name_sr?: string | null; name_lat?: string | null; price?: number | null } | null;
    if (!svc) continue;
    const key = svc.name_lat ?? "?";
    const cur = serviceMap.get(key);
    if (cur) {
      cur.count += 1;
      cur.revenue += svc.price ?? 0;
    } else {
      serviceMap.set(key, { name_sr: svc.name_sr ?? key, name_lat: svc.name_lat ?? key, count: 1, revenue: svc.price ?? 0 });
    }
  }
  const topServices = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  // retention (across all customers, not period-bound)
  const today = nowBelgrade();
  const atRisk = allCust.filter((c) => {
    if (!c.last_visit_date) return false;
    const days = (today.getTime() - new Date(c.last_visit_date).getTime()) / 86400000;
    return days > 31 && days <= 45;
  }).length;
  const churned = allCust.filter((c) => {
    if (!c.last_visit_date) return false;
    const days = (today.getTime() - new Date(c.last_visit_date).getTime()) / 86400000;
    return days > 45;
  }).length;
  const active = allCust.filter((c) => {
    if (!c.last_visit_date) return false;
    const days = (today.getTime() - new Date(c.last_visit_date).getTime()) / 86400000;
    return days <= 30;
  }).length;

  return (
    <StatistikeClient
      period={period}
      totalRevenue={totalRevenue}
      change={change}
      bookingsCount={bookingsCount}
      doneCount={doneCount}
      cancelledCount={cancelledCount}
      cancelledPct={cancelledPct}
      avgPerBooking={avgPerBooking}
      newCustomers={newCust.length}
      series={series}
      topServices={topServices}
      retention={{ active, atRisk, churned }}
      ordersCount={ordersData.length}
      isStaffView={staffMode}
      staffBreakdown={staffBreakdown}
    />
  );
}
