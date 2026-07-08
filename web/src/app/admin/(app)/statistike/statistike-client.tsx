"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  getDoneBookingsDetail,
  getNewCustomersDetail,
  getCancelledBookingsDetail,
  deleteBookingFromStats,
  deleteAllCancelledInPeriod,
} from "./actions";

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

type DoneBooking = { id: string; date: string; time_slot: string; customers: { name?: string | null; phone?: string | null } | null; services: { name_sr?: string | null; name_lat?: string | null; price?: number | null } | null };
type NewCustomer = { id: string; name?: string | null; phone?: string | null; created_at?: string | null; utm_source?: string | null };
type CancelledBooking = { id: string; date: string; time_slot: string; customers: { name?: string | null; phone?: string | null } | null; services: { name_sr?: string | null; name_lat?: string | null; price?: number | null } | null };

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

  // ── Popup state ────────────────────────────────────────────────────────────
  type PopupKey = "termini" | "novi" | "prosecno" | "otkazano";
  const [popup, setPopup] = useState<PopupKey | null>(null);
  const [loadingPopup, setLoadingPopup] = useState<PopupKey | null>(null);
  const [doneBookings, setDoneBookings] = useState<DoneBooking[]>([]);
  const [newCustomersList, setNewCustomersList] = useState<NewCustomer[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<CancelledBooking[]>([]);
  const [cancelledIsOwner, setCancelledIsOwner] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  async function openPopup(key: PopupKey) {
    setLoadingPopup(key);
    if (key === "termini") {
      const res = await getDoneBookingsDetail(period);
      if (res.ok) setDoneBookings(res.bookings as DoneBooking[]);
    } else if (key === "novi") {
      const res = await getNewCustomersDetail(period);
      if (res.ok) setNewCustomersList(res.customers as NewCustomer[]);
    } else if (key === "otkazano") {
      const res = await getCancelledBookingsDetail(period);
      if (res.ok) {
        setCancelledBookings(res.bookings as CancelledBooking[]);
        setCancelledIsOwner(res.isOwner);
        setDeletedIds(new Set());
      }
    }
    setLoadingPopup(null);
    setPopup(key);
  }

  function closePopup() { setPopup(null); }

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

      {/* 2×2 grid of stat boxes — all clickable */}
      <div className="stat-grid">
        <StatBox labelSr="ТЕРМИНИ" labelLat="TERMINI" value={String(doneCount)} subSr="обављено" subLat="obavljeno" loading={loadingPopup === "termini"} onClick={() => openPopup("termini")} />
        <StatBox labelSr="НОВИ" labelLat="NOVI" value={String(newCustomers)} subSr="муштерије" subLat="mušterije" loading={loadingPopup === "novi"} onClick={() => openPopup("novi")} />
        <StatBox labelSr="ПРОСЕЧНО" labelLat="PROSEČNO" value={avgPerBooking.toLocaleString("sr-RS")} unit="RSD" subSr="по термину" subLat="po terminu" loading={loadingPopup === "prosecno"} onClick={() => openPopup("prosecno")} />
        <StatBox labelSr="ОТКАЗАНО" labelLat="OTKAZANO" value={String(cancelledCount)} unit={`${cancelledPct}%`} tone={cancelledPct > 10 ? "danger" : undefined} loading={loadingPopup === "otkazano"} onClick={cancelledCount > 0 ? () => openPopup("otkazano") : undefined} />
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

      {/* ── POPUPS ────────────────────────────────────────────────────────── */}

      {/* ТЕРМИНИ popup — list of done bookings */}
      {popup === "termini" && (
        <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && closePopup()}>
          <div className="adm-sheet" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <SheetHeader titleSr="ТЕРМИНИ · ОБАВЉЕНО" titleLat="TERMINI · OBAVLJENO" onClose={closePopup} />
            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 24px" }}>
              {doneBookings.length === 0 ? (
                <div className="adm-empty" style={{ padding: 32 }}>
                  <span data-sr>Нема обављених термина.</span>
                  <span data-lat>Nema obavljenih termina.</span>
                </div>
              ) : doneBookings.map((b) => {
                const c = Array.isArray(b.customers) ? b.customers[0] : b.customers;
                const s = Array.isArray(b.services) ? b.services[0] : b.services;
                return (
                  <div key={b.id} style={{ borderBottom: "1px solid rgba(245,233,208,.08)", padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: "var(--cream)", letterSpacing: ".04em" }}>{c?.name ?? "—"}</div>
                      <div style={{ fontSize: 12, color: "rgba(245,233,208,.5)", marginTop: 3 }}>
                        <span data-sr>{s?.name_sr ?? "—"}</span>
                        <span data-lat>{s?.name_lat ?? "—"}</span>
                        {" · "}{b.date} {b.time_slot.slice(0, 5)}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: "var(--mustard)", whiteSpace: "nowrap" }}>{(s?.price ?? 0).toLocaleString("sr-RS")} RSD</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* НОВИ popup — list of new customers */}
      {popup === "novi" && (
        <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && closePopup()}>
          <div className="adm-sheet" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <SheetHeader titleSr="НОВЕ МУШТЕРИЈЕ" titleLat="NOVE MUŠTERIJE" onClose={closePopup} />
            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 24px" }}>
              {newCustomersList.length === 0 ? (
                <div className="adm-empty" style={{ padding: 32 }}>
                  <span data-sr>Нема нових муштерија у овом периоду.</span>
                  <span data-lat>Nema novih mušterija u ovom periodu.</span>
                </div>
              ) : newCustomersList.map((c) => (
                <div key={c.id} style={{ borderBottom: "1px solid rgba(245,233,208,.08)", padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: "var(--cream)", letterSpacing: ".04em" }}>{c.name ?? "—"}</div>
                    <div style={{ fontSize: 12, color: "rgba(245,233,208,.5)", marginTop: 3 }}>{c.phone ?? "—"}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(245,233,208,.4)", textAlign: "right" }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "short" }) : ""}
                    {c.utm_source && <div style={{ color: "rgba(245,233,208,.3)" }}>{c.utm_source}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ПРОСЕЧНО popup — top services breakdown */}
      {popup === "prosecno" && (
        <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && closePopup()}>
          <div className="adm-sheet" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <SheetHeader titleSr="ПРОСЕК ПО УСЛУЗИ" titleLat="PROSEK PO USLUZI" onClose={closePopup} />
            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 24px" }}>
              {topServices.length === 0 ? (
                <div className="adm-empty" style={{ padding: 32 }}>
                  <span data-sr>Нема података.</span><span data-lat>Nema podataka.</span>
                </div>
              ) : (() => {
                const maxCount = Math.max(1, ...topServices.map(s => s.count));
                return topServices.map((s, i) => {
                  const barPct = Math.round((s.count / maxCount) * 100);
                  const avg = s.count > 0 ? Math.round(s.revenue / s.count) : 0;
                  return (
                    <div key={i} style={{ borderBottom: "1px solid rgba(245,233,208,.08)", padding: "14px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: "var(--cream)", letterSpacing: ".04em" }}>
                          <span data-sr>{s.name_sr}</span><span data-lat>{s.name_lat}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "rgba(245,233,208,.6)" }}>
                          <span>{s.count}×</span>
                          <span style={{ color: "var(--mustard)" }}>{avg.toLocaleString("sr-RS")} RSD</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: "rgba(245,233,208,.1)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barPct}%`, background: "var(--mustard)", borderRadius: 2, transition: "width .4s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(245,233,208,.35)", marginTop: 4 }}>
                        <span data-sr>укупно {s.revenue.toLocaleString("sr-RS")} RSD</span>
                        <span data-lat>ukupno {s.revenue.toLocaleString("sr-RS")} RSD</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ОТКАЗАНО popup — cancelled bookings + delete */}
      {popup === "otkazano" && (
        <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && closePopup()}>
          <div className="adm-sheet" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <SheetHeader titleSr="ОТКАЗАНИ ТЕРМИНИ" titleLat="OTKAZANI TERMINI" onClose={closePopup} />
            {cancelledIsOwner && cancelledBookings.filter(b => !deletedIds.has(b.id)).length > 0 && (
              <div style={{ padding: "0 20px 12px", borderBottom: "1px solid rgba(245,233,208,.08)" }}>
                <button
                  style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={async () => {
                    if (!confirm("Obrisati sve otkazane termine iz ovog perioda?")) return;
                    await deleteAllCancelledInPeriod(period);
                    setDeletedIds(new Set(cancelledBookings.map(b => b.id)));
                  }}
                >
                  <span data-sr>🗑 ОБРИШИ СВЕ ОТКАЗАНЕ</span>
                  <span data-lat>🗑 OBRIŠI SVE OTKAZANE</span>
                </button>
              </div>
            )}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 24px" }}>
              {cancelledBookings.filter(b => !deletedIds.has(b.id)).length === 0 ? (
                <div className="adm-empty" style={{ padding: 32 }}>
                  <span data-sr>Нема отказаних термина.</span>
                  <span data-lat>Nema otkazanih termina.</span>
                </div>
              ) : cancelledBookings.filter(b => !deletedIds.has(b.id)).map((b) => {
                const c = Array.isArray(b.customers) ? b.customers[0] : b.customers;
                const s = Array.isArray(b.services) ? b.services[0] : b.services;
                return (
                  <div key={b.id} style={{ borderBottom: "1px solid rgba(245,233,208,.08)", padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: "var(--cream)", letterSpacing: ".04em" }}>{c?.name ?? "—"}</div>
                      <div style={{ fontSize: 12, color: "rgba(245,233,208,.5)", marginTop: 3 }}>
                        <span data-sr>{s?.name_sr ?? "—"}</span>
                        <span data-lat>{s?.name_lat ?? "—"}</span>
                        {" · "}{b.date} {b.time_slot.slice(0, 5)}
                      </div>
                      {c?.phone && <div style={{ fontSize: 12, color: "rgba(245,233,208,.35)" }}>{c.phone}</div>}
                    </div>
                    {cancelledIsOwner && (
                      <button
                        style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--danger)", background: "none", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", letterSpacing: ".06em", flexShrink: 0 }}
                        onClick={() => {
                          startTransition(async () => {
                            await deleteBookingFromStats(b.id);
                            setDeletedIds(prev => new Set(prev).add(b.id));
                          });
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

function StatBox({ labelSr, labelLat, value, unit, subSr, subLat, tone, onClick, loading }: {
  labelSr: string;
  labelLat: string;
  value: string;
  unit?: string;
  subSr?: string;
  subLat?: string;
  tone?: "danger";
  onClick?: () => void;
  loading?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className="stat-box"
      onClick={onClick}
      style={onClick ? { cursor: "pointer", position: "relative", WebkitTapHighlightColor: "transparent" } : undefined}
      {...(Tag === "button" ? { type: "button" as const } : {})}
    >
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)", borderRadius: "inherit", zIndex: 1 }}>
          <span style={{ width: 18, height: 18, border: "2px solid rgba(245,233,208,.2)", borderTopColor: "var(--mustard)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
        </div>
      )}
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
      {onClick && (
        <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "rgba(245,233,208,.25)", letterSpacing: ".05em", fontFamily: "'Oswald', sans-serif" }}>
          ▸
        </div>
      )}
    </Tag>
  );
}

function SheetHeader({ titleSr, titleLat, onClose }: { titleSr: string; titleLat: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(245,233,208,.08)", flexShrink: 0 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: ".08em", color: "var(--cream)" }}>
        <span data-sr>{titleSr}</span>
        <span data-lat>{titleLat}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,233,208,.5)", fontSize: 22, lineHeight: 1, padding: "0 4px", fontFamily: "sans-serif" }}
        aria-label="Zatvori"
      >
        ×
      </button>
    </div>
  );
}
