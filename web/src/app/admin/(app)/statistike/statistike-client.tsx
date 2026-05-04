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

      {/* PRIHODI block — period-aware narrative. Each period asks a
          different question and gets its own primary view:
            day   → which hours were busiest? (top 5 hours)
            week  → which days were strongest? (all 7 days ranked)
            month → which weekday is consistently strongest? (DOW pattern)
          Always shown: PEAK callout (single big "best moment" card) and
          a counts band at the bottom (above/below/closed). */}
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
          const peakDeltaPct = avg > 0 ? Math.round(((peak.value - avg) / avg) * 100) : 0;
          const sortedDesc = [...earning].sort((a, b) => b.value - a.value);
          const aboveCount = earning.filter((s) => s.value >= avg).length;
          const belowCount = earning.filter((s) => s.value < avg).length;
          const closedCount = series.length - earning.length;

          // Day-of-week aggregation — only meaningful for monthly view
          // because that's where multiple Mondays/Tuesdays/etc. exist.
          // Empty for week/day periods.
          const dowLabelsSr = ["НЕД", "ПОН", "УТО", "СРЕ", "ЧЕТ", "ПЕТ", "СУБ"];
          const dowLabelsLat = ["NED", "PON", "UTO", "SRE", "ČET", "PET", "SUB"];
          type DowRow = { weekday: number; sr: string; lat: string; avg: number; count: number };
          let dowBreakdown: DowRow[] = [];
          if (period === "month") {
            const dowMap = new Map<number, { sum: number; count: number }>();
            for (const s of earning) {
              const d = new Date(s.key);
              if (isNaN(d.getTime())) continue;
              const wd = d.getDay();
              const cur = dowMap.get(wd) ?? { sum: 0, count: 0 };
              cur.sum += s.value;
              cur.count += 1;
              dowMap.set(wd, cur);
            }
            dowBreakdown = Array.from(dowMap.entries())
              .map(([wd, v]) => ({
                weekday: wd,
                sr: dowLabelsSr[wd],
                lat: dowLabelsLat[wd],
                avg: Math.round(v.sum / v.count),
                count: v.count,
              }))
              .sort((a, b) => b.avg - a.avg);
          }
          const dowMax = dowBreakdown[0]?.avg ?? 0;

          // Period-specific ranked entries (when dow breakdown isn't used)
          const rankedCap = period === "day" ? 5 : 7;
          const ranked = sortedDesc.slice(0, rankedCap);

          return (
            <>
              {/* PEAK CALLOUT — the standout "best moment" card, hero-styled */}
              <div className="rev-peak">
                <div className="rev-peak-eyebrow">
                  <span className="rev-peak-star" aria-hidden="true">★</span>
                  <span data-sr>{period === "day" ? "НАЈЈАЧИ САТ" : "НАЈЈАЧИ ДАН"}</span>
                  <span data-lat>{period === "day" ? "NAJJAČI SAT" : "NAJJAČI DAN"}</span>
                </div>
                <div className="rev-peak-label">{peak.label}</div>
                <div className="rev-peak-value">
                  {peak.value.toLocaleString("sr-RS")}
                  <span className="rev-peak-currency">RSD</span>
                </div>
                {peakDeltaPct > 0 && (
                  <div className="rev-peak-delta">
                    ↑ {peakDeltaPct}% <span data-sr>изнад просека</span><span data-lat>iznad proseka</span>
                  </div>
                )}
              </div>

              {/* AVG sub-line — sets context for the peak delta */}
              <div className="rev-avg-line">
                <span data-sr>Просек </span>
                <span data-lat>Prosek </span>
                <strong>{formatCompactRsd(avg)}</strong>
                <span data-sr> по {period === "day" ? "сату" : "дану"}</span>
                <span data-lat> po {period === "day" ? "satu" : "danu"}</span>
              </div>

              {/* RHYTHM section — different shape per period */}
              {period === "month" && dowBreakdown.length > 0 ? (
                <div className="rev-rhythm">
                  <div className="rev-rhythm-head">
                    <span data-sr>ПО ДАНИМА У НЕДЕЉИ</span>
                    <span data-lat>PO DANIMA U NEDELJI</span>
                  </div>
                  {dowBreakdown.map((d, i) => {
                    // Ratio used for a CSS variable we drive an inline
                    // intensity bar with — purely typographic, no SVG.
                    const ratio = dowMax > 0 ? d.avg / dowMax : 0;
                    return (
                      <div key={d.weekday} className={`rev-rhythm-row ${i === 0 ? "best" : ""}`} style={{ "--rhythm-fill": `${Math.round(ratio * 100)}%` } as React.CSSProperties}>
                        <span className="rev-rhythm-day">
                          <span data-sr>{d.sr}</span><span data-lat>{d.lat}</span>
                        </span>
                        <span className="rev-rhythm-bar" aria-hidden="true" />
                        <span className="rev-rhythm-meta">
                          {d.count}× <span data-sr>у месецу</span><span data-lat>u mesecu</span>
                        </span>
                        <span className="rev-rhythm-val">{formatCompactRsd(d.avg)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rev-rhythm">
                  <div className="rev-rhythm-head">
                    <span data-sr>{period === "day" ? "НАЈБОЉИХ 5 САТИ" : "ПО ДАНИМА"}</span>
                    <span data-lat>{period === "day" ? "NAJBOLJIH 5 SATI" : "PO DANIMA"}</span>
                  </div>
                  {ranked.map((s, i) => {
                    const ratio = peak.value > 0 ? s.value / peak.value : 0;
                    return (
                      <div
                        key={s.key}
                        className={`rev-rhythm-row ${i === 0 ? "best" : ""} ${s.isToday ? "today" : ""}`}
                        style={{ "--rhythm-fill": `${Math.round(ratio * 100)}%` } as React.CSSProperties}
                      >
                        <span className="rev-rhythm-day">{s.label}</span>
                        <span className="rev-rhythm-bar" aria-hidden="true" />
                        {s.isToday ? (
                          <span className="rev-rhythm-meta tag">
                            <span data-sr>ДАНАС</span><span data-lat>DANAS</span>
                          </span>
                        ) : (
                          <span className="rev-rhythm-meta" />
                        )}
                        <span className="rev-rhythm-val">{formatCompactRsd(s.value)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* COUNTS — single sentence, sums up the period */}
              <div className="rev-counts">
                <strong>{aboveCount}</strong>
                <span data-sr> изнад просека</span>
                <span data-lat> iznad proseka</span>
                <span className="rev-counts-sep">·</span>
                <strong>{belowCount}</strong>
                <span data-sr> испод</span>
                <span data-lat> ispod</span>
                {closedCount > 0 && (
                  <>
                    <span className="rev-counts-sep">·</span>
                    <strong>{closedCount}</strong>
                    <span data-sr> {period === "day" ? "без прихода" : "затворено"}</span>
                    <span data-lat> {period === "day" ? "bez prihoda" : "zatvoreno"}</span>
                  </>
                )}
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
