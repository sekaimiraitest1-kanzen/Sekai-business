"use client";

import Link from "next/link";

type Series = { label: string; value: number; key: string; isToday: boolean };
type TopService = { name_sr: string; name_lat: string; count: number; revenue: number };
type Retention = { active: number; atRisk: number; churned: number };

export function StatistikeClient(props: {
  period: "day" | "week" | "month";
  totalRevenue: number;
  change: number | null;
  bookingsCount: number;
  doneCount: number;
  cancelledCount: number;
  cancelledPct: number;
  avgPerBooking: number;
  newCustomers: number;
  series: Series[];
  topServices: TopService[];
  retention: Retention;
  ordersCount: number;
  labelsLat: string[];
}) {
  const { period, totalRevenue, change, doneCount, cancelledCount, cancelledPct, avgPerBooking, newCustomers, series, topServices, retention, ordersCount } = props;
  const max = Math.max(1, ...series.map((s) => s.value));

  const periodLabelSr = period === "day" ? "ДАНАС" : period === "week" ? "ОВА НЕДЕЉА" : "ОВАЈ МЕСЕЦ";
  const periodLabelLat = period === "day" ? "DANAS" : period === "week" ? "OVA NEDELJA" : "OVAJ MESEC";
  const compareLabelSr = period === "day" ? "ПРОШЛИ ДАН" : period === "week" ? "ПРОШЛА НЕДЕЉА" : "ПРОШЛИ МЕСЕЦ";
  const compareLabelLat = period === "day" ? "PROŠLI DAN" : period === "week" ? "PROŠLA NEDELJA" : "PROŠLI MESEC";

  return (
    <>
      {/* Period toggle */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>СТАТИСТИКА</span>
            <span data-lat>STATISTIKA</span>
          </div>
        </div>
      </div>

      <div className="adm-toggle" style={{ marginBottom: 20 }}>
        <PeriodLink period="day" current={period} sr="ДАН" lat="DAN" />
        <PeriodLink period="week" current={period} sr="НЕДЕЉА" lat="NEDELJA" />
        <PeriodLink period="month" current={period} sr="МЕСЕЦ" lat="MESEC" />
      </div>

      {/* Hero revenue card */}
      <div className="stat-hero">
        <div className="stat-hero-label">
          <span data-sr>{periodLabelSr}</span>
          <span data-lat>{periodLabelLat}</span>
        </div>
        <div className="stat-hero-value">
          {totalRevenue.toLocaleString("sr-RS")}
          <span className="stat-hero-currency">RSD</span>
        </div>
        {change !== null ? (
          <div className={`stat-hero-change ${change >= 0 ? "up" : "down"}`}>
            {change >= 0 ? "↑" : "↓"} {change >= 0 ? "+" : ""}{change}%
            <span style={{ opacity: 0.7, marginLeft: 6 }} data-sr>vs. {compareLabelSr}</span>
            <span style={{ opacity: 0.7, marginLeft: 6 }} data-lat>vs. {compareLabelLat}</span>
          </div>
        ) : (
          <div className="stat-hero-change" style={{ color: "rgba(245,233,208,.4)" }}>
            <span data-sr>Нема података за поређење</span>
            <span data-lat>Nema podataka za poređenje</span>
          </div>
        )}
      </div>

      {/* 2×2 grid of stat boxes */}
      <div className="stat-grid">
        <StatBox labelSr="ТЕРМИНИ" labelLat="TERMINI" value={String(doneCount)} subSr="обављено" subLat="obavljeno" />
        <StatBox labelSr="НОВИ" labelLat="NOVI" value={String(newCustomers)} subSr="муштерије" subLat="mušterije" />
        <StatBox labelSr="ПРОСЕЧНО" labelLat="PROSEČNO" value={avgPerBooking.toLocaleString("sr-RS")} unit="RSD" subSr="по термину" subLat="po terminu" />
        <StatBox labelSr="ОТКАЗАНО" labelLat="OTKAZANO" value={String(cancelledCount)} unit={`${cancelledPct}%`} tone={cancelledPct > 10 ? "danger" : undefined} />
      </div>

      {/* Bar chart — revenue per day/hour */}
      <div className="stat-card-block">
        <div className="stat-card-title">
          <span data-sr>ПРИХОДИ</span>
          <span data-lat>PRIHODI</span>
          <span style={{ marginLeft: 6, opacity: 0.5 }} data-sr>· {period === "day" ? "по сату" : period === "week" ? "по данима" : "по датуму"}</span>
          <span style={{ marginLeft: 6, opacity: 0.5 }} data-lat>· {period === "day" ? "po satu" : period === "week" ? "po danima" : "po datumu"}</span>
        </div>
        {series.every((s) => s.value === 0) ? (
          <div className="adm-empty" style={{ padding: 32 }}>
            <span data-sr>Нема прихода у овом периоду.</span>
            <span data-lat>Nema prihoda u ovom periodu.</span>
          </div>
        ) : (
          <div className="bar-chart">
            <div className="bars">
              {series.map((s) => {
                const h = Math.max(2, Math.round((s.value / max) * 100));
                return (
                  <div key={s.key} className="bar-wrap">
                    <div className="bar-value">{s.value > 0 ? s.value.toLocaleString("sr-RS") : ""}</div>
                    <div className={`bar ${s.isToday ? "today" : ""} ${s.value === max && s.value > 0 ? "peak" : ""}`} style={{ height: `${h}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="bar-labels">
              {series.map((s) => (
                <div key={`lbl-${s.key}`} className={`bar-label ${s.isToday ? "today" : ""}`}>{s.label}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top services */}
      <div className="stat-card-block">
        <div className="stat-card-title">
          <span data-sr>НАЈТРАЖЕНИЈЕ УСЛУГЕ</span>
          <span data-lat>NAJTRAŽENIJE USLUGE</span>
        </div>
        {topServices.length === 0 ? (
          <div className="adm-empty" style={{ padding: 24 }}>
            <span data-sr>Нема обављених термина.</span>
            <span data-lat>Nema obavljenih termina.</span>
          </div>
        ) : (
          <div>
            {topServices.map((s, i) => (
              <div key={i} className="top-service-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="top-service-name">
                    <span data-sr>{s.name_sr}</span>
                    <span data-lat>{s.name_lat}</span>
                  </div>
                </div>
                <div className="top-service-count">{s.count}×</div>
                <div className="top-service-revenue">{s.revenue.toLocaleString("sr-RS")} <span>RSD</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retention block */}
      <div className="stat-card-block">
        <div className="stat-card-title">
          <span data-sr>RETENTION</span>
          <span data-lat>RETENTION</span>
        </div>
        <div className="retention-row">
          <div className="retention-cell">
            <div className="retention-num" style={{ color: "var(--success)" }}>{retention.active}</div>
            <div className="retention-lbl"><span data-sr>АКТИВНИ</span><span data-lat>AKTIVNI</span></div>
            <div className="retention-sub">≤ 30d</div>
          </div>
          <div className="retention-cell">
            <div className="retention-num" style={{ color: "var(--mustard)" }}>{retention.atRisk}</div>
            <div className="retention-lbl"><span data-sr>РИЗИК</span><span data-lat>RIZIK</span></div>
            <div className="retention-sub">31–45d</div>
          </div>
          <div className="retention-cell">
            <div className="retention-num" style={{ color: "var(--danger)" }}>{retention.churned}</div>
            <div className="retention-lbl"><span data-sr>ИЗГУБ.</span><span data-lat>IZGUB.</span></div>
            <div className="retention-sub">{">"} 45d</div>
          </div>
        </div>
      </div>

      {ordersCount > 0 && (
        <div className="adm-banner info" style={{ marginTop: 12 }}>
          🛒 <span data-sr>{ordersCount} порудж. у овом периоду — види /admin/shop/porudzbine</span>
          <span data-lat>{ordersCount} porudž. u ovom periodu — vidi /admin/shop/porudzbine</span>
        </div>
      )}
    </>
  );
}

function PeriodLink({ period, current, sr, lat }: { period: "day" | "week" | "month"; current: string; sr: string; lat: string }) {
  return (
    <Link
      href={`/admin/statistike?period=${period}`}
      className={`adm-toggle-opt ${current === period ? "active" : ""}`}
      style={{ textDecoration: "none", textAlign: "center" }}
    >
      <span data-sr>{sr}</span>
      <span data-lat>{lat}</span>
    </Link>
  );
}

function StatBox({ labelSr, labelLat, value, unit, subSr, subLat, tone }: {
  labelSr: string;
  labelLat: string;
  value: string;
  unit?: string;
  subSr?: string;
  subLat?: string;
  tone?: "danger";
}) {
  return (
    <div className="stat-box">
      <div className="stat-box-label">
        <span data-sr>{labelSr}</span>
        <span data-lat>{labelLat}</span>
      </div>
      <div className="stat-box-value">
        <span style={{ color: tone === "danger" ? "var(--danger)" : "var(--cream)" }}>{value}</span>
        {unit && <span className="stat-box-unit">{unit}</span>}
      </div>
      {(subSr || subLat) && (
        <div className="stat-box-sub">
          <span data-sr>{subSr}</span>
          <span data-lat>{subLat}</span>
        </div>
      )}
    </div>
  );
}
