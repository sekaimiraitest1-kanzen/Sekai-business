"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWalkInBooking, getMyTakenSlots } from "../actions";

type Service = { id: string; name_sr: string; name_lat: string; duration_min: number; price: number };
type Customer = { id: string; name: string | null; phone: string };
type WH = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function dayKey(d: Date): keyof WH {
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[d.getDay()];
}
function generateSlots(open: string, close: string, durationMin: number): string[] {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const startM = oh * 60 + om;
  const endM = ch * 60 + cm - durationMin;
  const slots: string[] = [];
  for (let m = startM; m <= endM; m += 15) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
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
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);
  const matchedCustomer = recentCustomers.find((c) => c.phone === phone.trim());

  // auto-fill name when phone matches existing customer
  useEffect(() => {
    if (matchedCustomer && !name) setName(matchedCustomer.name ?? "");
  }, [matchedCustomer, name]);

  // load taken slots when date changes (server action uses admin session for salon scope)
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    (async () => {
      const slots = await getMyTakenSlots(date);
      if (!cancelled) setTaken(slots);
    })();
    return () => { cancelled = true; };
  }, [date]);

  const slots = useMemo(() => {
    if (!date || !selectedService || !workingHours) return [];
    const d = new Date(date + "T00:00:00");
    const wh = workingHours[dayKey(d)];
    if (!wh) return [];
    return generateSlots(wh.open, wh.close, selectedService.duration_min);
  }, [date, selectedService, workingHours]);

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

  const closedDay = workingHours && date ? workingHours[dayKey(new Date(date + "T00:00:00"))] === null : false;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/termini" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)", textDecoration: "none", letterSpacing: ".08em" }}>
          ← <span data-sr>ТЕРМИНИ</span><span data-lat>TERMINI</span>
        </Link>
      </div>

      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>НОВИ ТЕРМИН</span>
            <span data-lat>NOVI TERMIN</span>
          </div>
          <div className="adm-page-subtitle">
            <span data-sr>Walk-in или ручни упис</span>
            <span data-lat>Walk-in ili ručni upis</span>
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          <span data-sr>МУШТЕРИЈА</span><span data-lat>MUŠTERIJA</span>
        </div>
        <label className="adm-form-label">TELEFON</label>
        <input className="adm-input" type="tel" inputMode="tel" placeholder="065 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {matchedCustomer && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--success)" }}>
            ✓ <span data-sr>Постојећа мушterija — име попуњено</span>
            <span data-lat>Postojeća mušterija — ime popunjeno</span>
          </div>
        )}
        <label className="adm-form-label">IME I PREZIME</label>
        <input className="adm-input" placeholder="Marko Marković" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Service */}
      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, marginTop: 12 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          <span data-sr>УСЛУГА</span><span data-lat>USLUGA</span>
        </div>
        <select className="adm-input" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTimeSlot(""); }}>
          {services.length === 0 && <option value="">— nema aktivnih usluga —</option>}
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_lat} · {s.duration_min} min · {s.price} RSD
            </option>
          ))}
        </select>
      </div>

      {/* Date + time */}
      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, marginTop: 12 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          <span data-sr>ДАТУМ И ВРЕМЕ</span><span data-lat>DATUM I VREME</span>
        </div>
        <input className="adm-input" type="date" value={date} min={todayStr()} onChange={(e) => { setDate(e.target.value); setTimeSlot(""); }} />

        {closedDay ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--danger)", padding: 12, background: "rgba(166,61,42,.1)" }}>
            <span data-sr>Затворено тог дана.</span><span data-lat>Zatvoreno tog dana.</span>
          </div>
        ) : slots.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {slots.map((s) => {
              const isTaken = taken.includes(s);
              const isSelected = timeSlot === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={isTaken}
                  onClick={() => setTimeSlot(s)}
                  style={{
                    padding: "10px 4px",
                    background: isSelected ? "var(--mustard)" : isTaken ? "rgba(92,58,34,.2)" : "var(--brown-900)",
                    color: isSelected ? "var(--brown-950)" : isTaken ? "rgba(245,233,208,.3)" : "var(--cream)",
                    border: "1px solid " + (isSelected ? "var(--mustard)" : "rgba(245,233,208,.08)"),
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    cursor: isTaken ? "not-allowed" : "pointer",
                    textDecoration: isTaken ? "line-through" : "none",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(245,233,208,.4)" }}>
            <span data-sr>Изабери услугу и датум.</span><span data-lat>Izaberi uslugu i datum.</span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, marginTop: 12 }}>
        <label className="adm-form-label">
          <span data-sr>БЕЛЕШКЕ (ОПЦИОНО)</span>
          <span data-lat>BELEŠKE (OPCIONO)</span>
        </label>
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
