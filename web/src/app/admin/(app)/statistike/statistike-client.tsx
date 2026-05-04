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
type BestWeekday = { weekday: number; avgPerDay: number; dayCount: number } | null;
type MonthRow = { year: number; month: number; total: number };

const WEEKDAY_NAMES_SR = ["недељом", "понедељком", "уторком", "средом", "четвртком", "петком", "суботом"];
const WEEKDAY_NAMES_LAT = ["nedeljom", "ponedeljkom", "utorkom", "sredom", "četvrtkom", "petkom", "subotom"];
const MONTH_NAMES_SR = ["ЈАНУАР", "ФЕБРУАР", "МАРТ", "АПРИЛ", "МАЈ", "ЈУН", "ЈУЛ", "АВГУСТ", "СЕПТЕМБАР", "ОКТОБАР", "НОВЕМБАР", "ДЕЦЕМБАР"];
const MONTH_NAMES_LAT = ["JANUAR", "FEBRUAR", "MART", "APRIL", "MAJ", "JUN", "JUL", "AVGUST", "SEPTEMBAR", "OKTOBAR", "NOVEMBAR", "DECEMBAR"];

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
  bestWeekday: BestWeekday;
  monthlyTotals: MonthRow[];
}) {
  const { period, totalRevenue, change, doneCount, cancelledCount, cancelledPct, avgPerBooking, newCustomers, series, topServices, retention, ordersCount, isStaffView, staffBreakdown, bestWeekday, monthlyTotals } = props;

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

      {/* PRIHODI block — period-specific, no cross-day comparison clutter:
            day   → just today's headline + bookings count
            week  → 7-day chronological list (today highlighted)
            month → current + 2 previous monthly totals with % delta
          Insight ("najviše zarađuješ subotom") lives in its own card-block
          below this one. */}
      <div className="stat-card-block">
        <div className="stat-card-title">
          <span data-sr>ПРИХОДИ</span>
          <span data-lat>PRIHODI</span>
          {period === "day" && (
            <>
              <span style={{ marginLeft: 6, opacity: 0.5 }} data-sr>· данас</span>
              <span style={{ marginLeft: 6, opacity: 0.5 }} data-lat>· danas</span>
            </>
          )}
          {period === "week" && (
            <>
              <span style={{ marginLeft: 6, opacity: 0.5 }} data-sr>· по данима</span>
              <span style={{ marginLeft: 6, opacity: 0.5 }} data-lat>· po danima</span>
            </>
          )}
          {period === "month" && (
            <>
              <span style={{ marginLeft: 6, opacity: 0.5 }} data-sr>· по месецу</span>
              <span style={{ marginLeft: 6, opacity: 0.5 }} data-lat>· po mesecu</span>
            </>
          )}
        </div>

        {/* DAY: just today, no per-hour breakdown */}
        {period === "day" && (
          totalRevenue > 0 ? (
            <div className="rev-day">
              <div className="rev-day-value">
                {totalRevenue.toLocaleString("sr-RS")}
                <span className="rev-day-currency">RSD</span>
              </div>
              <div className="rev-day-meta">
                <strong>{doneCount}</strong>
                <span data-sr> {doneCount === 1 ? "термин обављен" : "термина обављено"}</span>
                <span data-lat> {doneCount === 1 ? "termin obavljen" : "termina obavljeno"}</span>
                {avgPerBooking > 0 && (
                  <>
                    <span className="rev-day-sep">·</span>
                    <span data-sr>просек </span><span data-lat>prosek </span>
                    <strong>{avgPerBooking.toLocaleString("sr-RS")}</strong>
                    <span> RSD</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="adm-empty" style={{ padding: 24 }}>
              <span data-sr>Још нема прихода данас.</span>
              <span data-lat>Još nema prihoda danas.</span>
            </div>
          )
        )}

        {/* WEEK: 7 days in calendar order. Each row gets an intensity bar
            relative to the week's peak so Triša immediately sees which
            days carried the week. */}
        {period === "week" && (() => {
          const weekMax = Math.max(0, ...series.map((s) => s.value));
          if (weekMax === 0) {
            return (
              <div className="adm-empty" style={{ padding: 24 }}>
                <span data-sr>Нема прихода у овој недељи.</span>
                <span data-lat>Nema prihoda u ovoj nedelji.</span>
              </div>
            );
          }
          return (
            <div className="rev-rhythm">
              {series.map((s) => {
                const ratio = weekMax > 0 ? s.value / weekMax : 0;
                const isBest = s.value === weekMax && s.value > 0;
                return (
                  <div
                    key={s.key}
                    className={`rev-rhythm-row ${isBest ? "best" : ""} ${s.isToday ? "today" : ""}`}
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
                    <span className="rev-rhythm-val">
                      {s.value > 0 ? formatCompactRsd(s.value) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* MONTH: current + 2 previous monthly totals. % delta on every
            month except the oldest (no anchor to compare against). */}
        {period === "month" && (() => {
          const hasAnyRevenue = monthlyTotals.some((m) => m.total > 0);
          if (!hasAnyRevenue) {
            return (
              <div className="adm-empty" style={{ padding: 24 }}>
                <span data-sr>Нема прихода у последња 3 месеца.</span>
                <span data-lat>Nema prihoda u poslednja 3 meseca.</span>
              </div>
            );
          }
          const monthMax = Math.max(1, ...monthlyTotals.map((m) => m.total));
          return (
            <div className="rev-months">
              {monthlyTotals.map((m, i) => {
                const prev = monthlyTotals[i + 1];
                const pct = prev && prev.total > 0
                  ? Math.round(((m.total - prev.total) / prev.total) * 100)
                  : null;
                const ratio = m.total / monthMax;
                return (
                  <div
                    key={`${m.year}-${m.month}`}
                    className={`rev-month-row ${i === 0 ? "current" : ""}`}
                    style={{ "--rhythm-fill": `${Math.round(ratio * 100)}%` } as React.CSSProperties}
                  >
                    <div className="rev-month-name">
                      <span data-sr>{MONTH_NAMES_SR[m.month]}</span>
                      <span data-lat>{MONTH_NAMES_LAT[m.month]}</span>
                      <span className="rev-month-year">{m.year}</span>
                    </div>
                    <div className="rev-month-bar" aria-hidden="true" />
                    <div className="rev-month-val">
                      {m.total > 0 ? formatCompactRsd(m.total) : "—"}
                    </div>
                    {pct !== null && (
                      <div className={`rev-month-pct ${pct >= 0 ? "up" : "down"}`}>
                        {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* INSIGHT — historical weekday pattern (last 90 days). Same data
          shown regardless of period filter — gives Triša a consistent
          "u proseku najviše zarađuješ subotom" answer. */}
      {bestWeekday && bestWeekday.avgPerDay > 0 && (
        <div className="stat-card-block rev-insight">
          <div className="rev-insight-eyebrow">
            <span data-sr>У ПРОСЕКУ · 90 ДАНА</span>
            <span data-lat>U PROSEKU · 90 DANA</span>
          </div>
          <div className="rev-insight-body">
            <span data-sr>Највише зарађујеш </span>
            <span data-lat>Najviše zarađuješ </span>
            <strong>
              <span data-sr>{WEEKDAY_NAMES_SR[bestWeekday.weekday]}</span>
              <span data-lat>{WEEKDAY_NAMES_LAT[bestWeekday.weekday]}</span>
            </strong>
          </div>
          <div className="rev-insight-num">
            ~{formatCompactRsd(bestWeekday.avgPerDay)}
            <span className="rev-insight-num-suffix"> RSD</span>
            <span className="rev-insight-num-unit">
              <span data-sr> по дану</span>
              <span data-lat> po danu</span>
            </span>
          </div>
          <div className="rev-insight-foot">
            <span data-sr>{bestWeekday.dayCount}× у последња три месеца</span>
            <span data-lat>{bestWeekday.dayCount}× u poslednja tri meseca</span>
          </div>
        </div>
      )}

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
