"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateBookingStatus } from "./actions";

type Booking = {
  id: string;
  time_slot: string;
  status: string;
  surcharge_applied?: boolean | null;
  notes?: string | null;
  customers?: { name?: string | null; phone?: string | null; no_show_flag?: boolean | null } | null;
  services?: { name_sr?: string | null; name_lat?: string | null; duration_min?: number | null; price?: number | null } | null;
};

type WeekBooking = { id: string; date: string; time_slot: string; status: string; services?: { name_sr?: string | null; duration_min?: number | null } | null };

const SR_DAYS = ["ПОН", "УТО", "СРЕ", "ЧЕТ", "ПЕТ", "СУБ", "НЕД"];
const LAT_DAYS = ["PON", "UTO", "SRE", "ČET", "PET", "SUB", "NED"];

export function TerminiClient({ todayBookings, weekBookings, today, weekFrom }: {
  todayBookings: Booking[];
  weekBookings: WeekBooking[];
  today: string;
  weekFrom: string;
  weekTo: string;
}) {
  const [view, setView] = useState<"today" | "week">("today");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [pending, start] = useTransition();

  const upcoming = todayBookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const nextIdx = upcoming.findIndex((b) => b.time_slot >= new Date().toTimeString().slice(0, 5));

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>{formatLongDate(today, "sr")}</span>
            <span data-lat>{formatLongDate(today, "lat")}</span>
          </div>
          <div className="adm-page-subtitle">
            {todayBookings.length} {todayBookings.length === 1 ? "termin" : "termina"}
          </div>
        </div>
        <Link href="/admin/termini/novi" className="adm-fab-btn" aria-label="add">+</Link>
      </div>

      <div className="adm-toggle" style={{ marginBottom: 16 }}>
        <button type="button" className={`adm-toggle-opt ${view === "today" ? "active" : ""}`} onClick={() => setView("today")}>
          <span data-sr>ДАНАС</span>
          <span data-lat>DANAS</span>
        </button>
        <button type="button" className={`adm-toggle-opt ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>
          <span data-sr>НЕДЕЉА</span>
          <span data-lat>NEDELJA</span>
        </button>
      </div>

      {view === "today" && (
        <>
          {todayBookings.length === 0 ? (
            <div className="adm-empty">
              <span data-sr>Нема термина за данас.</span>
              <span data-lat>Nema termina za danas.</span>
            </div>
          ) : (
            todayBookings.map((b, i) => {
              const isNext = upcoming[nextIdx]?.id === b.id;
              const cls = `adm-card ${isNext ? "next" : ""} ${b.status === "done" || b.status === "no_show" || b.status === "cancelled" ? "done" : ""}`;
              return (
                <div key={b.id} className={cls} onClick={() => setSelected(b)} style={{ cursor: "pointer" }}>
                  <div style={{ minWidth: 56 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: "var(--mustard)", fontWeight: 500 }}>
                      {b.time_slot.slice(0, 5)}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(245,233,208,.4)", letterSpacing: ".06em" }}>
                      {b.services?.duration_min ?? 30}min
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--cream)", letterSpacing: ".04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.customers?.name ?? "—"}
                      {b.customers?.no_show_flag && <span style={{ marginLeft: 6, color: "var(--danger)", fontSize: 11 }}>⚠</span>}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.4)" }}>
                      <span data-sr>{b.services?.name_sr ?? ""}</span>
                      <span data-lat>{b.services?.name_lat ?? ""}</span>
                      {" · "}
                      {b.services?.price ?? 0} RSD
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div className={`adm-status-dot ${b.status.replace("_", "-")}`} />
                    {isNext && <div style={{ background: "var(--mustard)", color: "var(--brown-950)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, padding: "2px 6px", letterSpacing: ".08em" }}>NEXT</div>}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {view === "week" && <WeekHeatmap weekBookings={weekBookings} weekFrom={weekFrom} />}

      {selected && (
        <BookingDetailSheet
          booking={selected}
          pending={pending}
          onClose={() => setSelected(null)}
          onAction={(status) => {
            start(async () => {
              await updateBookingStatus(selected.id, status);
              setSelected(null);
            });
          }}
        />
      )}
    </>
  );
}

function WeekHeatmap({ weekBookings, weekFrom }: { weekBookings: WeekBooking[]; weekFrom: string }) {
  const days: { date: string; dow: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekFrom + "T00:00:00");
    d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().split("T")[0], dow: i });
  }
  const byDate: Record<string, WeekBooking[]> = {};
  for (const b of weekBookings) {
    byDate[b.date] = byDate[b.date] ?? [];
    byDate[b.date].push(b);
  }

  return (
    <div>
      {days.map(({ date, dow }) => {
        const list = byDate[date] ?? [];
        return (
          <div key={date} className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em" }} data-sr>{SR_DAYS[dow]}</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em" }} data-lat>{LAT_DAYS[dow]}</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontStyle: "italic", color: "var(--cream)", marginLeft: 8 }}>
                  {date.split("-")[2]}.{date.split("-")[1]}.
                </span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: list.length ? "var(--mustard)" : "rgba(245,233,208,.3)" }}>
                {list.length} {list.length === 1 ? "term." : "term."}
              </span>
            </div>
            {list.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {list.map((b) => (
                  <span key={b.id} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "2px 6px", background: "rgba(212,165,58,.12)", color: "var(--cream)" }}>
                    {b.time_slot.slice(0, 5)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookingDetailSheet({ booking, pending, onClose, onAction }: {
  booking: Booking;
  pending: boolean;
  onClose: () => void;
  onAction: (s: "done" | "no_show" | "cancelled" | "confirmed") => void;
}) {
  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          <span data-sr>ДЕТАЉИ ТЕРМИНА</span>
          <span data-lat>DETALJI TERMINA</span>
        </div>

        <div style={{ padding: "0 24px 16px" }}>
          {booking.customers?.no_show_flag && (
            <div className="adm-banner warn">
              <span data-sr>⚠ Ова мушterija није дошла прошли пут.</span>
              <span data-lat>⚠ Ova mušterija nije došla prošli put.</span>
            </div>
          )}

          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontStyle: "italic", color: "var(--cream)", marginBottom: 4 }}>
            {booking.customers?.name ?? "—"}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--mustard)", marginBottom: 16 }}>
            {booking.customers?.phone ?? "—"}
          </div>

          <div className="adm-row">
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }} data-sr>УСЛУГА</span>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }} data-lat>USLUGA</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--cream)" }}>
              <span data-sr>{booking.services?.name_sr}</span>
              <span data-lat>{booking.services?.name_lat}</span>
            </span>
          </div>
          <div className="adm-row">
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }} data-sr>ВРЕМЕ</span>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }} data-lat>VREME</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--cream)" }}>
              {booking.time_slot.slice(0, 5)} · {booking.services?.duration_min ?? 30}min
            </span>
          </div>
          <div className="adm-row">
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }} data-sr>ЦЕНА</span>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }} data-lat>CENA</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontStyle: "italic", color: "var(--mustard)" }}>
              {booking.services?.price ?? 0} RSD
            </span>
          </div>
          <div className="adm-row">
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }}>STATUS</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--cream)", textTransform: "uppercase" }}>
              {booking.status}
            </span>
          </div>
          {booking.notes && (
            <div className="adm-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".08em" }}>NOTES</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--cream)", marginTop: 4 }}>{booking.notes}</span>
            </div>
          )}

          {(booking.status === "confirmed" || booking.status === "pending") && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="adm-btn adm-btn-block" disabled={pending} onClick={() => onAction("done")}>
                ✓ <span data-sr>ОБАВЉЕНО</span><span data-lat>OBAVLJENO</span>
              </button>
              <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={() => onAction("no_show")}>
                ✗ NO-SHOW
              </button>
            </div>
          )}
          {(booking.status === "confirmed" || booking.status === "pending") && (
            <button className="adm-btn adm-btn-secondary adm-btn-block" style={{ marginTop: 8 }} disabled={pending} onClick={() => onAction("cancelled")}>
              <span data-sr>ОТКАЖИ</span>
              <span data-lat>OTKAŽI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLongDate(dateStr: string, lang: "sr" | "lat"): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = lang === "sr" ? ["НЕДЕЉА", "ПОНЕДЕЉАК", "УТОРАК", "СРЕДА", "ЧЕТВРТАК", "ПЕТАК", "СУБОТА"] : ["NEDELJA", "PONEDELJAK", "UTORAK", "SREDA", "ČETVRTAK", "PETAK", "SUBOTA"];
  const months = lang === "sr" ? ["ЈАНУАР", "ФЕБРУАР", "МАРТ", "АПРИЛ", "МАЈ", "ЈУН", "ЈУЛ", "АВГУСТ", "СЕПТЕМБАР", "ОКТОБАР", "НОВЕМБАР", "ДЕЦЕМБАР"] : ["JANUAR", "FEBRUAR", "MART", "APRIL", "MAJ", "JUN", "JUL", "AVGUST", "SEPTEMBAR", "OKTOBAR", "NOVEMBAR", "DECEMBAR"];
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
}
