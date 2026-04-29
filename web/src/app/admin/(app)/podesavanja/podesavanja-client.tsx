"use client";

import { useState, useTransition } from "react";
import { changePin, upsertAnnouncement, deleteAnnouncement } from "./actions";

type Ann = {
  id: string;
  title_sr: string | null;
  title_lat: string | null;
  body_sr: string;
  body_lat: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function PodesavanjaClient({ announcements, email, icalUrl }: { announcements: Ann[]; email: string; icalUrl: string }) {
  const [tab, setTab] = useState<"pin" | "banner" | "info">("pin");
  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>ПОДЕШАВАЊА</span><span data-lat>PODEŠAVANJA</span>
          </div>
          <div className="adm-page-subtitle">{email}</div>
        </div>
      </div>

      <div className="adm-toggle" style={{ marginBottom: 16 }}>
        <button className={`adm-toggle-opt ${tab === "pin" ? "active" : ""}`} onClick={() => setTab("pin")} type="button">PIN</button>
        <button className={`adm-toggle-opt ${tab === "banner" ? "active" : ""}`} onClick={() => setTab("banner")} type="button">BANNER</button>
        <button className={`adm-toggle-opt ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")} type="button">INFO</button>
      </div>

      {tab === "pin" && <PinChange />}
      {tab === "banner" && <Announcements list={announcements} />}
      {tab === "info" && (
        <>
          <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>SISTEM</div>
            <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Email</span><span style={{ color: "var(--cream)" }}>{email}</span></div>
            <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Auto-lock</span><span style={{ color: "var(--cream)" }}>24h</span></div>
            <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Max PIN attempts</span><span style={{ color: "var(--cream)" }}>5 → lockout 10min</span></div>
          </div>

          {/* G6 — iCal feed */}
          <IcalCard icalUrl={icalUrl} />
        </>
      )}
    </>
  );
}

function PinChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  // M11: bilingual messages — `kind` decides which span to show.
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; sr: string; lat: string } | null>(null);

  function go() {
    if (next !== confirm) return setMsg({ kind: "err", sr: "PIN-ови се не поклапају", lat: "PIN-ovi se ne poklapaju" });
    if (!/^\d{4}$/.test(next)) return setMsg({ kind: "err", sr: "PIN мора имати 4 цифре", lat: "PIN mora imati 4 cifre" });
    start(async () => {
      const res = await changePin(current, next);
      if (res.ok) {
        setMsg({ kind: "ok", sr: "✓ PIN промењен", lat: "✓ PIN promenjen" });
        setCurrent(""); setNext(""); setConfirm("");
      } else if (res.error === "WRONG_CURRENT") {
        setMsg({ kind: "err", sr: "Погрешан тренутни PIN", lat: "Pogrešan trenutni PIN" });
      } else {
        setMsg({ kind: "err", sr: "Грешка", lat: "Greška" });
      }
    });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <label className="adm-form-label" data-sr>ТРЕНУТНИ PIN</label>
      <label className="adm-form-label" data-lat>TRENUTNI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={current} onChange={(e) => setCurrent(e.target.value)} />
      <label className="adm-form-label" data-sr>НОВИ PIN</label>
      <label className="adm-form-label" data-lat>NOVI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value)} />
      <label className="adm-form-label" data-sr>ПОНОВИ НОВИ PIN</label>
      <label className="adm-form-label" data-lat>PONOVI NOVI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {msg && (
        <div style={{ color: msg.kind === "ok" ? "var(--success)" : "var(--danger)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          <span data-sr>{msg.sr}</span>
          <span data-lat>{msg.lat}</span>
        </div>
      )}
      <button className="adm-btn" disabled={pending || !current || !next || !confirm} onClick={go}>
        <span data-sr>ПРОМЕНИ PIN</span>
        <span data-lat>PROMENI PIN</span>
      </button>
    </div>
  );
}

function Announcements({ list }: { list: Ann[] }) {
  const [editing, setEditing] = useState<Ann | "new" | null>(null);
  return (
    <>
      <button className="adm-btn adm-btn-block" onClick={() => setEditing("new")} style={{ marginBottom: 16 }}>
        <span data-sr>+ НОВИ БАНЕР</span>
        <span data-lat>+ NOVI BANNER</span>
      </button>
      {list.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема банера.</span>
          <span data-lat>Nema banner-a.</span>
        </div>
      )}
      {list.map((a) => (
        <div key={a.id} className="adm-card" style={{ opacity: a.active ? 1 : 0.5 }} onClick={() => setEditing(a)}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: "var(--cream)" }}>{a.title_lat ?? a.body_lat.slice(0, 40)}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)" }}>{a.active ? "ON" : "OFF"}</div>
          </div>
        </div>
      ))}
      {editing && <AnnouncementEditor ann={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function AnnouncementEditor({ ann, onClose }: { ann: Ann | null; onClose: () => void }) {
  const [titleSr, setTitleSr] = useState(ann?.title_sr ?? "");
  const [titleLat, setTitleLat] = useState(ann?.title_lat ?? "");
  const [bodySr, setBodySr] = useState(ann?.body_sr ?? "");
  const [bodyLat, setBodyLat] = useState(ann?.body_lat ?? "");
  const [active, setActive] = useState(ann?.active ?? true);
  // M12: time-window inputs. Schema is timestamptz; <input type="datetime-local"> emits
  // YYYY-MM-DDTHH:mm (no TZ); we normalize to ISO with Belgrade offset before save.
  const [startsAt, setStartsAt] = useState(ann?.starts_at ? toLocalInput(ann.starts_at) : "");
  const [endsAt, setEndsAt] = useState(ann?.ends_at ? toLocalInput(ann.ends_at) : "");
  const [pending, start] = useTransition();
  // L7: require BOTH SR and LAT body so banner doesn't show empty in one mode.
  const canSave = !!bodySr.trim() && !!bodyLat.trim();
  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          <span data-sr>{ann ? "ИЗМЕНИ" : "НОВИ"} БАНЕР</span>
          <span data-lat>{ann ? "IZMENI" : "NOVI"} BANNER</span>
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="adm-form-label">NASLOV (ćir.)</label>
          <input className="adm-input" value={titleSr} onChange={(e) => setTitleSr(e.target.value)} />
          <label className="adm-form-label">NASLOV (lat.)</label>
          <input className="adm-input" value={titleLat} onChange={(e) => setTitleLat(e.target.value)} />
          <label className="adm-form-label">PORUKA (ćir.)</label>
          <textarea className="adm-input" rows={2} value={bodySr} onChange={(e) => setBodySr(e.target.value)} placeholder="Затворено 5—7. маја због реновирања" />
          <label className="adm-form-label">PORUKA (lat.)</label>
          <textarea className="adm-input" rows={2} value={bodyLat} onChange={(e) => setBodyLat(e.target.value)} placeholder="Zatvoreno 5—7. maja zbog renoviranja" />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label" data-sr>ОД (опционо)</label>
              <label className="adm-form-label" data-lat>OD (opciono)</label>
              <input className="adm-input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label" data-sr>ДО (опционо)</label>
              <label className="adm-form-label" data-lat>DO (opciono)</label>
              <input className="adm-input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--cream)" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span data-sr>АКТИВАН (видљив на сајту)</span>
            <span data-lat>AKTIVAN (vidljiv na sajtu)</span>
          </label>
          {!canSave && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)" }}>
              <span data-sr>Попуни поруку у обе скрипте.</span>
              <span data-lat>Popuni poruku u obe skripte.</span>
            </div>
          )}
          <button className="adm-btn adm-btn-block" disabled={pending || !canSave} onClick={() => start(async () => {
            await upsertAnnouncement({
              id: ann?.id,
              title_sr: titleSr,
              title_lat: titleLat,
              body_sr: bodySr,
              body_lat: bodyLat,
              active,
              starts_at: startsAt ? new Date(startsAt).toISOString() : null,
              ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            });
            onClose();
          })}>
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          {ann && <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={() => { if (confirm("Obrisati?")) start(async () => { await deleteAnnouncement(ann.id); onClose(); }); }}>
            <span data-sr>ОБРИШИ</span><span data-lat>OBRIŠI</span>
          </button>}
          <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convert a UTC ISO timestamp from DB to the local YYYY-MM-DDTHH:MM form
 *  consumed by <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function IcalCard({ icalUrl }: { icalUrl: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(icalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 12 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
        📅 KALENDAR (iCal)
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,233,208,.7)", lineHeight: 1.5, marginBottom: 8 }}>
        <span data-sr>
          Залепи овај линк у Google Calendar (Add → From URL) или у iPhone Settings → Mail → Accounts → Add → Other → Subscribed Calendar.
          Телефон ће се аутоматски освежавати на сваких ~сат времена.
        </span>
        <span data-lat>
          Zalepi ovaj link u Google Calendar (Add → From URL) ili u iPhone Settings → Mail → Accounts → Add → Other → Subscribed Calendar.
          Telefon će se automatski osvežavati na svakih ~sat vremena.
        </span>
      </div>
      <input
        className="adm-input"
        readOnly
        value={icalUrl}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
      />
      <button className="adm-btn adm-btn-secondary" onClick={copy} style={{ marginTop: 8 }}>
        {copied ? "✓ KOPIRAN" : (
          <>
            <span data-sr>📋 КОПИРАЈ ЛИНК</span>
            <span data-lat>📋 KOPIRAJ LINK</span>
          </>
        )}
      </button>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)", marginTop: 6 }}>
        ⚠ <span data-sr>Свако са линком може видети термине. Не дели.</span>
        <span data-lat>Svako sa linkom može videti termine. Ne deli.</span>
      </div>
    </div>
  );
}
