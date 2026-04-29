"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { updateBookingStatus } from "./actions";

type Customer = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  no_show_flag?: boolean | null;
  no_show_count?: number | null;
  created_at?: string | null;
};
type Service = {
  name_sr?: string | null;
  name_lat?: string | null;
  duration_min?: number | null;
  price?: number | null;
};
type Booking = {
  id: string;
  time_slot: string;
  status: string;
  surcharge_applied?: boolean | null;
  notes?: string | null;
  customers?: Customer | Customer[] | null;
  services?: Service | Service[] | null;
};
type WeekBooking = { id: string; date: string; time_slot: string; status: string; services?: Service | Service[] | null };
type MonthBooking = { date: string; status: string };
type WH = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

const SR_DAYS_SHORT = ["ПН", "УТ", "СР", "ЧТ", "ПТ", "СУ", "НД"];
const LAT_DAYS_SHORT = ["PN", "UT", "SR", "ČT", "PT", "SU", "ND"];
const SR_MONTHS = ["ЈАНУАР", "ФЕБРУАР", "МАРТ", "АПРИЛ", "МАЈ", "ЈУН", "ЈУЛ", "АВГУСТ", "СЕПТЕМБАР", "ОКТОБАР", "НОВЕМБАР", "ДЕЦЕМБАР"];
const LAT_MONTHS = ["JANUAR", "FEBRUAR", "MART", "APRIL", "MAJ", "JUN", "JUL", "AVGUST", "SEPTEMBAR", "OKTOBAR", "NOVEMBAR", "DECEMBAR"];

function unwrap<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

export function TerminiClient({
  todayBookings,
  weekBookings,
  monthBookings,
  today,
  weekFrom,
  weekTo,
  monthFrom,
  workingHours,
}: {
  todayBookings: Booking[];
  weekBookings: WeekBooking[];
  monthBookings: MonthBooking[];
  today: string;
  weekFrom: string;
  weekTo: string;
  monthFrom: string;
  workingHours: WH | null;
}) {
  const [view, setView] = useState<"today" | "week">("today");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [pending, startTransition] = useTransition();

  // Today stats
  const nowStr = new Date().toTimeString().slice(0, 5);
  const upcoming = todayBookings.filter((b) => (b.status === "confirmed" || b.status === "pending") && b.time_slot.slice(0, 5) >= nowStr);
  const doneToday = todayBookings.filter((b) => b.status === "done").length;
  const upcomingCount = upcoming.length;
  const revenueToday = todayBookings
    .filter((b) => b.status === "done")
    .reduce((sum, b) => sum + (unwrap(b.services)?.price ?? 0), 0);
  const nextId = upcoming[0]?.id;

  // Week range label
  const weekLabel = useMemo(() => {
    const a = new Date(weekFrom + "T00:00:00");
    const b = new Date(weekTo + "T00:00:00");
    return { srShort: `${a.getDate()}. — ${b.getDate()}. ${SR_MONTHS[b.getMonth()].slice(0, 3).toLowerCase()}`, latShort: `${a.getDate()}. — ${b.getDate()}. ${LAT_MONTHS[b.getMonth()].slice(0, 3).toLowerCase()}` };
  }, [weekFrom, weekTo]);

  return (
    <>
      {/* ── HEADER: subtitle + italic title ─────────── */}
      <div className="trm-header">
        <div className="trm-subtitle">
          <span data-sr>{formatLongDate(today, "sr")}</span>
          <span data-lat>{formatLongDate(today, "lat")}</span>
        </div>
        <div className="trm-title">
          {view === "today" ? (
            <>
              <span className="trm-title-prefix" data-sr>Данас </span>
              <span className="trm-title-prefix" data-lat>Danas </span>
              <em className="trm-title-em">
                {todayBookings.length}
                <span data-sr> термина</span>
                <span data-lat> termina</span>
              </em>
            </>
          ) : (
            <>
              <em className="trm-title-em" style={{ marginRight: 6 }}>
                <span data-sr>Ова</span>
                <span data-lat>Ova</span>
              </em>
              <span data-sr> недеља</span>
              <span data-lat> nedelja</span>
            </>
          )}
        </div>
      </div>

      {/* ── TOGGLE ──────────────────────────────────── */}
      <div className="adm-toggle" style={{ marginBottom: 16 }}>
        <button type="button" className={`adm-toggle-opt ${view === "today" ? "active" : ""}`} onClick={() => setView("today")}>
          <span data-sr>ДАНАС</span><span data-lat>DANAS</span>
        </button>
        <button type="button" className={`adm-toggle-opt ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>
          <span data-sr>НЕДЕЉА</span><span data-lat>NEDELJA</span>
        </button>
      </div>

      {/* ── VIEW: TODAY ─────────────────────────────── */}
      {view === "today" && (
        <>
          <div className="trm-stats">
            <StatPill value={String(doneToday)} labelSr="готово" labelLat="gotovo" />
            <StatPill value={String(upcomingCount)} labelSr="до краја" labelLat="do kraja" />
            <StatPill value={revenueToday.toLocaleString("sr-RS")} labelSr="РСД данас" labelLat="RSD danas" small />
          </div>

          <div className="trm-eyebrow">
            <span data-sr>— РАСПОРЕД</span>
            <span data-lat>— RASPORED</span>
          </div>

          {todayBookings.length === 0 ? (
            <div className="adm-empty">
              <span data-sr>Нема термина за данас.</span>
              <span data-lat>Nema termina za danas.</span>
            </div>
          ) : (
            <div className="trm-timeline">
              {todayBookings.map((b) => (
                <TimelineRow key={b.id} booking={b} isNext={b.id === nextId} onSelect={() => setSelected(b)} />
              ))}
            </div>
          )}

          <Link href="/admin/termini/novi" className="trm-fab" aria-label="Add booking">+</Link>
        </>
      )}

      {/* ── VIEW: WEEK (month heatmap) ──────────────── */}
      {view === "week" && (
        <>
          <div className="trm-week-summary">
            <span data-sr>{weekLabel.srShort} · {weekBookings.length} термина</span>
            <span data-lat>{weekLabel.latShort} · {weekBookings.length} termina</span>
          </div>
          <MonthHeatmap monthFrom={monthFrom} monthBookings={monthBookings} weekFrom={weekFrom} weekTo={weekTo} workingHours={workingHours} />
        </>
      )}

      {/* ── DETAIL SHEET ────────────────────────────── */}
      {selected && (
        <BookingDetailSheet
          booking={selected}
          isNext={selected.id === nextId}
          pending={pending}
          onClose={() => setSelected(null)}
          onAction={(status) =>
            startTransition(async () => {
              await updateBookingStatus(selected.id, status);
              setSelected(null);
            })
          }
        />
      )}
    </>
  );
}

// ── TIMELINE ROW ──────────────────────────────────
function TimelineRow({ booking, isNext, onSelect }: { booking: Booking; isNext: boolean; onSelect: () => void }) {
  const customer = unwrap(booking.customers);
  const service = unwrap(booking.services);
  const isDone = booking.status === "done" || booking.status === "no_show" || booking.status === "cancelled";

  return (
    <div className={`trm-row ${isNext ? "next" : ""} ${isDone ? "done" : ""}`} onClick={onSelect}>
      <div className="trm-row-time">
        <div className="trm-row-time-val">{booking.time_slot.slice(0, 5)}</div>
        <div className="trm-row-time-dur">{service?.duration_min ?? 30}min</div>
      </div>
      <div className="trm-row-body">
        <div className="trm-row-name">
          {customer?.name ?? "—"}
          {customer?.no_show_flag && <span className="trm-row-warn" aria-label="no-show flag">⚠</span>}
        </div>
        <div className="trm-row-meta">
          <span data-sr>{service?.name_sr ?? ""}</span>
          <span data-lat>{service?.name_lat ?? ""}</span>
          <span style={{ opacity: 0.5 }}> · {service?.price ?? 0} RSD</span>
        </div>
      </div>
      <div className="trm-row-side">
        <div className={`trm-row-dot ${booking.status.replace("_", "-")}`} aria-label={`status ${booking.status}`} />
        {isNext && <div className="trm-row-next-badge">NEXT</div>}
      </div>
    </div>
  );
}

// ── 3-STAT PILLS ──────────────────────────────────
function StatPill({ value, labelSr, labelLat, small = false }: { value: string; labelSr: string; labelLat: string; small?: boolean }) {
  return (
    <div className="trm-stat">
      <div className="trm-stat-row">
        <span className={`trm-stat-val ${small ? "small" : ""}`}>{value}</span>
        <span className="trm-stat-lbl">
          <span data-sr>{labelSr}</span>
          <span data-lat>{labelLat}</span>
        </span>
      </div>
    </div>
  );
}

// ── MONTH HEATMAP ─────────────────────────────────
function MonthHeatmap({ monthFrom, monthBookings, weekFrom, weekTo, workingHours }: {
  monthFrom: string;
  monthBookings: MonthBooking[];
  weekFrom: string;
  weekTo: string;
  workingHours: WH | null;
}) {
  const first = new Date(monthFrom + "T00:00:00");
  const monthName = first.getMonth();
  const year = first.getFullYear();
  const daysInMonth = new Date(year, monthName + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon=0

  // Build counts per date
  const counts: Record<string, number> = {};
  for (const b of monthBookings) {
    counts[b.date] = (counts[b.date] ?? 0) + 1;
  }
  const max = Math.max(1, ...Object.values(counts));

  const days: { day: number; key: string; count: number; isClosed: boolean; isInWeek: boolean; isToday: boolean }[] = [];
  const todayStr = new Date().toISOString().split("T")[0];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, monthName, d);
    const key = dt.toISOString().split("T")[0];
    const dow = dt.getDay();
    const dayKey = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[dow];
    const isClosed = workingHours ? workingHours[dayKey] === null : false;
    const isInWeek = key >= weekFrom && key <= weekTo;
    const isToday = key === todayStr;
    days.push({ day: d, key, count: counts[key] ?? 0, isClosed, isInWeek, isToday });
  }

  return (
    <div className="trm-cal">
      <div className="trm-cal-header">
        <button className="trm-cal-nav" type="button" disabled aria-label="prev month">←</button>
        <div className="trm-cal-month">
          <span data-sr>{SR_MONTHS[monthName]} {year}</span>
          <span data-lat>{LAT_MONTHS[monthName]} {year}</span>
        </div>
        <button className="trm-cal-nav" type="button" disabled aria-label="next month">→</button>
      </div>

      <div className="trm-cal-weekdays">
        {SR_DAYS_SHORT.map((d, i) => (
          <div key={d} className="trm-cal-weekday">
            <span data-sr>{d}</span>
            <span data-lat>{LAT_DAYS_SHORT[i]}</span>
          </div>
        ))}
      </div>

      <div className="trm-cal-grid">
        {Array.from({ length: startDow }, (_, i) => <div key={`e${i}`} className="trm-cal-cell empty" />)}
        {days.map((d) => {
          const intensity = Math.round((d.count / max) * 100);
          const cls = [
            "trm-cal-cell",
            d.count > 0 ? "filled" : "",
            d.isClosed ? "closed" : "",
            d.isInWeek ? "in-week" : "",
            d.isToday ? "today" : "",
          ].filter(Boolean).join(" ");
          const bg = d.count > 0 ? `rgba(212,165,58,${0.18 + (intensity / 100) * 0.6})` : "";
          return (
            <div key={d.key} className={cls} style={d.count > 0 ? { background: bg } : undefined}>
              <div className="trm-cal-day">{d.day}</div>
              {d.count > 0 && <div className="trm-cal-count">{d.count}</div>}
            </div>
          );
        })}
      </div>

      <div className="trm-cal-legend">
        <span data-sr>Гушће боје → виши број резервација</span>
        <span data-lat>Gušće boje → veći broj rezervacija</span>
      </div>
    </div>
  );
}

// ── DETAIL SHEET ──────────────────────────────────
function BookingDetailSheet({ booking, isNext, pending, onClose, onAction }: {
  booking: Booking;
  isNext: boolean;
  pending: boolean;
  onClose: () => void;
  onAction: (s: "done" | "no_show" | "cancelled" | "confirmed") => void;
}) {
  const customer = unwrap(booking.customers);
  const service = unwrap(booking.services);

  // Time-until
  const now = new Date();
  const [hh, mm] = booking.time_slot.slice(0, 5).split(":").map(Number);
  const slotDate = new Date();
  slotDate.setHours(hh, mm, 0, 0);
  const minsUntil = Math.round((slotDate.getTime() - now.getTime()) / 60000);

  // First-visit string from customer.created_at
  const firstVisit = customer?.created_at ? new Date(customer.created_at) : null;
  const visitsCount = (customer?.no_show_count ?? 0); // approximate — we don't track total visits in customer table directly

  const isUpcoming = booking.status === "confirmed" || booking.status === "pending";
  const canCall = !!customer?.phone;
  const isClosable = isUpcoming;

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet trm-detail-sheet">
        {isNext && (
          <div className="trm-detail-band">
            <span data-sr>СЛЕДЕЋИ ТЕРМИН · {booking.time_slot.slice(0, 5)}</span>
            <span data-lat>SLEDEĆI TERMIN · {booking.time_slot.slice(0, 5)}</span>
          </div>
        )}

        <div className="trm-detail-back">
          <button type="button" onClick={onClose} className="trm-detail-back-btn">
            ← <span data-sr>НАЗАД</span><span data-lat>NAZAD</span>
          </button>
        </div>

        {customer?.no_show_flag && (
          <div className="adm-banner warn" style={{ margin: "0 20px 12px" }}>
            <span data-sr>⚠ Ова мушterija није дошла прошли пут.</span>
            <span data-lat>⚠ Ova mušterija nije došla prošli put.</span>
          </div>
        )}

        <div className="trm-detail-main">
          <h2 className="trm-detail-name">{customer?.name ?? "—"}</h2>
          <div className="trm-detail-sub">
            {customer?.phone ? <a href={`tel:${customer.phone}`} style={{ color: "var(--mustard)", textDecoration: "none" }}>{customer.phone}</a> : "—"}
          </div>

          <div className="trm-detail-rows">
            <DetailRow labelSr="ДАТУМ" labelLat="DATUM" value={formatShortDate(new Date().toISOString().split("T")[0])} hint="DANAS" hintColor="success" />
            <DetailRow
              labelSr="ВРЕМЕ"
              labelLat="VREME"
              value={booking.time_slot.slice(0, 5)}
              hint={
                isUpcoming
                  ? minsUntil > 0
                    ? `за ${minsUntil} min`
                    : minsUntil > -10 ? "сада" : "у прошлости"
                  : booking.status === "done" ? "обављено" : booking.status === "no_show" ? "no-show" : "отказано"
              }
            />
            <DetailRow
              labelSr="УСЛУГА"
              labelLat="USLUGA"
              value={service?.name_lat ?? "—"}
              hint={`${service?.duration_min ?? 30} min`}
            />
            <DetailRow labelSr="ЦЕНА" labelLat="CENA" value={String(service?.price ?? 0)} hint="RSD" big />
            <DetailRow
              labelSr="ДОЛАЗИ"
              labelLat="DOLAZI"
              value={visitsCount > 0 ? `${visitsCount + 1}. пут` : "1. пут"}
              hint={firstVisit ? `од ${firstVisit.getDate()}.${firstVisit.getMonth() + 1}.${firstVisit.getFullYear()}` : ""}
            />
          </div>

          {/* Action buttons */}
          {isUpcoming && (
            <>
              <button className="trm-action-primary" disabled={pending} onClick={() => onAction("done")}>
                <span style={{ fontSize: 18, marginRight: 6 }}>✓</span>
                <span data-sr>ПРОГЛАСИ ГОТОВИМ</span>
                <span data-lat>PROGLASI GOTOVIM</span>
              </button>
              <div className="trm-action-row">
                {canCall && (
                  <a href={`tel:${customer?.phone}`} className="trm-action-secondary">
                    📞 <span data-sr>ПОЗОВИ</span><span data-lat>POZOVI</span>
                  </a>
                )}
                <button className="trm-action-secondary danger" disabled={pending} onClick={() => onAction("cancelled")}>
                  ✕ <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
                </button>
              </div>
              <button className="trm-action-tertiary" disabled={pending} onClick={() => onAction("no_show")}>
                <span data-sr>NO-SHOW (није дошао)</span>
                <span data-lat>NO-SHOW (nije došao)</span>
              </button>
            </>
          )}

          {!isUpcoming && (
            <div className="adm-banner info" style={{ marginTop: 16 }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>
                {booking.status === "done" ? "✓ Obavljeno" : booking.status === "no_show" ? "⚠ No-show" : "✕ Otkazano"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ labelSr, labelLat, value, hint, hintColor, big }: {
  labelSr: string;
  labelLat: string;
  value: string;
  hint?: string;
  hintColor?: "success" | "danger";
  big?: boolean;
}) {
  return (
    <div className="trm-detail-row">
      <div className="trm-detail-row-label">
        <span data-sr>{labelSr}</span>
        <span data-lat>{labelLat}</span>
      </div>
      <div className="trm-detail-row-vals">
        <div className={`trm-detail-row-value ${big ? "big" : ""}`}>{value}</div>
        {hint && (
          <div className={`trm-detail-row-hint ${hintColor === "success" ? "success" : ""} ${hintColor === "danger" ? "danger" : ""}`}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

// ── DATE FORMATTERS ──────────────────────────────
function formatLongDate(dateStr: string, lang: "sr" | "lat"): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = lang === "sr"
    ? ["НЕДЕЉА", "ПОНЕДЕЉАК", "УТОРАК", "СРЕДА", "ЧЕТВРТАК", "ПЕТАК", "СУБОТА"]
    : ["NEDELJA", "PONEDELJAK", "UTORAK", "SREDA", "ČETVRTAK", "PETAK", "SUBOTA"];
  const months = lang === "sr"
    ? ["ЈАНУАР", "ФЕБРУАР", "МАРТ", "АПРИЛ", "МАЈ", "ЈУН", "ЈУЛ", "АВГУСТ", "СЕПТЕМБАР", "ОКТОБАР", "НОВЕМБАР", "ДЕЦЕМБАР"]
    : ["JANUAR", "FEBRUAR", "MART", "APRIL", "MAJ", "JUN", "JUL", "AVGUST", "SEPTEMBAR", "OKTOBAR", "NOVEMBAR", "DECEMBAR"];
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}
