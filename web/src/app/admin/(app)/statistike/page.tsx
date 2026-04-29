import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export const dynamic = "force-dynamic";

export default async function StatistikePage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split("T")[0];

  const [bookingsRes, customersRes, ordersRes] = await Promise.all([
    sb.from("bookings").select("status, services(price), date, utm_source").eq("salon_id", session.salonId).gte("date", monthAgoStr),
    sb.from("customers").select("created_at, last_visit_date, no_show_flag, no_show_count").eq("salon_id", session.salonId),
    sb.from("orders").select("total, status").eq("salon_id", session.salonId).gte("created_at", monthAgoStr),
  ]);

  const bookings = bookingsRes.data ?? [];
  const customers = customersRes.data ?? [];
  const orders = ordersRes.data ?? [];

  const revenue30 = bookings.filter((b) => b.status === "done").reduce((sum, b) => sum + ((b.services as { price?: number } | null)?.price ?? 0), 0);
  const orderRevenue30 = orders.filter((o) => o.status === "picked_up").reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalRev = revenue30 + orderRevenue30;
  const bookingCount = bookings.length;
  const doneCount = bookings.filter((b) => b.status === "done").length;
  const noShowCount = bookings.filter((b) => b.status === "no_show").length;
  const noShowRate = bookingCount ? Math.round((noShowCount / bookingCount) * 100) : 0;

  const newCustomers = customers.filter((c) => new Date(c.created_at) >= monthAgo).length;
  const atRisk = customers.filter((c) => {
    if (!c.last_visit_date) return false;
    const days = (Date.now() - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24);
    return days > 31 && days <= 45;
  }).length;
  const churned = customers.filter((c) => {
    if (!c.last_visit_date) return false;
    const days = (Date.now() - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24);
    return days > 45;
  }).length;

  const utmCounts: Record<string, number> = {};
  for (const b of bookings) {
    const src = b.utm_source ?? "direct";
    utmCounts[src] = (utmCounts[src] ?? 0) + 1;
  }

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>СТАТИСТИКА</span><span data-lat>STATISTIKA</span>
          </div>
          <div className="adm-page-subtitle">Posljednjih 30 dana</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <Stat val={`${totalRev.toLocaleString()}`} unit="RSD" label="PRIHOD" />
        <Stat val={String(bookingCount)} label="REZERV." />
        <Stat val={String(doneCount)} label="ZAVRŠENO" />
        <Stat val={`${noShowRate}%`} label="NO-SHOW" tone={noShowRate > 10 ? "danger" : undefined} />
        <Stat val={String(newCustomers)} label="NOVE MUŠT." />
        <Stat val={String(orders.length)} label="PORUDŽBINE" />
      </div>

      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
          IZVOR REZERVACIJA (UTM)
        </div>
        {Object.entries(utmCounts).sort(([, a], [, b]) => b - a).map(([src, count]) => {
          const pct = bookingCount ? Math.round((count / bookingCount) * 100) : 0;
          return (
            <div key={src} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--cream)", marginBottom: 4 }}>
                <span>{src.toUpperCase()}</span>
                <span style={{ color: "var(--mustard)" }}>{count} · {pct}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(245,233,208,.08)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "var(--mustard)" }} />
              </div>
            </div>
          );
        })}
        {bookingCount === 0 && <div style={{ color: "rgba(245,233,208,.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Nema rezervacija u ovom periodu.</div>}
      </div>

      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 8 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
          RETENTION
        </div>
        <div className="adm-row"><span style={{ color: "var(--cream)" }}>Aktivnih (≤ 30d)</span><span style={{ color: "var(--success)" }}>{customers.filter((c) => c.last_visit_date && (Date.now() - new Date(c.last_visit_date).getTime()) / (1000*60*60*24) <= 30).length}</span></div>
        <div className="adm-row"><span style={{ color: "var(--cream)" }}>At-risk (31–45d)</span><span style={{ color: "var(--mustard)" }}>{atRisk}</span></div>
        <div className="adm-row"><span style={{ color: "var(--cream)" }}>Churned (&gt;45d)</span><span style={{ color: "var(--danger)" }}>{churned}</span></div>
      </div>
    </>
  );
}

function Stat({ val, unit, label, tone }: { val: string; unit?: string; label: string; tone?: "danger" }) {
  return (
    <div className="adm-card" style={{ display: "block", padding: "14px 16px" }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontStyle: "italic", color: tone === "danger" ? "var(--danger)" : "var(--mustard)", lineHeight: 1 }}>
        {val}{unit && <span style={{ fontSize: 11, marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: "rgba(245,233,208,.4)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
