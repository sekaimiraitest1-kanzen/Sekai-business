"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { submitBooking, getTakenSlots, checkCustomerFlag } from "./actions";
import { trackEvent, EVENTS } from "@/lib/plausible";

type Service = {
  id: string;
  name_sr: string;
  name_lat: string;
  price: number;
  duration_min: number;
};
type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

const DAYS_SR = ["НД", "ПН", "УТ", "СР", "ЧТ", "ПТ", "СУ"];
const DAYS_LAT = ["ND", "PN", "UT", "SR", "ČT", "PT", "SU"];
const MONTHS_SR_SHORT = ["јан", "феб", "мар", "апр", "мај", "јун", "јул", "авг", "сеп", "окт", "нов", "дец"];
const MONTHS_LAT_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
const MONTHS_SR_FULL = ["јануар", "фебруар", "март", "април", "мај", "јун", "јул", "август", "септембар", "октобар", "новембар", "децембар"];
const MONTHS_LAT_FULL = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];

function dayKey(d: Date): keyof WorkingHours {
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[d.getDay()];
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function generateSlots(open: string, close: string, durationMin: number): string[] {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const startM = oh * 60 + om;
  const endM = ch * 60 + cm - durationMin; // last bookable start
  const slots: string[] = [];
  for (let m = startM; m <= endM; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return slots;
}

export function BookingFlow({
  services,
  salonId,
  salonAddress,
  workingHours,
}: {
  services: Service[];
  salonId: string;
  salonAddress: string;
  workingHours: WorkingHours | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<boolean>(false);
  const [loyaltyReward, setLoyaltyReward] = useState<"free_cut" | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [lang, setLang] = useState<"sr" | "lat">("sr");
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

  function pickService(id: string) {
    setServiceId(id);
    // After state commits, smooth-scroll the NASTAVI button into view so the
    // user doesn't have to scroll past a long service list to find it.
    requestAnimationFrame(() => {
      continueBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // sync lang from <html data-lang>
  useEffect(() => {
    const sync = () => setLang((document.documentElement.getAttribute("data-lang") as "sr" | "lat") ?? "sr");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lang"] });
    return () => obs.disconnect();
  }, []);

  // capture utm_source on mount
  const utmSource = useMemo(() => {
    if (typeof window === "undefined") return "direct";
    return new URLSearchParams(window.location.search).get("utm_source") ?? "direct";
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);

  // load taken slots when date or service changes; service duration is part
  // of the key so switching from 30-min to 90-min re-fetches with overlap math.
  useEffect(() => {
    if (!date || !selectedService) {
      setTaken([]);
      return;
    }
    void getTakenSlots(salonId, date, selectedService.duration_min).then(setTaken);
  }, [date, salonId, selectedService]);

  // Surcharge / loyalty preview: when the customer types their phone in step 4
  // we hit a debounced server lookup. Result drives two mutually-exclusive
  // banners — free-cut redemption wins over no-show surcharge upstream.
  useEffect(() => {
    const trimmed = phone.trim();
    if (trimmed.length < 6) { setFlagged(false); setLoyaltyReward(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await checkCustomerFlag(salonId, trimmed);
      if (!cancelled) {
        setFlagged(res.flagged);
        setLoyaltyReward(res.loyaltyReward);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone, salonId]);

  // Tracks "now HH:MM" in Belgrade and reactively refreshes once a minute so
  // a tab left open across a slot boundary auto-removes the just-passed slot
  // without needing a full reload. Initialised lazily on the client.
  const [nowHHMM, setNowHHMM] = useState<string>("");
  useEffect(() => {
    const compute = () => {
      const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
      setNowHHMM(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  const todayBelgrade = useMemo(() => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const slots = useMemo(() => {
    if (!date || !selectedService || !workingHours) return [];
    const d = new Date(date + "T00:00:00");
    const wh = workingHours[dayKey(d)];
    if (!wh) return [];
    const all = generateSlots(wh.open, wh.close, selectedService.duration_min);
    // Past-slot filter: only relevant when picking today. Slots whose start
    // time has already passed (or is the current minute) are removed.
    if (date === todayBelgrade && nowHHMM) {
      return all.filter((s) => s > nowHHMM);
    }
    return all;
  }, [date, selectedService, workingHours, todayBelgrade, nowHHMM]);

  function go(n: 1 | 2 | 3 | 4 | 5) {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function reset() {
    setServiceId(null);
    setDate(null);
    setTime(null);
    setName("");
    setPhone("");
    setEmail("");
    setBookingId(null);
    setSubmitErr(null);
    go(1);
  }

  function handleSubmit() {
    if (!serviceId || !date || !time) return;
    setSubmitErr(null);
    start(async () => {
      const res = await submitBooking({
        salonId,
        serviceId,
        date,
        timeSlot: time,
        name,
        phone,
        email,
        utmSource,
      });
      if (res.ok) {
        setBookingId(res.bookingId);
        const svc = services.find((s) => s.id === serviceId);
        trackEvent(EVENTS.BOOKING_COMPLETED, {
          service: svc?.name_lat ?? "unknown",
          price: svc?.price ?? 0,
          hasEmail: !!email,
        });
        go(5);
      } else {
        setSubmitErr(res.error);
      }
    });
  }

  return (
    <>
      <h1 className="sr-only">
        <span data-sr>Заказивање термина — Берберница Триша, Батајница</span>
        <span data-lat>Zakazivanje termina — Berbernica Triša, Batajnica</span>
      </h1>
      <nav className="bk-nav">
        <Link href="/" className="bk-nav-back">
          ← <span data-sr>НАЗАД</span><span data-lat>NAZAD</span>
        </Link>
        <div className="bk-nav-title" data-sr>ЗАКАЗИВАЊЕ</div>
        <div className="bk-nav-title" data-lat>ZAKAZIVANJE</div>
        <LangToggle />
      </nav>

      <main id="main-content" className="booking-wrap">
        <ProgressBar step={step} />

        {step === 1 && (
          <div className="step-screen active">
            <div className="step-header">
              <div className="step-eyebrow" data-sr>КОРАК 1 ОД 4</div>
              <div className="step-eyebrow" data-lat>KORAK 1 OD 4</div>
              <h2 className="step-title" data-sr>Изабери услугу.</h2>
              <h2 className="step-title" data-lat>Izaberi uslugu.</h2>
            </div>

            <div className="service-cards">
              {services.map((s) => (
                <div
                  key={s.id}
                  className={`service-card ${serviceId === s.id ? "selected" : ""}`}
                  onClick={() => pickService(s.id)}
                >
                  <div>
                    <div className="service-card-name" data-sr>{s.name_sr}</div>
                    <div className="service-card-name" data-lat>{s.name_lat}</div>
                    <div className="service-card-meta" data-sr>{s.duration_min} МИН</div>
                    <div className="service-card-meta" data-lat>{s.duration_min} MIN</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="service-card-price">
                      {s.price}
                      <span data-sr>РСД</span>
                      <span data-lat>RSD</span>
                    </div>
                    <div className="service-card-check">✓</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32 }}>
              <button ref={continueBtnRef} className="bk-btn-primary" disabled={!serviceId} onClick={() => go(2)}>
                <span data-sr>НАСТАВИ →</span>
                <span data-lat>NASTAVI →</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && selectedService && (
          <div className="step-screen active">
            <div className="step-header">
              <div className="step-eyebrow" data-sr>КОРАК 2 ОД 4</div>
              <div className="step-eyebrow" data-lat>KORAK 2 OD 4</div>
              <h2 className="step-title" data-sr>Изабери датум.</h2>
              <h2 className="step-title" data-lat>Izaberi datum.</h2>
            </div>

            <SummaryBar service={selectedService} lang={lang} />

            <DateStrip
              selectedDate={date}
              workingHours={workingHours}
              onSelect={(d) => {
                setDate(d);
                setTime(null);
              }}
            />

            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <button className="bk-btn-secondary" onClick={() => setCalOpen(true)} style={{ fontSize: 12, padding: "10px 16px" }}>
                📅 <span data-sr>ПУН КАЛЕНДАР</span><span data-lat>PUN KALENDAR</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button className="bk-btn-secondary" onClick={() => go(1)} style={{ flex: 1 }}>
                <span data-sr>← НАЗАД</span><span data-lat>← NAZAD</span>
              </button>
              <button className="bk-btn-primary" disabled={!date} onClick={() => go(3)} style={{ flex: 2 }}>
                <span data-sr>НАСТАВИ →</span><span data-lat>NASTAVI →</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedService && date && (
          <div className="step-screen active">
            <div className="step-header">
              <div className="step-eyebrow" data-sr>КОРАК 3 ОД 4</div>
              <div className="step-eyebrow" data-lat>KORAK 3 OD 4</div>
              <h2 className="step-title" data-sr>Изабери термин.</h2>
              <h2 className="step-title" data-lat>Izaberi termin.</h2>
            </div>

            <SummaryBar service={selectedService} dateLabel={formatDateLabel(date, lang)} lang={lang} />

            <div className="time-grid">
              {slots.length === 0 ? (
                <div style={{ gridColumn: "span 4", textAlign: "center", padding: 32, fontFamily: "'JetBrains Mono', monospace", color: "var(--brown-700)", opacity: 0.6 }}>
                  <span data-sr>Нема доступних термина за овај дан.</span>
                  <span data-lat>Nema dostupnih termina za ovaj dan.</span>
                </div>
              ) : (
                slots.map((slot) => {
                  const isTaken = taken.includes(slot);
                  return (
                    <div
                      key={slot}
                      className={`time-slot ${isTaken ? "taken" : ""} ${time === slot ? "selected" : ""}`}
                      onClick={isTaken ? undefined : () => setTime(slot)}
                    >
                      {slot}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button className="bk-btn-secondary" onClick={() => go(2)} style={{ flex: 1 }}>
                <span data-sr>← НАЗАД</span><span data-lat>← NAZAD</span>
              </button>
              <button className="bk-btn-primary" disabled={!time} onClick={() => go(4)} style={{ flex: 2 }}>
                <span data-sr>НАСТАВИ →</span><span data-lat>NASTAVI →</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && selectedService && date && time && (
          <div className="step-screen active">
            <div className="step-header">
              <div className="step-eyebrow" data-sr>КОРАК 4 ОД 4</div>
              <div className="step-eyebrow" data-lat>KORAK 4 OD 4</div>
              <h2 className="step-title" data-sr>Твоји подаци.</h2>
              <h2 className="step-title" data-lat>Tvoji podaci.</h2>
            </div>

            <SummaryBar service={selectedService} dateLabel={`${formatDateLabel(date, lang)} · ${time}`} lang={lang} />

            {loyaltyReward === "free_cut" && (
              <div style={{ padding: 14, background: "rgba(212,165,58,.18)", borderLeft: "3px solid var(--mustard)", marginBottom: 16, fontSize: 13, lineHeight: 1.55, color: "var(--cream)" }}>
                🎁 <strong>
                  <span data-sr>Овај термин је БЕСПЛАТАН!</span>
                  <span data-lat>Ovaj termin je BESPLATAN!</span>
                </strong>
                <br />
                <span data-sr>Имаш активну loyalty награду за 6. долазак. Цена за овај термин је 0 RSD.</span>
                <span data-lat>Imaš aktivnu loyalty nagradu za 6. dolazak. Cena za ovaj termin je 0 RSD.</span>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 8, color: "var(--mustard)" }}>
                  {selectedService.price} RSD → <strong>0 RSD</strong>
                </div>
              </div>
            )}
            {flagged && !loyaltyReward && (
              <div style={{ padding: 14, background: "rgba(204,34,34,.1)", borderLeft: "3px solid #cc2222", marginBottom: 16, fontSize: 13, lineHeight: 1.55, color: "var(--cream)" }}>
                ⚠ <strong>
                  <span data-sr>Овај термин има +30% доплате</span>
                  <span data-lat>Ovaj termin ima +30% doplate</span>
                </strong>
                <br />
                <span data-sr>Зато што је твој претходни термин отказан мање од 2 сата пре, или ниси дошао. Доплата се наплаћује у салону. Следећи термин се враћа на редовну цену.</span>
                <span data-lat>Zato što je tvoj prethodni termin otkazan manje od 2 sata pre, ili nisi došao. Doplata se naplaćuje u salonu. Sledeći termin se vraća na redovnu cenu.</span>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 8, color: "#ffb0b0" }}>
                  {selectedService.price} RSD → <strong>{Math.round(selectedService.price * 1.3)} RSD</strong>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" data-sr>ИМЕ И ПРЕЗИМЕ</label>
              <label className="form-label" data-lat>IME I PREZIME</label>
              <input className="form-input" type="text" placeholder={lang === "lat" ? "Marko Jovanović" : "Марко Јовановић"} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span data-sr>БРОЈ ТЕЛЕФОНА</span>
                <span data-lat>BROJ TELEFONA</span>
              </label>
              <input className="form-input" type="tel" placeholder="+381 6X XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <p className="form-hint" data-sr>Телефон је твој идентитет у систему. Никоме га не делимо.</p>
              <p className="form-hint" data-lat>Telefon je tvoj identitet u sistemu. Nikome ga ne delimo.</p>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span data-sr>ИМEJЛ</span>
                <span data-lat>IMEJL</span>
                <span className="form-optional" data-sr>ОПЦИОНО</span>
                <span className="form-optional" data-lat>OPCIONO</span>
              </label>
              <input className="form-input" type="email" placeholder="marko@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="form-hint" data-sr>За потврду резервације и историју посета.</p>
              <p className="form-hint" data-lat>Za potvrdu rezervacije i istoriju poseta.</p>
            </div>

            {submitErr && (
              <div style={{ padding: 12, background: "rgba(166,61,42,.1)", border: "1px solid var(--danger)", color: "var(--danger)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 12 }}>
                {submitErr === "SLOT_TAKEN"
                  ? lang === "lat" ? "Termin je upravo zauzet — izaberi drugi." : "Термин је управо заузет — изабери други."
                  : lang === "lat" ? "Greška pri slanju. Pokušaj ponovo." : "Грешка при слању. Покушај поново."}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="bk-btn-secondary" onClick={() => go(3)} style={{ flex: 1 }}>
                <span data-sr>← НАЗАД</span><span data-lat>← NAZAD</span>
              </button>
              <button
                className="bk-btn-primary"
                disabled={pending || name.trim().length < 2 || phone.trim().length < 7}
                onClick={handleSubmit}
                style={{ flex: 2 }}
              >
                {pending ? (
                  <span>...</span>
                ) : (
                  <>
                    <span data-sr>ПОТВРДИ РЕЗЕРВАЦИЈУ →</span>
                    <span data-lat>POTVRDI REZERVACIJU →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 5 && selectedService && date && time && (
          <div className="step-screen active">
            <div className="confirm-card">
              <div className="confirm-icon">✓</div>
              <h2 className="confirm-title" data-sr>Видимо се.</h2>
              <h2 className="confirm-title" data-lat>Vidimo se.</h2>
              <p className="confirm-sub" data-sr>Резервација је потврђена. Отказивање је слободно до 2 сата пре термина — после тога наплаћујемо 30% пенал.</p>
              <p className="confirm-sub" data-lat>Rezervacija je potvrđena. Otkazivanje je slobodno do 2 sata pre termina — posle toga naplaćujemo 30% penal.</p>
            </div>

            <div className="confirm-details">
              <ConfirmRow labelSr="ДАТУМ" labelLat="DATUM" value={formatDateLabel(date, lang)} />
              <ConfirmRow labelSr="ТЕРМИН" labelLat="TERMIN" value={time} />
              <ConfirmRow labelSr="УСЛУГА" labelLat="USLUGA" value={lang === "lat" ? selectedService.name_lat : selectedService.name_sr} />
              <ConfirmRow labelSr="ЦЕНА" labelLat="CENA" value={`${selectedService.price} ${lang === "lat" ? "RSD" : "РСД"}`} />
              <ConfirmRow labelSr="ИМЕ" labelLat="IME" value={name} />
              <ConfirmRow labelSr="ТЕЛЕФОН" labelLat="TELEFON" value={phone} />
              <ConfirmRow labelSr="ЛОКАЦИЈА" labelLat="LOKACIJA" value={salonAddress} />
              {bookingId && <ConfirmRow labelSr="БРОЈ" labelLat="ID" value={bookingId.slice(0, 8).toUpperCase()} />}
            </div>

            <div className="confirm-policy">
              <p data-sr>⚠ Отказивање је слободно до 2 сата пре термина. Касније отказивање носи пенал од 30% цене услуге.</p>
              <p data-lat>⚠ Otkazivanje je slobodno do 2 sata pre termina. Kasnije otkazivanje nosi penal od 30% cene usluge.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/" className="bk-btn-primary" style={{ textDecoration: "none", textAlign: "center", justifyContent: "center" }}>
                <span data-sr>НАЗАД НА ПОЧЕТНУ</span>
                <span data-lat>NAZAD NA POČETNU</span>
              </Link>
              <button className="bk-btn-secondary" style={{ justifyContent: "center" }} onClick={reset}>
                <span data-sr>ЗАКАЗУЈ НОВИ ТЕРМИН</span>
                <span data-lat>ZAKAZUJ NOVI TERMIN</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {calOpen && (
        <CalendarSheet
          workingHours={workingHours}
          onClose={() => setCalOpen(false)}
          onPick={(d) => {
            setDate(d);
            setTime(null);
            setCalOpen(false);
          }}
          lang={lang}
        />
      )}
    </>
  );
}

// ─── progress bar ───────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const steps: { sr: string; lat: string; idx: 1 | 2 | 3 | 4 | 5 }[] = [
    { idx: 1, sr: "УСЛУГА", lat: "USLUGA" },
    { idx: 2, sr: "ДАТУМ", lat: "DATUM" },
    { idx: 3, sr: "ТЕРМИН", lat: "TERMIN" },
    { idx: 4, sr: "ПОДАЦИ", lat: "PODACI" },
    { idx: 5, sr: "ПОТВРДА", lat: "POTVRDA" },
  ];
  return (
    <div className="progress-bar">
      {steps.map((s) => {
        const cls = s.idx < step ? "done" : s.idx === step ? "active" : "pending";
        return (
          <div key={s.idx} className="progress-step">
            <div className={`step-dot ${cls}`}>{s.idx < step ? "✓" : s.idx === 5 ? "✓" : s.idx}</div>
            <div className={`step-label ${cls === "active" ? "active" : ""}`} data-sr>{s.sr}</div>
            <div className={`step-label ${cls === "active" ? "active" : ""}`} data-lat>{s.lat}</div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryBar({ service, dateLabel, lang }: { service: Service; dateLabel?: string; lang: "sr" | "lat" }) {
  return (
    <div className="summary-bar">
      <div>
        <div className="summary-bar-service">{lang === "lat" ? service.name_lat : service.name_sr}</div>
        <div className="summary-bar-meta">{dateLabel ?? `${service.duration_min} ${lang === "lat" ? "MIN" : "МИН"}`}</div>
      </div>
      <div className="summary-bar-price">{service.price} {lang === "lat" ? "RSD" : "РСД"}</div>
    </div>
  );
}

function ConfirmRow({ labelSr, labelLat, value }: { labelSr: string; labelLat: string; value: string }) {
  return (
    <div className="confirm-row">
      <span className="confirm-row-label" data-sr>{labelSr}</span>
      <span className="confirm-row-label" data-lat>{labelLat}</span>
      <span className="confirm-row-value">{value}</span>
    </div>
  );
}

// ─── date strip (next 7 days) ──────────────────────
function DateStrip({ selectedDate, workingHours, onSelect }: { selectedDate: string | null; workingHours: WorkingHours | null; onSelect: (d: string) => void }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  return (
    <div className="date-strip">
      {days.map((d, i) => {
        const dateStr = fmtDate(d);
        const dow = d.getDay();
        const isClosed = workingHours ? workingHours[dayKey(d)] === null : false;
        const isToday = i === 0;
        const isSelected = selectedDate === dateStr;
        const cls = `date-pill ${isToday ? "today" : ""} ${isClosed ? "disabled" : ""} ${isSelected ? "selected" : ""}`;
        return (
          <div key={dateStr} className={cls} onClick={isClosed ? undefined : () => onSelect(dateStr)}>
            <div className="date-day" data-sr>{DAYS_SR[dow]}</div>
            <div className="date-day" data-lat>{DAYS_LAT[dow]}</div>
            <div className="date-num">{d.getDate()}</div>
            <div className="date-month" data-sr>{MONTHS_SR_SHORT[d.getMonth()]}</div>
            <div className="date-month" data-lat>{MONTHS_LAT_SHORT[d.getMonth()]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── full-month calendar sheet ─────────────────────
function CalendarSheet({ onClose, onPick, workingHours, lang }: { onClose: () => void; onPick: (d: string) => void; workingHours: WorkingHours | null; lang: "sr" | "lat" }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [picked, setPicked] = useState<string | null>(null);

  const months = lang === "lat" ? MONTHS_LAT_FULL : MONTHS_SR_FULL;
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  function prev() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  }
  function next() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  }

  return (
    <div className="sheet-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-header">
          <div className="sheet-title" data-sr>ИЗАБЕРИ ДАТУМ</div>
          <div className="sheet-title" data-lat>IZABERI DATUM</div>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={prev}>‹</button>
          <div className="cal-month">{months[month]} {year}</div>
          <button className="cal-nav-btn" onClick={next}>›</button>
        </div>
        <div className="cal-weekdays">
          {(lang === "lat" ? ["PN", "UT", "SR", "ČT", "PT", "SU", "ND"] : ["ПН", "УТ", "СР", "ЧТ", "ПТ", "СУ", "НД"]).map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: startDow }, (_, i) => <div key={`e${i}`} className="cal-day empty" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const date = new Date(year, month, d);
            const dateStr = fmtDate(date);
            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isClosed = workingHours ? workingHours[dayKey(date)] === null : false;
            const isToday = date.toDateString() === today.toDateString();
            const isTooFar = date > maxDate;
            const isSelected = picked === dateStr;
            const cls = ["cal-day", isPast || isTooFar ? "disabled" : "", isClosed ? "closed" : "", isToday ? "today" : "", isSelected ? "selected" : ""].filter(Boolean).join(" ");
            return (
              <div
                key={d}
                className={cls}
                onClick={isPast || isClosed || isTooFar ? undefined : () => setPicked(dateStr)}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div className="sheet-confirm-btn">
          <button className="bk-btn-primary" disabled={!picked} onClick={() => picked && onPick(picked)}>
            {picked ? (
              <>
                <span data-sr>ИЗАБЕРИ {picked.split("-")[2]}. {MONTHS_SR_FULL[month].toUpperCase()}</span>
                <span data-lat>IZABERI {picked.split("-")[2]}. {MONTHS_LAT_FULL[month].toUpperCase()}</span>
              </>
            ) : (
              <>
                <span data-sr>ИЗАБЕРИ ДАТУМ</span>
                <span data-lat>IZABERI DATUM</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string, lang: "sr" | "lat"): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  const months = lang === "lat" ? MONTHS_LAT_SHORT : MONTHS_SR_SHORT;
  const days = lang === "lat" ? DAYS_LAT : DAYS_SR;
  return `${d.getDate()}. ${months[d.getMonth()]} — ${days[dow]}`;
}
