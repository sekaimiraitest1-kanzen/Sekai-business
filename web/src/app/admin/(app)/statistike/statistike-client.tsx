"use client";

import Link from "next/link";

/**
 * Compact RSD format for bar-chart labels and the summary band so values
 * never get clipped inside a 32px-max bar at 9px font on iPhone 11 Pro.
 *   1.234        → "1,2K"
 *   12.345       → "12,3K"
 *   123.456      → "123K"
 *   1.234.567    → "1,2M"
 * Returns "" for 0 — empty strings paint nothing in the cell.
 */
function formatCompactRsd(n: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

type Series = { label: string; value: number; key: string; isToday: boolean };
type TopService = { name_sr: string; name_lat: string; count: number; revenue: number };
type Retention = { active: number; atRisk: number; churned: number };
type StaffBreakdownRow = { id: string; display_name: string; revenue: number; count: number };

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
  isStaffView: boolean;
  staffBreakdown: StaffBreakdownRow[] | null;
}) {
  const { period, totalRevenue, change, doneCount, cancelledCount, cancelledPct, avgPerBooking, newCustomers, series, topServices, retention, ordersCount, isStaffView, staffBreakdown } = props;

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
            <span data-sr>{isStaffView ? "МОЈА СТАТИСТИКА" : "СТАТИСТИКА"}</span>
            <span data-lat>{isStaffView ? "MOJA STATISTIKA" : "STATISTIKA"}</span>
          </div>
          {isStaffView && (
            <div className="adm-page-subtitle">
              <span data-sr>Само термини које си завршио.</span>
              <span data-lat>Samo termini koje si završio.</span>
            </div>
          )}
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

      {/* PRIHODI block — list-based, no chart. Three sections under the
          summary band: top earners, weakest earners (when there are
          enough data points), and a 3-bucket distribution triplet. The
          aim is "scannable in 3 seconds on iPhone 11" — every value sits
          in its own row, so nothing can ever overlap. */}
      <div className="stat-card-block">
        <div className="stat-card-title">
          <span data-sr>ПРИХОДИ</span>
          <span data-lat>PRIHODI</span>
          <span style={{ marginLeft: 6, opacity: 0.5 }} data-sr>· {period === "day" ? "по сату" : period === "week" ? "по данима" : "по датуму"}</span>
          <span style={{ marginLeft: 6, opacity: 0.5 }} data-lat>· {period === "day" ? "po satu" : period === "week" ? "po danima" : "po datumu"}</span>
        </div>
        {(() => {
          const earning = series.filter((s) => s.value > 0);
          if (earning.length === 0) {
            return (
              <div className="adm-empty" style={{ padding: 32 }}>
                <span data-sr>Нема прихода у овом периоду.</span>
                <span data-lat>Nema prihoda u ovom periodu.</span>
              </div>
            );
          }
          const avg = Math.round(earning.reduce((acc, s) => acc + s.value, 0) / earning.length);
          const peak = earning.reduce((p, s) => (s.value > p.value ? s : p), earning[0]);
          const sortedDesc = [...earning].sort((a, b) => b.value - a.value);
          const top = sortedDesc.slice(0, 3);
          // Only show "weakest" list when there's enough variance to be
          // meaningful — fewer than 4 earning entries means top + bottom
          // would overlap and the section would just repeat itself.
          const weakest = earning.length >= 4 ? [...sortedDesc].reverse().slice(0, 3) : [];
          const aboveCount = earning.filter((s) => s.value >= avg).length;
          const belowCount = earning.filter((s) => s.value < avg).length;
          const zeroCount = series.length - earning.length;
          // For day-period the time buckets are hours so the third bucket
          // is "no revenue" rather than "closed".
          const zeroLabelSr = period === "day" ? "БЕЗ ПРИХОДА" : "ЗАТВОРЕНО";
          const zeroLabelLat = period === "day" ? "BEZ PRIHODA" : "ZATVORENO";
          const unitSr = period === "day" ? "САТИ" : "ДАНИ";
          const unitLat = period === "day" ? "SATI" : "DANI";
          return (
            <>
              <div className="stat-summary-band">
                <div className="stat-summary-cell">
                  <span className="stat-summary-lbl"><span data-sr>ПРОСЕК</span><span data-lat>PROSEK</span></span>
                  <span className="stat-summary-val">{formatCompactRsd(avg)}</span>
                </div>
                <div className="stat-summary-sep" aria-hidden="true" />
                <div className="stat-summary-cell">
                  <span className="stat-summary-lbl"><span data-sr>ПИК</span><span data-lat>PIK</span></span>
                  <span className="stat-summary-val">
                    <span className="stat-summary-peak-day">{peak.label}</span>{" "}
                    {formatCompactRsd(peak.value)}
                  </span>
                </div>
              </div>

              <div className="rev-list">
                <div className="rev-list-head">
                  <span data-sr>{period === "day" ? "ТОП САТИ" : "ТОП ДАНИ"}</span>
                  <span data-lat>{period === "day" ? "TOP SATI" : "TOP DANI"}</span>
                </div>
                {top.map((s, i) => (
                  <div key={s.key} className={`rev-list-row top ${s.isToday ? "today" : ""}`}>
                    <span className="rev-list-rank">{i + 1}</span>
                    <span className="rev-list-label">{s.label}{s.isToday ? " ·" : ""}</span>
                    {s.isToday && (
                      <>
                        <span className="rev-list-tag" data-sr>ДАНАС</span>
                        <span className="rev-list-tag" data-lat>DANAS</span>
                      </>
                    )}
                    <span className="rev-list-val">{formatCompactRsd(s.value)}</span>
                  </div>
                ))}
              </div>

              {weakest.length > 0 && (
                <div className="rev-list">
                  <div className="rev-list-head">
                    <span data-sr>{period === "day" ? "СЛАБИЈИ САТИ" : "СЛАБИЈИ ДАНИ"}</span>
                    <span data-lat>{period === "day" ? "SLABIJI SATI" : "SLABIJI DANI"}</span>
                  </div>
                  {weakest.map((s) => (
                    <div key={s.key} className={`rev-list-row weak ${s.isToday ? "today" : ""}`}>
                      <span className="rev-list-bullet" aria-hidden="true">·</span>
                      <span className="rev-list-label">{s.label}</span>
                      <span className="rev-list-val">{formatCompactRsd(s.value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="rev-dist">
                <div className="rev-dist-cell good">
                  <div className="rev-dist-num">{aboveCount}</div>
                  <div className="rev-dist-unit"><span data-sr>{unitSr}</span><span data-lat>{unitLat}</span></div>
                  <div className="rev-dist-lbl">
                    <span data-sr>ИЗНАД ПРОСЕКА</span>
                    <span data-lat>IZNAD PROSEKA</span>
                  </div>
                </div>
                <div className="rev-dist-cell mid">
                  <div className="rev-dist-num">{belowCount}</div>
                  <div className="rev-dist-unit"><span data-sr>{unitSr}</span><span data-lat>{unitLat}</span></div>
                  <div className="rev-dist-lbl">
                    <span data-sr>ИСПОД ПРОСЕКА</span>
                    <span data-lat>ISPOD PROSEKA</span>
                  </div>
                </div>
                <div className="rev-dist-cell zero">
                  <div className="rev-dist-num">{zeroCount}</div>
                  <div className="rev-dist-unit"><span data-sr>{unitSr}</span><span data-lat>{unitLat}</span></div>
                  <div className="rev-dist-lbl">
                    <span data-sr>{zeroLabelSr}</span>
                    <span data-lat>{zeroLabelLat}</span>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
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

      {/* Retention block — global across all customers (period toggle does NOT change this). */}
      <div className="stat-card-block">
        <div className="stat-card-title">
          <span data-sr>RETENTION · сви купци</span>
          <span data-lat>RETENTION · svi kupci</span>
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

      {ordersCount > 0 && !isStaffView && (
        <div className="adm-banner info" style={{ marginTop: 12 }}>
          🛒 <span data-sr>{ordersCount} порудж. у овом периоду — види /admin/shop/porudzbine</span>
          <span data-lat>{ordersCount} porudž. u ovom periodu — vidi /admin/shop/porudzbine</span>
        </div>
      )}

      {/* Owner-only: how revenue split across staff members in this period.
          Hidden when there's no breakdown (single-staff or no done bookings). */}
      {!isStaffView && staffBreakdown && staffBreakdown.length > 0 && (
        <div className="stat-card-block">
          <div className="stat-card-title">
            <span data-sr>ЗАРАДА ПО ОСОБИ</span>
            <span data-lat>ZARADA PO OSOBI</span>
          </div>
          <div>
            {staffBreakdown.map((row) => (
              <div key={row.id} className="top-service-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="top-service-name">{row.display_name}</div>
                </div>
                <div className="top-service-count">{row.count}×</div>
                <div className="top-service-revenue">{row.revenue.toLocaleString("sr-RS")} <span>RSD</span></div>
              </div>
            ))}
          </div>
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
