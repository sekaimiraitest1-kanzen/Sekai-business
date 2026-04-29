import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { StatistikeClient } from "./statistike-client";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month";

function periodRange(period: Period, now = new Date()): { from: Date; to: Date } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (period === "day") {
    return { from: today, to: today };
  }
  if (period === "week") {
    // Monday → Sunday of current week
    const monOffset = (today.getDay() + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - monOffset);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon, to: sun };
  }
  // month: 1st → last day
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: first, to: last };
}

function previousRange(period: Period, current: { from: Date; to: Date }) {
  if (period === "day") {
    const d = new Date(current.from);
    d.setDate(d.getDate() - 1);
    return { from: d, to: d };
  }
  if (period === "week") {
    const from = new Date(current.from);
    from.setDate(from.getDate() - 7);
    const to = new Date(current.to);
    to.setDate(to.getDate() - 7);
    return { from, to };
  }
  const first = new Date(current.from.getFullYear(), current.from.getMonth() - 1, 1);
  const last = new Date(current.from.getFullYear(), current.from.getMonth(), 0);
  return { from: first, to: last };
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default async function StatistikePage({ searchParams }: { searchParams: { period?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const period: Period = searchParams.period === "day" ? "day" : searchParams.period === "month" ? "month" : "week";

  const cur = periodRange(period);
  const prev = previousRange(period, cur);

  const [curBookings, prevBookings, newCustomers, allCustomers, orders] = await Promise.all([
    sb.from("bookings")
      .select("status, date, time_slot, services(name_sr, name_lat, price)")
      .eq("salon_id", session.salonId)
      .gte("date", fmt(cur.from)).lte("date", fmt(cur.to)),
    sb.from("bookings")
      .select("status, services(price)")
      .eq("salon_id", session.salonId)
      .gte("date", fmt(prev.from)).lte("date", fmt(prev.to)),
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
  const labelsLat = ["PON", "UTO", "SRE", "ČET", "PET", "SUB", "NED"];
  const todayKey = fmt(new Date());

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
      series.push({ label: labelsSr[i], value: dailyRevenue[k] ?? 0, key: k, isToday: k === todayKey });
    }
  } else {
    const days = (cur.to.getDate() - cur.from.getDate()) + 1;
    for (let i = 0; i < days; i++) {
      const d = new Date(cur.from);
      d.setDate(cur.from.getDate() + i);
      const k = fmt(d);
      series.push({ label: String(d.getDate()), value: dailyRevenue[k] ?? 0, key: k, isToday: k === todayKey });
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
  const today = new Date();
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
      labelsLat={labelsLat}
    />
  );
}
