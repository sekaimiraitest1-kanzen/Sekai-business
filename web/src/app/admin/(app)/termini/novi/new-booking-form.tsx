"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWalkInBooking, getMyTakenSlots } from "../actions";

type Service = { id: string; name_sr: string; name_lat: string; duration_min: number; price: number };
type Customer = { id: string; name: string | null; phone: string };
type WH = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

const SR_DAYS_SHORT = ["НД", "ПН", "УТ", "СР", "ЧТ", "ПТ", "СУ"];
const LAT_DAYS_SHORT = ["ND", "PN", "UT", "SR", "ČT", "PT", "SU"];
const SR_MONTHS_SHORT = ["јан", "феб", "мар", "апр", "мај", "јун", "јул", "авг", "сеп", "окт", "нов", "дец"];
const LAT_MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
function dayKey(d: Date): keyof WH {
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[d.getDay()];
}
function todayStr() {
  return fmtDate(new Date());
}

/**
 * Generate all 30-minute booking-start slots within a day's working hours,
 * minus the ones taken (with duration overlap consideration).
 */
function freeSlots(open: string, close: string, durationMin: number, taken: string[]): string[] {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const startM = oh * 60 + om;
  const endM = ch * 60 + cm - durationMin; // last bookable start
  const takenSet = new Set(taken);

  const slots: string[] = [];
  for (let m = startM; m <= endM; m += 30) {
    const slot = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    // simple conflict check: slot itself is not taken
    // (not checking duration overlap with prior bookings — simple model: each slot is 30min unit)
    if (!takenSet.has(slot)) slots.push(slot);
  }
  return slots;
}

function groupSlotsByPeriod(slots: string[]): { jutro: string[]; popodne: string[]; vece: string[] } {
  const jutro: string[] = [];
  const popodne: string[] = [];
  const vece: string[] = [];
  for (const s of slots) {
    const h = parseInt(s.slice(0, 2));
    if (h < 12) jutro.push(s);
    else if (h < 17) popodne.push(s);
    else vece.push(s);
  }
  return { jutro, popodne, vece };
}

export function NewBookingForm({ services, workingHours, recentCustomers }: {
  services: Service[];
  workingHours: WH | null;
  recentCustomers: Customer[];
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [date, setDate] = useState<string>(todayStr());
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [showTaken, setShowTaken] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);
  const matchedCustomer = recentCustomers.find((c) => c.phone === phone.trim());

  useEffect(() => {
    if (matchedCustomer && !name) setName(matchedCustomer.name ?? "");
  }, [matchedCustomer, name]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    (async () => {
      const slots = await getMyTakenSlots(date);
      if (!cancelled) setTaken(slots);
    })();
    return () => { cancelled = true; };
  }, [date]);

  const dateOptions = useMemo(() => {
    const opts: { date: string; dow: number; isClosed: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const k = fmtDate(d);
      const isClosed = workingHours ? workingHours[dayKey(d)] === null : false;
      opts.push({ date: k, dow: d.getDay(), isClosed });
    }
    return opts;
  }, [workingHours]);

  const free = useMemo(() => {
    if (!date || !selectedService || !workingHours) return [];
    const wh = workingHours[dayKey(new Date(date + "T00:00:00"))];
    if (!wh) return [];
    return freeSlots(wh.open, wh.close, selectedService.duration_min, taken);
  }, [date, selectedService, workingHours, taken]);

  const grouped = useMemo(() => groupSlotsByPeriod(free), [free]);
  const closedDay = workingHours && date ? workingHours[dayKey(new Date(date + "T00:00:00"))] === null : false;

  function submit() {
    if (!serviceId || !date || !timeSlot || !phone.trim() || !name.trim()) return;
    setErr(null);
    start(async () => {
      const res = await createWalkInBooking({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        serviceId,
        date,
        timeSlot,
        notes: notes.trim() || undefined,
      });
      if (res.ok) {
        router.replace("/admin/termini");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/termini" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)", textDecoration: "none", letterSpacing: ".08em" }}>
          ← <span data-sr>ТЕРМИНИ</span><span data-lat>TERMINI</span>
        </Link>
      </div>

      <div className="trm-header">
        <div className="trm-subtitle">
          <span data-sr>WALK-IN ИЛИ РУЧНИ УПИС</span>
          <span data-lat>WALK-IN ILI RUČNI UPIS</span>
        </div>
        <div className="trm-title">
          <span data-sr>Нови </span>
          <span data-lat>Novi </span>
          <em className="trm-title-em">
            <span data-sr>термин</span>
            <span data-lat>termin</span>
          </em>
        </div>
      </div>

      {/* ── 1. Customer ────────────────────────────── */}
      <div className="nb-section">
        <div className="nb-section-title">
          <span data-sr>МУШТЕРИЈА</span><span data-lat>MUŠTERIJA</span>
        </div>
        <input
          className="adm-input"
          type="tel"
          inputMode="tel"
          placeholder="065 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        {matchedCustomer && (
          <div className="nb-match">
            ✓ <span data-sr>{matchedCustomer.name} — постојећа мушterija</span>
            <span data-lat>{matchedCustomer.name} — postojeća mušterija</span>
          </div>
        )}
        <input className="adm-input" placeholder="Marko Marković" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* ── 2. Service ─────────────────────────────── */}
      <div className="nb-section">
        <div className="nb-section-title">
          <span data-sr>УСЛУГА</span><span data-lat>USLUGA</span>
        </div>
        <select
          className="adm-input"
          value={serviceId}
          onChange={(e) => { setServiceId(e.target.value); setTimeSlot(""); }}
        >
          {services.length === 0 && <option value="">— nema aktivnih usluga —</option>}
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_lat} · {s.duration_min} min · {s.price} RSD
            </option>
          ))}
        </select>
      </div>

      {/* ── 3. Date strip ──────────────────────────── */}
      <div className="nb-section">
        <div className="nb-section-title">
          <span data-sr>ДАТУМ</span><span data-lat>DATUM</span>
        </div>
        <div className="nb-date-strip">
          {dateOptions.map(({ date: k, dow, isClosed }) => {
            const d = new Date(k + "T00:00:00");
            const isToday = k === todayStr();
            const isSelected = date === k;
            const cls = ["nb-date-pill", isToday ? "today" : "", isClosed ? "closed" : "", isSelected ? "selected" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={k}
                type="button"
                className={cls}
                disabled={isClosed}
                onClick={() => { setDate(k); setTimeSlot(""); }}
              >
                <div className="nb-date-dow">
                  <span data-sr>{SR_DAYS_SHORT[dow]}</span>
                  <span data-lat>{LAT_DAYS_SHORT[dow]}</span>
                </div>
                <div className="nb-date-num">{d.getDate()}</div>
                <div className="nb-date-mo">
                  <span data-sr>{SR_MONTHS_SHORT[d.getMonth()]}</span>
                  <span data-lat>{LAT_MONTHS_SHORT[d.getMonth()]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Time slots — only free shown ─────────── */}
      <div className="nb-section">
        <div className="nb-section-title-row">
          <div className="nb-section-title" style={{ marginBottom: 0 }}>
            <span data-sr>СЛОБОДАН ТЕРМИН</span><span data-lat>SLOBODAN TERMIN</span>
          </div>
          {selectedService && !closedDay && (
            <div className="nb-section-meta">
              {free.length} <span data-sr>слободних</span><span data-lat>slobodnih</span>
              {taken.length > 0 && <span style={{ opacity: 0.5 }}> · {taken.length} <span data-sr>заузетих</span><span data-lat>zauzetih</span></span>}
            </div>
          )}
        </div>

        {closedDay ? (
          <div className="nb-empty">
            <span data-sr>🚫 Затворено тог дана.</span>
            <span data-lat>🚫 Zatvoreno tog dana.</span>
          </div>
        ) : !selectedService ? (
          <div className="nb-empty">
            <span data-sr>Изабери услугу прво.</span>
            <span data-lat>Izaberi uslugu prvo.</span>
          </div>
        ) : free.length === 0 ? (
          <div className="nb-empty">
            <span data-sr>Нема слободних термина за овај дан. Изабери други датум.</span>
            <span data-lat>Nema slobodnih termina za ovaj dan. Izaberi drugi datum.</span>
          </div>
        ) : (
          <>
            {grouped.jutro.length > 0 && (
              <SlotGroup labelSr="ЈУТРО" labelLat="JUTRO" slots={grouped.jutro} selected={timeSlot} onPick={setTimeSlot} duration={selectedService.duration_min} />
            )}
            {grouped.popodne.length > 0 && (
              <SlotGroup labelSr="ПОПОДНЕ" labelLat="POPODNE" slots={grouped.popodne} selected={timeSlot} onPick={setTimeSlot} duration={selectedService.duration_min} />
            )}
            {grouped.vece.length > 0 && (
              <SlotGroup labelSr="ВЕЧЕ" labelLat="VEČE" slots={grouped.vece} selected={timeSlot} onPick={setTimeSlot} duration={selectedService.duration_min} />
            )}

            {taken.length > 0 && (
              <div className="nb-taken-toggle">
                <button type="button" onClick={() => setShowTaken((s) => !s)}>
                  {showTaken ? "▾" : "▸"}
                  <span data-sr> Прикажи заузете ({taken.length})</span>
                  <span data-lat> Prikaži zauzete ({taken.length})</span>
                </button>
                {showTaken && (
                  <div className="nb-taken-list">
                    {taken.map((t) => <span key={t} className="nb-taken-chip">{t}</span>)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 5. Notes ───────────────────────────────── */}
      <div className="nb-section">
        <div className="nb-section-title">
          <span data-sr>БЕЛЕШКЕ (ОПЦИОНО)</span>
          <span data-lat>BELEŠKE (OPCIONO)</span>
        </div>
        <textarea className="adm-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Walk-in, voli kratko sa strane…" />
      </div>

      {err && (
        <div className="adm-banner warn" style={{ marginTop: 12 }}>
          {err === "BOOKING_FAILED" ? "Greška pri kreiranju — slot možda zauzet." : `Greška: ${err}`}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Link href="/admin/termini" className="adm-btn adm-btn-secondary adm-btn-block" style={{ flex: 1, textDecoration: "none" }}>
          <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
        </Link>
        <button
          type="button"
          className="adm-btn adm-btn-block"
          style={{ flex: 2 }}
          disabled={pending || !name.trim() || !phone.trim() || !serviceId || !date || !timeSlot}
          onClick={submit}
        >
          {pending ? "..." : <><span data-sr>ДОДАЈ ТЕРМИН →</span><span data-lat>DODAJ TERMIN →</span></>}
        </button>
      </div>
    </>
  );
}

function SlotGroup({ labelSr, labelLat, slots, selected, onPick, duration }: {
  labelSr: string;
  labelLat: string;
  slots: string[];
  selected: string;
  onPick: (s: string) => void;
  duration: number;
}) {
  return (
    <div className="nb-slot-group">
      <div className="nb-slot-group-label">
        <span data-sr>{labelSr}</span>
        <span data-lat>{labelLat}</span>
        <span className="nb-slot-group-count"> · {slots.length}</span>
      </div>
      <div className="nb-slot-grid">
        {slots.map((s) => {
          const isSelected = selected === s;
          // Compute end time for visual context
          const [h, m] = s.split(":").map(Number);
          const endM = h * 60 + m + duration;
          const endStr = `${String(Math.floor(endM / 60)).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
          return (
            <button
              key={s}
              type="button"
              className={`nb-slot ${isSelected ? "selected" : ""}`}
              onClick={() => onPick(s)}
            >
              <div className="nb-slot-time">{s}</div>
              <div className="nb-slot-end">→ {endStr}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
